// ==================================================
// guide.js — 집찾GO 이용가이드 스크립트
// ==================================================

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- 헤더 스크롤 / 모바일 메뉴 ---------- */
  const header = document.getElementById('mainHeader');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 20);
    });
  }
  const menuBtn = document.getElementById('menuBtn');
  const mobileNav = document.getElementById('mobileNav');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      menuBtn.classList.toggle('active');
      mobileNav.classList.toggle('active');
    });
  }

  /* ---------- 여정 지도 클릭 시 해당 섹션으로 스크롤 ---------- */
  document.querySelectorAll('.journey-stop').forEach(stop => {
    stop.addEventListener('click', () => {
      const target = document.getElementById(stop.dataset.target);
      if (target) {
        window.scrollTo({ top: target.offsetTop - 110, behavior: 'smooth' });
      }
    });
  });

  /* ---------- 사이드바 클릭 시 스크롤 ---------- */
  const navItems = document.querySelectorAll('.guide-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(item.getAttribute('href'));
      if (target) {
        window.scrollTo({ top: target.offsetTop - 110, behavior: 'smooth' });
      }
    });
  });

  /* ---------- 스크롤 스파이: 현재 보이는 섹션에 맞춰 사이드바 강조 ---------- */
  const sections = document.querySelectorAll('.guide-section[id]');
  const spy = () => {
    let current = sections[0]?.id;
    sections.forEach(sec => {
      if (window.scrollY + 140 >= sec.offsetTop) current = sec.id;
    });
    navItems.forEach(item => {
      item.classList.toggle('active', item.getAttribute('href') === '#' + current);
    });
  };
  window.addEventListener('scroll', spy);
  spy();

  /* ---------- Back to Top FAB ---------- */
  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    window.addEventListener('scroll', () => {
      backToTop.classList.toggle('show', window.scrollY > 400);
    });
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
});
