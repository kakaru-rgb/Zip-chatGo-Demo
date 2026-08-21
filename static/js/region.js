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
  summaries: new Map()
};

init();

async function init() {
  populateRegionSelects();
  bindEvents();
  await update();
  setInterval(tick, 1000);
}

function populateRegionSelects() {
  const baseEl = $("#baseRegion");
  const compareEl = $("#compareRegion");
  REGIONS.forEach(region => {
    baseEl.add(new Option(region.name, region.code));
    compareEl.add(new Option(region.name, region.code));
  });
  baseEl.value = "41117";
  compareEl.value = "41465";
}

function bindEvents() {
  $("#compareBtn").addEventListener("click", update);
}

async function update() {
  try {
    setNotice("선택한 지역의 국토교통부 실거래가 API 데이터를 불러오는 중입니다.");
    const [base, compare] = await Promise.all([
      getSummary($("#baseRegion").value),
      getSummary($("#compareRegion").value)
    ]);
    renderDashboard(base, compare);
    renderChart(makeIndexSeries(base), makeIndexSeries(compare));
    renderIndicators(base, compare);
    renderTable();
    setNotice("국토교통부 실거래가 API 기반 지역 비교 데이터입니다. 보조 점수는 거래량, 가격 변동률, 전세가율을 기준으로 계산합니다.");
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
    throw new Error(data.message || "지역 데이터를 불러오지 못했습니다.");
  }
  const metrics = buildMetrics({ ...data, regionCode, regionName: getRegionName(regionCode) });
  state.summaries.set(regionCode, metrics);
  return metrics;
}

function buildMetrics(summary) {
  const saleAvg = Number(summary.saleAvg || 0);
  const jeonseAvg = Number(summary.jeonseAvgDeposit || 0);
  const tradeCount = Number(summary.tradeCount || 0);
  const rentCount = Number(summary.rentCount || 0);
  const ratio = saleAvg && jeonseAvg ? Math.round(jeonseAvg / saleAvg * 1000) / 10 : 0;
  const liquidity = Math.min(100, Math.round(Math.log10(tradeCount + rentCount + 1) * 34));
  const stability = Math.max(20, 100 - Math.round(Math.abs(Number(summary.saleChangeRate || 0)) * 9));
  const value = Math.max(20, Math.min(100, Math.round(100 - saleAvg / 2500 + ratio / 2)));

  return {
    ...summary,
    ratio,
    liquidity,
    stability,
    balance: Math.round((liquidity + stability) / 2),
    value
  };
}

function renderDashboard(base, compare) {
  const priority = $("#priorityFilter").value;
  const areaRatio = getAreaRatio();
  const basePrice = Math.round(Number(base.saleAvg || 0) * areaRatio);
  const comparePrice = Math.round(Number(compare.saleAvg || 0) * areaRatio);
  const gap = basePrice - comparePrice;
  const baseScore = score(base, priority);
  const compareScore = score(compare, priority);
  const baseVolume = Number(base.tradeCount || 0) + Number(base.rentCount || 0);
  const compareVolume = Number(compare.tradeCount || 0) + Number(compare.rentCount || 0);

  $("#averagePrice").textContent = money(basePrice);
  $("#priceCompare").textContent = `${compare.regionName}보다 ${Math.abs(gap / 10000).toFixed(1)}억원 ${gap >= 0 ? "높음" : "낮음"}`;
  $("#jeonseRatio").textContent = base.ratio ? `${base.ratio}%` : "-";
  $("#ratioCompare").textContent = `${compare.regionName} 대비 ${base.ratio >= compare.ratio ? "+" : ""}${(base.ratio - compare.ratio).toFixed(1)}%p`;
  $("#tradeVolume").textContent = `${baseVolume.toLocaleString()}건`;
  $("#volumeCompare").textContent = `${compare.regionName}보다 ${Math.abs(baseVolume - compareVolume).toLocaleString()}건 ${baseVolume >= compareVolume ? "많음" : "적음"}`;
  $("#totalScore").textContent = `${baseScore}점`;
  $("#scoreLabel").textContent = baseScore >= 88 ? "매우 추천" : baseScore >= 72 ? "추천 지역" : "검토 지역";

  ["baseLegend", "baseShort"].forEach(id => $("#" + id).textContent = base.regionName);
  ["compareLegend", "compareShort"].forEach(id => $("#" + id).textContent = compare.regionName);
  $("#baseScore").textContent = `${baseScore}점`;
  $("#compareScore").textContent = `${compareScore}점`;

  const strengths = [
    ["거래 활성도", base.liquidity, compare.liquidity],
    ["가격 안정성", base.stability, compare.stability],
    ["시장 균형", base.balance, compare.balance],
    ["가격 경쟁력", base.value, compare.value]
  ].sort((a, b) => (b[1] - b[2]) - (a[1] - a[2]));
  $("#regionInsight").textContent = `${base.regionName}은 ${strengths[0][0]} 지표에서 ${compare.regionName}보다 강점이 있습니다. ${compare.regionName}은 ${strengths[3][0]}을 함께 비교해 보는 것이 좋습니다.`;
}

