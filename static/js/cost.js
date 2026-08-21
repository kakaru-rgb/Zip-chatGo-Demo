(function () {
  document.addEventListener("DOMContentLoaded", () => {
    bindInputs();
    calculateAll();
    scrollToHash();
  });

  function bindInputs() {
    $("#brokeragePrice").addEventListener("input", syncBasePriceFields);
    $("#brokeragePrice").addEventListener("change", syncBasePriceFields);

    document.querySelectorAll("input, select").forEach(el => {
      el.addEventListener("input", calculateAll);
      el.addEventListener("change", calculateAll);
    });
  }

  function syncBasePriceFields() {
    const value = $("#brokeragePrice").value;
    $("#homePrice").value = value;
    $("#budgetPrice").value = value;
  }

  function calculateAll() {
    updateAmountPreviews();
    const brokerage = calculateBrokerage();
    const acquisition = calculateAcquisition();
    calculateBudget(brokerage.fee, acquisition.total);
  }

  function updateAmountPreviews() {
    document.querySelectorAll("[data-amount-preview-for]").forEach(el => {
      const input = document.getElementById(el.dataset.amountPreviewFor);
      const amount = Math.max(0, Number(input?.value || 0));
      el.textContent = amount ? money(amount) : "0만원";
    });
  }

  function calculateBrokerage() {
    const type = $("#brokerageType").value;
    const price = number("#brokeragePrice");
    const monthly = number("#monthlyRent");
    const base = type === "monthly" ? price + monthly * 100 : price;
    const rule = getBrokerageRule(type === "sale" ? "sale" : "rent", base);
    const fee = Math.min(Math.round(base * rule.rate), rule.cap || Infinity);
    const label = type === "monthly" ? "월세 환산금액" : type === "jeonse" ? "전세 보증금" : "매매금액";

    $("#monthlyRent").disabled = type !== "monthly";
    $("#brokerageFee").textContent = money(fee);
    $("#brokerageInfo").textContent = `${label} ${money(base)} 기준, 상한요율 ${(rule.rate * 100).toFixed(1)}%를 적용했습니다.`;
    return { fee, base };
  }

  function calculateAcquisition() {
    const type = $("#brokerageType").value;
    const isSale = type === "sale";
    const acquisitionInputs = document.querySelectorAll("#acquisition input, #acquisition select");
    acquisitionInputs.forEach(el => {
      el.disabled = !isSale;
    });

    if (!isSale) {
      $("#acquisitionTax").textContent = "0만원";
      $("#acquisitionInfo").textContent = "취득세는 매매 거래일 때만 계산됩니다.";
      return { total: 0, rate: 0 };
    }

    const price = number("#homePrice");
    const houseCount = $("#houseCount").value;
    const area = $("#homeArea").value;
    const rate = getAcquisitionRate(price, houseCount);
    const acquisition = Math.round(price * rate);
    const education = Math.round(acquisition * 0.1);
    const rural = area === "large" ? Math.round(acquisition * 0.2) : 0;
    const total = acquisition + education + rural;

    $("#acquisitionTax").textContent = money(total);
    $("#acquisitionInfo").textContent = `취득세 ${money(acquisition)}, 지방교육세 ${money(education)}${rural ? `, 농어촌특별세 ${money(rural)}` : ""}를 합산한 예상액입니다.`;
    return { total, rate };
  }

  function calculateBudget(brokerageFee, acquisitionTax) {
    const price = number("#budgetPrice");
    const loan = number("#loanPlan");
    const extra = number("#extraCost");
    const cash = Math.max(0, price - loan + brokerageFee + acquisitionTax + extra);

    $("#cashNeeded").textContent = money(cash);
    $("#budgetInfo").textContent = `매매가에서 대출 ${money(loan)}을 제외하고 세금, 중개수수료, 기타비용 ${money(extra)}를 더한 금액입니다.`;
  }

  function getBrokerageRule(type, amount) {
    if (type === "rent") {
      if (amount < 5000) return { rate: 0.005, cap: 20 };
      if (amount < 10000) return { rate: 0.004, cap: 30 };
      if (amount < 60000) return { rate: 0.003, cap: 0 };
      if (amount < 120000) return { rate: 0.004, cap: 0 };
      if (amount < 150000) return { rate: 0.005, cap: 0 };
      return { rate: 0.006, cap: 0 };
    }

    if (amount < 5000) return { rate: 0.006, cap: 25 };
    if (amount < 20000) return { rate: 0.005, cap: 80 };
    if (amount < 90000) return { rate: 0.004, cap: 0 };
    if (amount < 120000) return { rate: 0.005, cap: 0 };
    if (amount < 150000) return { rate: 0.006, cap: 0 };
    return { rate: 0.007, cap: 0 };
  }

  function getAcquisitionRate(price, houseCount) {
    if (houseCount === "2") return 0.08;
    if (houseCount === "3") return 0.12;
    if (price <= 60000) return 0.01;
    if (price <= 90000) return 0.02;
    return 0.03;
  }

  function scrollToHash() {
    if (!window.location.hash) return;
    const target = document.querySelector(window.location.hash);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function number(selector) {
    return Math.max(0, Number($(selector).value || 0));
  }

  function money(value) {
    const num = Math.round(Number(value || 0));
    if (num >= 10000) {
      const eok = Math.floor(num / 10000);
      const man = num % 10000;
      return man ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
    }
    return `${num.toLocaleString()}만원`;
  }

  function $(selector) {
    return document.querySelector(selector);
  }
})();
