/* ==========================
   common.js
   공통 헤더 / 모바일 메뉴 / 로그인 상태 처리
========================== */

// 이 스크립트 자신의 위치(static/js/common.js) 기준으로 사이트 루트를 계산해요.
// index.html에서 부르든(./static/js/common.js), 하위 페이지에서 부르든(../../static/js/common.js)
// 브라우저가 해석하는 절대경로는 항상 동일하므로, 페이지 깊이에 상관없이 정확한 루트를 찾을 수 있어요.
const COMMON_SITE_ROOT_URL = new URL("../../", document.currentScript.src);

document.addEventListener("DOMContentLoaded", () => {
  initHeaderScroll();
  initMobileMenu();
  updateLoginMenu();
});

/* ==========================
   스크롤 헤더 효과
========================== */

function initHeaderScroll() {
  const header = document.getElementById("mainHeader");

  if (!header) return;

  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 20);
  });
}

/* ==========================
   모바일 메뉴
========================== */

function initMobileMenu() {
  const menuBtn = document.getElementById("menuBtn");
  const mobileNav = document.getElementById("mobileNav");

  if (!menuBtn || !mobileNav) return;

  menuBtn.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("active");
    menuBtn.classList.toggle("active", isOpen);
    document.body.classList.toggle("nav-open", isOpen);
    menuBtn.setAttribute("aria-expanded", String(isOpen));
    menuBtn.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
  });

  document.querySelectorAll(".top-nav a").forEach(link => {
    link.addEventListener("click", () => {
      menuBtn.classList.remove("active");
      mobileNav.classList.remove("active");
      document.body.classList.remove("nav-open");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "메뉴 열기");
    });
  });
}

/* ==========================
   로그인 상태 메뉴 변경
========================== */

function updateLoginMenu() {
  const loginUser = localStorage.getItem("jipchatgoLoginUser");
  const logoutButtons = document.querySelectorAll(".logout-btn");

  if (loginUser) {
    document.body.classList.add("login-active");
  } else {
    document.body.classList.remove("login-active");
  }

  logoutButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      localStorage.removeItem("jipchatgoLoginUser");
      document.body.classList.remove("login-active");

      alert("로그아웃 되었습니다.");
      location.href = new URL("index.html", COMMON_SITE_ROOT_URL).href;
    });
  });
}