function score(data, priority) {
  const weights = {
    balanced: [0.25, 0.25, 0.25, 0.25],
    liquidity: [0.5, 0.18, 0.17, 0.15],
    stability: [0.18, 0.52, 0.15, 0.15],
    value: [0.15, 0.15, 0.15, 0.55]
  }[priority] || [0.25, 0.25, 0.25, 0.25];
  return Math.round(data.liquidity * weights[0] + data.stability * weights[1] + data.balance * weights[2] + data.value * weights[3]);
}

function renderChart(baseSeries, compareSeries) {
  const svg = $("#regionChart");
  const w = 760;
  const h = 300;
  const p = 42;
  const all = [...baseSeries, ...compareSeries];
  const min = Math.min(...all) - 5;
  const max = Math.max(...all) + 5;
  const pts = arr => arr.map((v, i) => `${p + i * (w - p * 2) / (arr.length - 1)},${h - p - (v - min) / (max - min || 1) * (h - p * 2)}`).join(" ");
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = `<g class="grid">${[0, 1, 2, 3, 4].map(i => {
    const y = p + i * (h - p * 2) / 4;
    return `<line x1="${p}" y1="${y}" x2="${w - p}" y2="${y}"/><text x="8" y="${y + 4}">${Math.round(max - i * (max - min) / 4)}</text>`;
  }).join("")}</g><polyline class="line base" points="${pts(baseSeries)}"/><polyline class="line compare" points="${pts(compareSeries)}"/>`;
}

function makeIndexSeries(summary) {
  const current = score(summary, $("#priorityFilter").value);
  const drift = Number(summary.saleChangeRate || 0) * 0.7 + Number(summary.volumeChangeRate || 0) * 0.08;
  return Array.from({ length: 12 }, (_, i) => Math.max(0, Math.min(100, Math.round(current - (11 - i) * drift / 3 + Math.sin(i * 1.3) * 1.5))));
}

function renderIndicators(base, compare) {
  const priorityKey = $("#priorityFilter").value === "balanced" ? "balance" : $("#priorityFilter").value;
  const labels = [
    ["시장 균형", "balance", "ti-scale"],
    ["거래 활성도", "liquidity", "ti-chart-bar"],
    ["가격 안정성", "stability", "ti-shield-check"],
    ["가격 경쟁력", "value", "ti-coin"]
  ];
  $("#indicatorGrid").innerHTML = labels.map(([label, key, icon]) => `
    <article class="${key === priorityKey ? "is-priority" : ""}">
      <div><i class="ti ${icon}"></i><strong>${label}</strong></div>
      <p><span>${escapeHtml(base.regionName)}</span><b>${base[key]}점</b></p>
      <div class="dual-bar"><i style="width:${base[key]}%"></i></div>
      <p><span>${escapeHtml(compare.regionName)}</span><b>${compare[key]}점</b></p>
      <div class="dual-bar compare"><i style="width:${compare[key]}%"></i></div>
    </article>
  `).join("");
}

function renderTable() {
  const priority = $("#priorityFilter").value;
  const list = [...state.summaries.values()];
  $("#regionTableBody").innerHTML = list
    .sort((a, b) => score(b, priority) - score(a, priority))
    .map(row => {
      const totalVolume = Number(row.tradeCount || 0) + Number(row.rentCount || 0);
      return `<tr><td><b>${escapeHtml(row.regionName)}</b></td><td><strong>${money(row.saleAvg)}</strong></td><td>${row.ratio ? `${row.ratio}%` : "-"}</td><td>${totalVolume.toLocaleString()}건</td><td>${row.liquidity}점</td><td>${row.stability}점</td><td><span class="score-chip">${score(row, priority)}점</span></td></tr>`;
    }).join("");
  $("#emptyRegions").hidden = list.length > 0;
}

function getApiBase() {
  if (window.location.protocol === "file:" || window.location.port !== "3000") {
    return "http://localhost:3000";
  }
  return "";
}

function getAreaRatio() {
  const area = $("#areaFilter").value;
  const numericArea = Number(area);
  return Number.isFinite(numericArea) && numericArea > 0 ? numericArea / 84 : 1;
}

function getTargetMonth() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("month")) return params.get("month");
  const today = new Date();
  today.setMonth(today.getMonth() - 1);
  return `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}`;
}

function getRegionName(code) {
  return REGIONS.find(region => region.code === code)?.name || code;
}

function setNotice(text) {
  const notice = document.querySelector(".data-notice span");
  if (notice) notice.textContent = text;
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
