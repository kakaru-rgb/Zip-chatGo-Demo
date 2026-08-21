document.querySelectorAll(".faq-item > button").forEach(button => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    const isOpen = item.classList.toggle("open");
    button.setAttribute("aria-expanded", String(isOpen));
  });
});

const faqSearch = document.getElementById("faqSearch");
const faqTabs = document.querySelectorAll(".faq-tabs button");
const faqItems = document.querySelectorAll(".faq-item");
const faqEmpty = document.querySelector(".faq-empty");
let activeCategory = "all";

function filterFaq() {
  const keyword = faqSearch.value.trim().toLowerCase();
  let visibleCount = 0;

  faqItems.forEach(item => {
    const matchesCategory = activeCategory === "all" || item.dataset.category === activeCategory;
    const matchesKeyword = !keyword || item.textContent.toLowerCase().includes(keyword);
    const isVisible = matchesCategory && matchesKeyword;
    item.hidden = !isVisible;
    if (isVisible) visibleCount += 1;
  });

  faqEmpty.hidden = visibleCount !== 0;
}

faqSearch.addEventListener("input", filterFaq);
faqTabs.forEach(tab => {
  tab.addEventListener("click", () => {
    activeCategory = tab.dataset.category;
    faqTabs.forEach(item => item.classList.toggle("active", item === tab));
    filterFaq();
  });
});

document.getElementById("inquiryForm").addEventListener("submit", event => {
  event.preventDefault();
  const form = event.currentTarget;
  const inquiries = JSON.parse(localStorage.getItem("jipchatgoInquiries") || "[]");
  inquiries.push({ ...Object.fromEntries(new FormData(form)), createdAt: new Date().toISOString() });
  localStorage.setItem("jipchatgoInquiries", JSON.stringify(inquiries));
  document.getElementById("formResult").textContent = "문의가 정상적으로 접수되었습니다. 빠르게 확인해 드릴게요.";
  form.reset();
});
