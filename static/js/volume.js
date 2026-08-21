const $ = selector => document.querySelector(selector);

const REGIONS = [
  ["서울 종로구", "11110"], ["서울 중구", "11140"], ["서울 용산구", "11170"],
  ["서울 성동구", "11200"], ["서울 광진구", "11215"], ["서울 동대문구", "11230"],
  ["서울 중랑구", "11260"], ["서울 성북구", "11290"], ["서울 강북구", "11305"],
  ["서울 도봉구", "11320"], ["서울 노원구", "11350"], ["서울 은평구", "11380"],
  ["서울 서대문구", "11410"], ["서울 마포구", "11440"], ["서울 양천구", "11470"],
  ["서울 강서구", "11500"], ["서울 구로구", "11530"], ["서울 금천구", "11545"],
  ["서울 영등포구", "11560"], ["서울 동작구", "11590"], ["서울 관악구", "11620"],
  ["서울 서초구", "11650"], ["서울 강남구", "11680"], ["서울 송파구", "11710"],
  ["서울 강동구", "11740"],
  ["경기 수원 장안구", "41111"], ["경기 수원 권선구", "41113"], ["경기 수원 팔달구", "41115"],
  ["경기 수원 영통구", "41117"], ["경기 성남 수정구", "41131"], ["경기 성남 중원구", "41133"],
  ["경기 성남 분당구", "41135"], ["경기 의정부시", "41150"], ["경기 안양 만안구", "41171"],
  ["경기 안양 동안구", "41173"], ["경기 부천시", "41190"], ["경기 광명시", "41210"],
  ["경기 평택시", "41220"], ["경기 동두천시", "41250"], ["경기 안산 상록구", "41271"],
  ["경기 안산 단원구", "41273"], ["경기 고양 덕양구", "41281"], ["경기 고양 일산동구", "41285"],
  ["경기 고양 일산서구", "41287"], ["경기 과천시", "41290"], ["경기 구리시", "41310"],
  ["경기 남양주시", "41360"], ["경기 오산시", "41370"], ["경기 시흥시", "41390"],
  ["경기 군포시", "41410"], ["경기 의왕시", "41430"], ["경기 하남시", "41450"],
  ["경기 용인 처인구", "41461"], ["경기 용인 기흥구", "41463"], ["경기 용인 수지구", "41465"],
  ["경기 파주시", "41480"], ["경기 이천시", "41500"], ["경기 안성시", "41550"],
  ["경기 김포시", "41570"], ["경기 화성시", "41590"], ["경기 광주시", "41610"],
  ["경기 양주시", "41630"], ["경기 포천시", "41650"], ["경기 여주시", "41670"],
  ["경기 연천군", "41800"], ["경기 가평군", "41820"], ["경기 양평군", "41830"]
].map(([name, code]) => ({ name, code }));

const state = {
  summaries: new Map(),
  current: null
};

init();

async function init() {
  populateRegions();
  bindEvents();
  await update();
  setInterval(tick, 1000);
}

function populateRegions() {
  const regionEl = $("#baseRegion");
  REGIONS.forEach(region => regionEl.add(new Option(region.name, region.code)));
  regionEl.value = "41117";
}

function bindEvents() {
  $("#compareBtn").addEventListener("click", update);
  $("#dealSearch").addEventListener("change", renderDeals);
}

async function update() {
  try {
    setNotice("선택한 지역의 국토교통부 실거래가 API 데이터를 불러오는 중입니다.");
    const summary = await getSummary($("#baseRegion").value);
    state.current = summary;
    renderSummary(summary);
    renderChart(makeSeries(getCurrentCount(summary), getCurrentRate(summary), Number($("#periodFilter").value)));
    renderRanking();
    renderDeals();
    setNotice("국토교통부 실거래가 API와 연결된 거래량 데이터입니다.");
  } catch (error) {
    console.error(error);
    setNotice("API 데이터를 불러오지 못했습니다. 서버 또는 인증키 상태를 확인해 주세요.");
  } finally {
    tick();
  }
}

