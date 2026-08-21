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
  loading: false
};

init();

async function init() {
  populateRegionSelects();
  bindEvents();
  await updateDashboard();
  setInterval(updateTime, 1000);
}

function populateRegionSelects() {
  const baseSelect = $("#baseRegion");
  const compareSelect = $("#compareRegion");

  REGIONS.forEach(region => {
    baseSelect.add(new Option(region.name, region.code));
    compareSelect.add(new Option(region.name, region.code));
  });

  baseSelect.value = "41117";
  compareSelect.value = "41465";
}

function bindEvents() {
  $("#compareBtn").addEventListener("click", updateDashboard);
  $("#dealSearch").addEventListener("change", renderDeals);
}

async function updateDashboard() {
  const baseCode = $("#baseRegion").value;
  const compareCode = $("#compareRegion").value;

  try {
    state.loading = true;
    setNotice("선택한 지역의 국토교통부 전월세 실거래가 API 데이터를 불러오는 중입니다.");

    const [base, compare] = await Promise.all([
      getSummary(baseCode),
      getSummary(compareCode)
    ]);

    renderDashboard(base, compare);
    renderRanking();
    renderDeals();
    setNotice("국토교통부 전월세 실거래가 API와 연결된 데이터입니다.");
  } catch (error) {
    console.error(error);
    setNotice("API 데이터를 불러오지 못했습니다. 서버 또는 인증키 상태를 확인해 주세요.");
  } finally {
    state.loading = false;
    updateTime();
  }
}

async function getSummary(regionCode) {
  if (state.summaries.has(regionCode)) return state.summaries.get(regionCode);

  const month = getTargetMonth();
  const apiBase = getApiBase();
  const res = await fetch(`${apiBase}/api/market/summary?region=${regionCode}&month=${month}`);
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || "전세 데이터를 불러오지 못했습니다.");
  }

  data.regionCode = regionCode;
  data.regionName = getRegionName(regionCode);
  state.summaries.set(regionCode, data);
  return data;
}

function renderDashboard(base, compare) {
  const baseName = base.regionName;
  const compareName = compare.regionName;
  const areaRatio = getAreaRatio();
  const basePrice = Math.round(Number(base.jeonseAvgDeposit || 0) * areaRatio);
  const comparePrice = Math.round(Number(compare.jeonseAvgDeposit || 0) * areaRatio);
  const gap = basePrice - comparePrice;
  const baseRate = Number(base.jeonseChangeRate || 0);
  const compareRate = Number(compare.jeonseChangeRate || 0);
  const baseRentCount = Number(base.rentCount ?? base.sampleRentList?.length ?? 0);
  const baseRentRate = Number(base.rentVolumeChangeRate ?? 0);

  $("#averagePrice").textContent = money(basePrice);
  $("#averageChange").innerHTML = rateHtml(baseRate, "전월 대비");
  $("#jeonseRatio").textContent = estimateJeonseRatio(base);
  $("#ratioDiff").textContent = `${compareName} 대비 보증금 ${Math.abs(gap / 10000).toFixed(1)}억원 ${gap >= 0 ? "높음" : "낮음"}`;
  $("#tradeVolume").textContent = `${baseRentCount.toLocaleString()}건`;
  $("#volumeChange").innerHTML = rateHtml(baseRentRate, "전월 대비");
  $("#priceGap").textContent = money(Math.abs(gap));
  $("#gapDescription").textContent = `${baseName}이 ${compareName}보다 ${gap >= 0 ? "높습니다" : "낮습니다"}`;

  ["baseLegend", "baseShort"].forEach(id => $("#" + id).textContent = baseName);
  ["compareLegend", "compareShort"].forEach(id => $("#" + id).textContent = compareName);
  $("#basePrice").textContent = money(basePrice);
  $("#comparePrice").textContent = money(comparePrice);
  $("#baseRate").textContent = `전월 대비 ${formatRate(baseRate)}`;
  $("#compareRate").textContent = `전월 대비 ${formatRate(compareRate)}`;
  $("#comparisonInsight").textContent = `${baseName}의 평균 전세보증금은 ${compareName}보다 ${Math.abs(gap / 10000).toFixed(1)}억원 ${gap >= 0 ? "높고" : "낮으며"}, 전월 대비 변화율은 ${Math.abs(baseRate - compareRate).toFixed(1)}%p 차이입니다.`;

  renderChart(base, compare, Number($("#periodFilter").value));
}

function renderChart(base, compare, period) {
  const svg = $("#priceChart");
  const width = 760;
  const height = 300;
  const pad = 42;
  const baseSeries = makeSeries(base.jeonseAvgDeposit, base.jeonseChangeRate, period);
  const compareSeries = makeSeries(compare.jeonseAvgDeposit, compare.jeonseChangeRate, period);
  const all = [...baseSeries, ...compareSeries].filter(Boolean);
  const min = Math.max(0, Math.min(...all) - 5000);
  const max = Math.max(...all, 1) + 5000;
  const points = arr => arr.map((v, i) => `${pad + i * (width - pad * 2) / (arr.length - 1)},${height - pad - (v - min) / (max - min || 1) * (height - pad * 2)}`).join(" ");
  const grid = [0, 1, 2, 3, 4].map(i => {
    const y = pad + i * (height - pad * 2) / 4;
    const val = Math.round(max - i * (max - min) / 4);
    return `<line x1="${pad}" y1="${y}" x2="${width - pad}" y2="${y}"/><text x="4" y="${y + 4}">${shortMoney(val)}</text>`;
  }).join("");

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = `<g class="grid">${grid}</g><polyline class="line base" points="${points(baseSeries)}"/><polyline class="line compare" points="${points(compareSeries)}"/>`;
}

