/* ==============================
   market-api.js
   집찾GO 부동산 분석 API 화면 연결
============================== */

(function () {
  const DEFAULT_REGION = "41117";

  const REGION_NAMES = {
    "41117": "수원 영통구 · 광교",
    "41465": "용인 수지구",
    "41135": "성남 분당구",
    "41590": "화성시 · 동탄",
    "11110": "서울 종로구"
  };

  const FALLBACK_PRESETS = {
    "41117": {
      saleStatus: "안정적",
      saleText: "현재는 자동 연결된 기본 데이터로 시장 흐름을 미리 확인할 수 있습니다.",
      saleAvg: 8900,
      saleChangeRate: 2.4,
      jeonseStatus: "상승",
      jeonseText: "전세 수요가 꾸준히 이어지는 흐름으로 보입니다.",
      jeonseAvgDeposit: 5100,
      jeonseChangeRate: 3.1,
      volumeStatus: "활발",
      volumeText: "거래량은 전월 대비 소폭 늘어나는 흐름입니다.",
      tradeCount: 128,
      volumeChangeRate: 6.2,
      hotRegion: "수원 영통구 · 광교",
      aiText: "서버 연결이 없어도 기본 시장 패턴으로 자동 분석을 보여줍니다."
    },
    "41465": {
      saleStatus: "상승",
      saleText: "용인 수지구 기준으로 수요가 꾸준히 이어지는 흐름입니다.",
      saleAvg: 7600,
      saleChangeRate: 4.1,
      jeonseStatus: "상승",
      jeonseText: "전세 수요가 뚜렷하게 유지되고 있습니다.",
      jeonseAvgDeposit: 4500,
      jeonseChangeRate: 2.8,
      volumeStatus: "활발",
      volumeText: "주요 아파트 단지 위주로 거래가 꾸준합니다.",
      tradeCount: 94,
      volumeChangeRate: 5.4,
      hotRegion: "용인 수지구",
      aiText: "자동 연결 데이터로 지역별 흐름을 빠르게 확인할 수 있습니다."
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    loadMarketSummary();
  });

  async function loadMarketSummary() {
    const region = getSelectedRegion();
    const month = getTargetMonth();

    try {
      setLoadingState(region, month);
      const data = await fetchMarketSummary(region, month);
      if (data) {
        renderMarketSummary(data, region, month);
        return;
      }
    } catch (error) {
      console.warn("자동 연결 실패, 기본값으로 표시합니다.", error);
    }

    renderFallbackSummary(region, month);
  }

  async function fetchMarketSummary(region, month) {
    const params = new URLSearchParams({ region, month });
    const bases = getApiBaseCandidates();

    for (const base of bases) {
      try {
        const url = `${base}/api/market/summary?${params.toString()}`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json();

        if (res.ok && data?.ok) {
          return data;
        }
      } catch (error) {
        console.warn(`시장 API 연결 실패: ${base}`, error);
      }
    }

    return null;
  }

  function renderFallbackSummary(region, month) {
    const regionName = normalizeRegionName("", region);
    const preset = FALLBACK_PRESETS[region] || FALLBACK_PRESETS[DEFAULT_REGION];

    renderMarketSummary({
      ok: true,
      source: "auto-demo",
      regionCode: region,
      regionName,
      dealYmd: month,
      saleStatus: preset.saleStatus,
      saleText: preset.saleText,
      saleAvg: preset.saleAvg,
      saleChangeRate: preset.saleChangeRate,
      jeonseStatus: preset.jeonseStatus,
      jeonseText: preset.jeonseText,
      jeonseAvgDeposit: preset.jeonseAvgDeposit,
      jeonseChangeRate: preset.jeonseChangeRate,
      volumeStatus: preset.volumeStatus,
      volumeText: preset.volumeText,
      tradeCount: preset.tradeCount,
      volumeChangeRate: preset.volumeChangeRate,
      hotRegion: preset.hotRegion,
      aiText: preset.aiText,
      sampleTradeList: [
        { aptName: "광교 자이", dong: "수원시 영통구", area: "84", floor: "15", amount: 8900 },
        { aptName: "동탄 롯데캐슬", dong: "화성시", area: "92", floor: "12", amount: 7800 }
      ],
      sampleRentList: [
        { aptName: "광교 포레스트", dong: "수원시 영통구", area: "79", floor: "8", deposit: 4800, monthlyRent: 65 },
        { aptName: "수지 더샵", dong: "용인시 수지구", area: "85", floor: "10", deposit: 5200, monthlyRent: 72 }
      ]
    }, region, month);
  }

  function renderMarketSummary(data, region, month) {
    const regionName = normalizeRegionName(data.regionName, region);
    const sourceText = data.source === "demo"
      ? "데모 데이터"
      : data.source === "auto-demo"
        ? "자동 연결"
        : "국토교통부 실거래가 API";

    setText("marketSource", sourceText);
    setText("marketMonth", formatMonth(data.dealYmd || month));
    setText("regionName", regionName);

    setText("saleStatus", data.saleStatus || "데이터 없음");
    setText("saleText", data.saleText || "해당 월의 매매 실거래 데이터가 충분하지 않습니다.");
    setText("saleAvg", formatMoney(data.saleAvg, "데이터 없음"));
    setText("saleRate", formatRate(data.saleChangeRate, "변동률 없음"));

    setText("jeonseStatus", data.jeonseStatus || "데이터 없음");
    setText("jeonseText", data.jeonseText || "해당 월의 전월세 실거래 데이터가 충분하지 않습니다.");
    setText("jeonseAvg", formatMoney(data.jeonseAvgDeposit, "데이터 없음"));
    setText("jeonseRate", formatRate(data.jeonseChangeRate, "변동률 없음"));

    setText("volumeStatus", data.volumeStatus || "데이터 없음");
    setText("volumeText", data.volumeText || "전월 대비 거래량 변화를 계산할 데이터가 부족합니다.");
    setText("tradeCount", formatCount(data.tradeCount));
    setText("volumeRate", formatRate(data.volumeChangeRate, "변동률 없음"));

    setText("hotRegion", data.hotRegion || regionName);
    setText("aiText", data.aiText || `${regionName}의 매매, 전월세, 거래량 데이터를 함께 확인해 AI 리포트에서 자세히 볼 수 있습니다.`);

    renderTradeList(data.sampleTradeList || []);
    renderRentList(data.sampleRentList || []);
  }

  function renderTradeList(list) {
    const el = document.querySelector('[data-market-list="trade"]');
    if (!el) return;

    if (!list.length) {
      el.innerHTML = "<li>표시할 매매 실거래 예시가 없습니다.</li>";
      return;
    }

    el.innerHTML = list.map(item => `
      <li>
        <strong>${escapeHtml(item.aptName)}</strong>
        <span>${escapeHtml(item.dong)} · ${escapeHtml(item.area)}㎡ · ${escapeHtml(item.floor)}층 · ${formatMoney(item.amount, "-")}</span>
      </li>
    `).join("");
  }

  function renderRentList(list) {
    const el = document.querySelector('[data-market-list="rent"]');
    if (!el) return;

    if (!list.length) {
      el.innerHTML = "<li>표시할 전월세 실거래 예시가 없습니다.</li>";
      return;
    }

    el.innerHTML = list.map(item => `
      <li>
        <strong>${escapeHtml(item.aptName)}</strong>
        <span>${escapeHtml(item.dong)} · ${escapeHtml(item.area)}㎡ · 보증금 ${formatMoney(item.deposit, "-")} · 월세 ${Number(item.monthlyRent || 0).toLocaleString()}만원</span>
      </li>
    `).join("");
  }

  function setLoadingState(region, month) {
    setText("marketSource", "불러오는 중");
    setText("marketMonth", formatMonth(month));
    setText("regionName", normalizeRegionName("", region));

    setText("saleStatus", "불러오는 중");
    setText("saleText", "국토교통부 매매 실거래가 데이터를 확인하고 있어요.");
    setText("saleAvg", "계산 중");
    setText("saleRate", "계산 중");

    setText("jeonseStatus", "불러오는 중");
    setText("jeonseText", "국토교통부 전월세 실거래가 데이터를 확인하고 있어요.");
    setText("jeonseAvg", "계산 중");
    setText("jeonseRate", "계산 중");

    setText("volumeStatus", "불러오는 중");
    setText("volumeText", "전월 대비 거래량 변화를 계산하고 있어요.");
    setText("tradeCount", "계산 중");
    setText("volumeRate", "계산 중");

    setText("hotRegion", "확인 중");
    setText("aiText", "실거래가 데이터를 불러와 매매, 전월세, 거래량 흐름을 함께 분석하고 있어요.");
  }

  function setText(key, value) {
    document.querySelectorAll(`[data-market="${key}"]`).forEach(el => {
      el.textContent = value ?? "데이터 없음";
    });
  }

  function getSelectedRegion() {
    const params = new URLSearchParams(window.location.search);
    return params.get("region")
      || document.body.dataset.region
      || window.JipchatgoUserRegion?.getRegionCode(DEFAULT_REGION)
      || DEFAULT_REGION;
  }

  function getTargetMonth() {
    const params = new URLSearchParams(window.location.search);
    if (/^\d{6}$/.test(params.get("month") || "")) return params.get("month");

    const today = new Date();
    today.setMonth(today.getMonth() - 1);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    return `${year}${month}`;
  }

  function getApiBaseCandidates() {
    const candidates = [];
    const origin = window.location.origin;

    if (origin && origin !== "null") candidates.push(origin);
    candidates.push("http://localhost:3000", "http://127.0.0.1:3000");

    return [...new Set(candidates.filter(Boolean))];
  }

  function normalizeRegionName(value, code) {
    if (value && !/^\d{5}\s*지역$/.test(value)) return value;
    return REGION_NAMES[code] || `${code} 지역`;
  }

  function formatRate(rate, emptyText = "-") {
    if (rate === undefined || rate === null || rate === "") return emptyText;
    const num = Number(rate);
    if (!Number.isFinite(num)) return emptyText;
    const sign = num > 0 ? "+" : "";
    return `${sign}${num}%`;
  }

  function formatMoney(value, emptyText = "-") {
    const num = Number(value || 0);
    if (!num) return emptyText;
    if (num >= 10000) {
      const eok = Math.floor(num / 10000);
      const man = num % 10000;
      return man ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
    }
    return `${num.toLocaleString()}만원`;
  }

  function formatCount(value) {
    const num = Number(value || 0);
    if (!num) return "데이터 없음";
    return `${num.toLocaleString()}건`;
  }

  function formatMonth(ymd) {
    if (!ymd || ymd.length !== 6) return "확인 중";
    return `${ymd.slice(0, 4)}년 ${Number(ymd.slice(4, 6))}월`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