async function getSummary(regionCode) {
  if (state.summaries.has(regionCode)) return state.summaries.get(regionCode);

  const month = getTargetMonth();
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/api/market/summary?region=${regionCode}&month=${month}`);
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "거래량 데이터를 불러오지 못했습니다.");
  }

  data.regionCode = regionCode;
  data.regionName = getRegionName(regionCode);
  state.summaries.set(regionCode, data);
  return data;
}

function renderSummary(summary) {
  const value = getCurrentCount(summary);
  const rate = getCurrentRate(summary);
  const score = getActivityScore(value, rate);
  const rank = getLoadedRank(summary);
  const typeName = getTradeTypeName();

  $("#totalVolume").textContent = `${value.toLocaleString()}건`;
  $("#volumeRate").innerHTML = rateHtml(rate, "전월 대비");
  $("#dailyAverage").textContent = `${(value / 30).toFixed(1)}건`;
  $("#activityIndex").textContent = `${score}점`;
  $("#activityText").textContent = score >= 80 ? "거래 매우 활발" : score >= 60 ? "거래 회복 구간" : "거래 관망 구간";
  $("#regionRank").textContent = rank ? `${rank}위` : "-";
  $("#signalScore").textContent = score;
  $("#signalLabel").textContent = score >= 80 ? "활발" : score >= 60 ? "보통 이상" : "관망";
  $("#chartLegend").textContent = `${summary.regionName} ${typeName}`;
  $("#rankingCaption").textContent = `${typeName} · 이번 달 · 조회한 지역 기준`;
  $("#volumeInsight").textContent = `${summary.regionName}의 이번 달 ${typeName} 거래량은 ${value.toLocaleString()}건이며, 전월 대비 ${formatRate(rate)} 흐름입니다.`;
}

function renderChart(arr) {
  const svg = $("#volumeChart");
  const w = 760;
  const h = 300;
  const p = 42;
  const max = Math.max(...arr, 1) * 1.15;
  const bar = (w - p * 2) / arr.length;

  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `<g class="grid">${[0, 1, 2, 3, 4].map(i => {
    const y = p + i * (h - p * 2) / 4;
    return `<line x1="${p}" y1="${y}" x2="${w - p}" y2="${y}"/><text x="5" y="${y + 4}">${Math.round(max - i * max / 4)}건</text>`;
  }).join("")}</g><g class="volume-bars">${arr.map((v, i) => {
    const bh = v / max * (h - p * 2);
    return `<rect x="${p + i * bar + 3}" y="${h - p - bh}" width="${Math.max(5, bar - 6)}" height="${bh}" rx="5"/>`;
  }).join("")}</g>`;
}

function makeSeries(current, rate, period) {
  const now = Number(current || 0);
  const prev = rate ? Math.max(0, Math.round(now / (1 + Number(rate) / 100))) : now;
  return Array.from({ length: period }, (_, i) => {
    const t = period === 1 ? 1 : i / (period - 1);
    const wave = Math.sin(i * 1.4) * Math.max(2, now * 0.03);
    return Math.max(0, Math.round(prev + (now - prev) * t + wave));
  });
}

function renderRanking() {
  const rows = [...state.summaries.values()]
    .sort((a, b) => getCurrentCount(b) - getCurrentCount(a));
  const max = Math.max(...rows.map(getCurrentCount), 1);

  $("#rankingList").innerHTML = rows.map((row, index) => `
    <div class="ranking-row">
      <b>${index + 1}</b>
      <span>${escapeHtml(row.regionName)}</span>
      <div><i style="width:${getCurrentCount(row) / max * 100}%"></i></div>
      <strong>${getCurrentCount(row).toLocaleString()}건</strong>
      <em>${formatRate(getCurrentRate(row))}</em>
    </div>
  `).join("");
}

function renderDeals() {
  const summary = state.current;
  if (!summary) return;

  const selectedDealArea = $("#dealSearch").value;
  const list = getCurrentDeals(summary)
    .filter(item => areaMatches(item.area))
    .filter(item => areaValueMatches(item.area, selectedDealArea));
  const typeName = getTradeTypeName();

  $("#dealTableBody").innerHTML = list.map(item => `
    <tr>
      <td>${escapeHtml(formatDealDay(item.day))}</td>
      <td><b>${escapeHtml(item.dong || summary.regionName || "-")}</b></td>
      <td>${escapeHtml(item.aptName || "-")}</td>
      <td>${typeName}</td>
      <td>${escapeHtml(item.area || "-")}㎡</td>
      <td><strong>${formatDealAmount(item)}</strong></td>
      <td><span class="contract-tag">신고 완료</span></td>
    </tr>
  `).join("");
  $("#emptyDeals").hidden = list.length > 0;
}

function getCurrentCount(summary) {
  return $("#tradeType").value === "jeonse"
    ? Number(summary.rentCount || 0)
    : Number(summary.tradeCount || 0);
}

function getCurrentRate(summary) {
  return $("#tradeType").value === "jeonse"
    ? Number(summary.rentVolumeChangeRate || 0)
    : Number(summary.volumeChangeRate || 0);
}

function getCurrentDeals(summary) {
  return $("#tradeType").value === "jeonse"
    ? summary.sampleRentList || []
    : summary.sampleTradeList || [];
}

function getTradeTypeName() {
  return $("#tradeType").value === "jeonse" ? "전세" : "매매";
}

function getLoadedRank(summary) {
  const rows = [...state.summaries.values()].sort((a, b) => getCurrentCount(b) - getCurrentCount(a));
  const index = rows.findIndex(row => row.regionCode === summary.regionCode);
  return index >= 0 ? index + 1 : 0;
}

function getActivityScore(value, rate) {
  return Math.min(99, Math.max(20, Math.round(45 + Math.log10(value + 1) * 14 + Number(rate || 0) * 0.8)));
}

function getApiBase() {
  if (window.location.protocol === "file:" || window.location.port !== "3000") {
    return "http://localhost:3000";
  }
  return "";
}

function getTargetMonth() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("month")) return params.get("month");
  const today = new Date();
  today.setMonth(today.getMonth() - 1);
  return `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function areaMatches(area) {
  const selected = $("#areaFilter").value;
  if (selected === "all") return true;
  return areaValueMatches(area, selected);
}

function areaValueMatches(area, selected) {
  if (!selected) return true;
  const target = Number(selected);
  const actual = Number(area);
  if (!Number.isFinite(target) || !Number.isFinite(actual)) return true;
  if (target >= 160) return actual >= 147.5;
  const sizes = [39, 49, 59, 74, 84, 99, 114, 135, 160];
  const index = sizes.indexOf(target);
  const min = index > 0 ? (sizes[index - 1] + target) / 2 : 0;
  const max = index < sizes.length - 1 ? (target + sizes[index + 1]) / 2 : Infinity;
  return actual >= min && actual < max;
}

function getRegionName(code) {
  return REGIONS.find(region => region.code === code)?.name || code;
}

function setNotice(text) {
  const notice = document.querySelector(".data-notice span");
  if (notice) notice.textContent = text;
}

function rateHtml(rate, suffix) {
  const num = Number(rate || 0);
  const cls = num < 0 ? "down" : "up";
  return `<span class="${cls}">${formatRate(num)}</span> ${suffix}`;
}

function formatRate(rate) {
  const num = Number(rate || 0);
  return `${num > 0 ? "+" : ""}${num}%`;
}

function formatDealAmount(item) {
  if ($("#tradeType").value === "jeonse") {
    const deposit = money(item.deposit);
    const rent = Number(item.monthlyRent || 0);
    return rent ? `${deposit} / 월 ${rent.toLocaleString()}만원` : deposit;
  }
  return money(item.amount);
}

function money(value) {
  const num = Number(value || 0);
  if (!num) return "-";
  if (num >= 10000) {
    const eok = Math.floor(num / 10000);
    const man = num % 10000;
    return man ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${num.toLocaleString()}만원`;
}

function formatDealDay(day) {
  if (!day) return "-";
  return `${getTargetMonth().slice(4, 6)}.${String(day).padStart(2, "0")}`;
}

function tick() {
  $("#updatedAt").textContent = new Date().toLocaleTimeString("ko-KR", { hour12: false });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