function makeSeries(current, rate, period) {
  const now = Number(current || 0);
  if (!now) return Array.from({ length: period }, () => 0);
  const prev = rate ? Math.round(now / (1 + Number(rate) / 100)) : now;
  return Array.from({ length: period }, (_, i) => {
    const t = period === 1 ? 1 : i / (period - 1);
    const wave = Math.sin(i * 1.7) * 0.006;
    return Math.round(prev + (now - prev) * t + now * wave);
  });
}

function renderRanking() {
  const rows = [...state.summaries.values()]
    .filter(item => item.jeonseAvgDeposit)
    .sort((a, b) => Number(b.jeonseAvgDeposit) - Number(a.jeonseAvgDeposit));
  const max = Math.max(...rows.map(row => Number(row.jeonseAvgDeposit || 0)), 1);

  $("#rankingList").innerHTML = rows.map((row, index) => `
    <div class="ranking-row">
      <b>${index + 1}</b>
      <span>${escapeHtml(row.regionName)}</span>
      <div><i style="width:${Number(row.jeonseAvgDeposit || 0) / max * 100}%"></i></div>
      <strong>${money(row.jeonseAvgDeposit)}</strong>
      <em>${formatRate(row.jeonseChangeRate)}</em>
    </div>
  `).join("");
}

function renderDeals() {
  const base = state.summaries.get($("#baseRegion").value);
  const compare = state.summaries.get($("#compareRegion").value);
  const selectedDealArea = $("#dealSearch").value;
  const groups = [
    ["기준지역", base],
    ["비교지역", compare]
  ].filter(([, summary]) => summary);

  const renderedGroups = groups.map(([label, summary]) => {
    const deals = (summary.sampleRentList || [])
      .filter(item => areaMatches(item.area))
      .filter(item => areaValueMatches(item.area, selectedDealArea));
    return renderDealGroup(label, summary, deals);
  });

  $("#dealGroups").innerHTML = renderedGroups.join("");
  $("#emptyDeals").hidden = groups.some(([, summary]) => (summary.sampleRentList || [])
    .filter(item => areaMatches(item.area))
    .some(item => areaValueMatches(item.area, selectedDealArea)));
}

function renderDealGroup(label, summary, deals) {
  return `
    <article class="deal-group">
      <div class="deal-group-head">
        <strong>${label}</strong>
        <span>${escapeHtml(summary.regionName)} · ${deals.length.toLocaleString()}건</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>계약일</th>
              <th>지역</th>
              <th>단지명</th>
              <th>면적</th>
              <th>층</th>
              <th>보증금</th>
              <th>계약 유형</th>
            </tr>
          </thead>
          <tbody>
            ${deals.length ? deals.map(item => `
              <tr>
                <td>${escapeHtml(formatDealDay(item.day))}</td>
                <td><b>${escapeHtml(item.dong || summary.regionName || "-")}</b></td>
                <td>${escapeHtml(item.aptName || "-")}</td>
                <td>${escapeHtml(item.area || "-")}㎡</td>
                <td>${escapeHtml(item.floor || "-")}층</td>
                <td><strong>${money(item.deposit)}</strong></td>
                <td><span class="contract-tag">${Number(item.monthlyRent || 0) ? `월세 ${Number(item.monthlyRent).toLocaleString()}만원` : "전세"}</span></td>
              </tr>
            `).join("") : `<tr><td colspan="7">검색 조건에 맞는 ${label} 거래가 없습니다.</td></tr>`}
          </tbody>
        </table>
      </div>
    </article>
  `;
}

function getApiBase() {
  if (window.location.protocol === "file:" || window.location.port !== "3000") {
    return "http://localhost:3000";
  }
  return "";
}

function getAreaRatio() {
  const area = $("#areaFilter").value;
  if (area === "all") return 1;
  const numericArea = Number(area);
  return Number.isFinite(numericArea) && numericArea > 0 ? numericArea / 84 : 1;
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

function estimateJeonseRatio(summary) {
  const sale = Number(summary.saleAvg || 0);
  const jeonse = Number(summary.jeonseAvgDeposit || 0);
  if (!sale || !jeonse) return "-";
  return `${Math.round(jeonse / sale * 1000) / 10}%`;
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

function shortMoney(value) {
  const num = Number(value || 0);
  return num >= 10000 ? `${Math.round(num / 1000) / 10}억` : `${Math.round(num / 1000)}천`;
}

function formatDealDay(day) {
  if (!day) return "-";
  return `${getTargetMonth().slice(4, 6)}.${String(day).padStart(2, "0")}`;
}

function updateTime() {
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
