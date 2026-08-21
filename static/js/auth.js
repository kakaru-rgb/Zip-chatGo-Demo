// ==================================================
// auth.js — 집찾GO 로그인/회원가입 공통 스크립트
// login.html, signup.html에서 동일하게 사용
// ==================================================

const AUTH_SITE_ROOT_URL = new URL("../../", document.currentScript.src);

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- 로그인 후 이동할 목적지 (?redirect=...) ---------- */
  const params = new URLSearchParams(window.location.search);
  const redirectTarget = params.get('redirect') || new URL('index.html', AUTH_SITE_ROOT_URL).href;

  function goToRedirectTarget() {
    window.location.href = redirectTarget;
  }

  // common.js가 localStorage의 이 키를 보고 로그인 상태를 판단하므로,
  // 로그인/회원가입/게스트 체험 모두 이 함수를 통해 상태를 저장해요.
  function setLoggedIn(userLabel) {
    localStorage.setItem('jipchatgoLoginUser', userLabel);
  }

  // 특정 페이지로 가기 위해 로그인이 필요해서 넘어온 경우, 안내 배너를 보여줘요.
  if (params.get('redirect')) {
    const banner = document.createElement('div');
    banner.className = 'redirect-notice';
    const isRegister = redirectTarget.includes('register.html');
    banner.innerHTML = `<i class="ti ti-info-circle"></i> ${
      isRegister ? '매물을 등록하려면 먼저 로그인해주세요.' : '계속하려면 먼저 로그인해주세요.'
    }`;
    const tabs = document.querySelector('.auth-tabs');
    if (tabs) tabs.insertAdjacentElement('beforebegin', banner);
  }

  /* ---------- 헤더 스크롤 / 모바일 메뉴 (common.css 공통 헤더용) ---------- */
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

  /* ---------- 탭 전환 (로그인 ↔ 회원가입) ---------- */
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');
  const visualCopy = {
    login: {
      eyebrow: '로그인',
      title: 'AI가 추천하는 내 집,<br>로그인하고 이어가세요',
      desc: '저장해 둔 조건과 관심 매물을 그대로 불러와 드려요.'
    },
    signup: {
      eyebrow: '회원가입',
      title: '몇 분이면 충분해요,<br>지금 시작하는 부동산 여정',
      desc: '일반회원과 공인중개사 모두 집찾GO에서 시작할 수 있어요.'
    }
  };

  function switchTab(name) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    forms.forEach(f => f.classList.toggle('active', f.dataset.form === name));

    const eyebrowEl = document.querySelector('.visual-copy .eyebrow');
    const titleEl = document.querySelector('.visual-copy h2');
    const descEl = document.querySelector('.visual-copy p');
    const copy = visualCopy[name];
    if (copy && eyebrowEl && titleEl && descEl) {
      [eyebrowEl, titleEl, descEl].forEach(el => el.style.opacity = 0);
      setTimeout(() => {
        eyebrowEl.textContent = copy.eyebrow;
        titleEl.innerHTML = copy.title;
        descEl.textContent = copy.desc;
        [eyebrowEl, titleEl, descEl].forEach(el => el.style.opacity = 1);
      }, 150);
    }

    updateKeyring(name);
    history.replaceState(null, '', name === 'signup' ? '#signup' : '#login');
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  document.querySelectorAll('[data-switch-to]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.switchTo));
  });

  // URL 해시로 초기 탭 결정 (#signup 이면 회원가입 탭부터)
  if (location.hash === '#signup' || document.body.dataset.defaultTab === 'signup') {
    switchTab('signup');
  } else {
    switchTab('login');
  }

  /* ---------- 시그니처: 진행 단계에 따라 채워지는 열쇠고리 ---------- */
  function updateKeyring(name) {
    const keys = document.querySelectorAll('.keyring .key');
    if (!keys.length) return;
    const filledCount = name === 'signup' ? getSignupProgress() : 1;
    keys.forEach((key, i) => key.classList.toggle('filled', i < filledCount));
  }

  function getSignupProgress() {
    // 이름/이메일/비밀번호가 채워질수록 열쇠가 하나씩 걸림 (최대 3개)
    const name = document.getElementById('suName');
    const email = document.getElementById('suEmail');
    const pw = document.getElementById('suPassword');
    let count = 0;
    if (name && name.value.trim()) count++;
    if (email && email.value.trim()) count++;
    if (pw && pw.value.trim()) count++;
    return count;
  }

  ['suName', 'suEmail', 'suPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => updateKeyring('signup'));
  });

  /* ---------- 비밀번호 보이기/숨기기 ---------- */
  document.querySelectorAll('.toggle-visibility').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      btn.innerHTML = isPw ? '<i class="ti ti-eye-off"></i>' : '<i class="ti ti-eye"></i>';
    });
  });

  /* ---------- 회원 유형 선택 (일반회원 / 공인중개사) ---------- */
  const typeCards = document.querySelectorAll('.type-card');
  const brokerFields = document.getElementById('brokerFields');
  typeCards.forEach(card => {
    card.addEventListener('click', () => {
      typeCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input').checked = true;
      if (brokerFields) {
        brokerFields.classList.toggle('show', card.dataset.type === 'broker');
      }
    });
  });

  /* ---------- 전체 동의 체크박스 ---------- */
  const agreeAll = document.getElementById('agreeAll');
  const agreeItems = document.querySelectorAll('.agree-item');
  if (agreeAll) {
    agreeAll.addEventListener('change', () => {
      agreeItems.forEach(item => { item.checked = agreeAll.checked; });
    });
    agreeItems.forEach(item => {
      item.addEventListener('change', () => {
        agreeAll.checked = Array.from(agreeItems).every(i => i.checked);
      });
    });
  }

  /* ---------- 간단한 유효성 검사 ---------- */
  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail');
      const pw = document.getElementById('loginPassword');
      let ok = true;
      if (!validateEmail(email.value)) { email.classList.add('invalid'); ok = false; }
      else email.classList.remove('invalid');
      if (pw.value.length < 4) { pw.classList.add('invalid'); ok = false; }
      else pw.classList.remove('invalid');
      if (ok) {
        setLoggedIn(email.value);
        showToast('로그인 되었습니다. 이동할게요.');
        setTimeout(goToRedirectTarget, 700);
      }
    });
  }

  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const pw = document.getElementById('suPassword');
      const pwCheck = document.getElementById('suPasswordCheck');
      const requiredAgree = document.querySelectorAll('.agree-item[required]');
      let ok = true;

      if (pw.value.length < 8) { pw.classList.add('invalid'); ok = false; }
      else pw.classList.remove('invalid');

      if (pwCheck.value !== pw.value || !pwCheck.value) { pwCheck.classList.add('invalid'); ok = false; }
      else pwCheck.classList.remove('invalid');

      requiredAgree.forEach(chk => { if (!chk.checked) ok = false; });

      if (ok) {
        const suEmail = document.getElementById('suEmail');
        setLoggedIn(suEmail && suEmail.value ? suEmail.value : 'member');
        showToast('회원가입이 완료됐어요. 환영합니다!');
        setTimeout(goToRedirectTarget, 700);
      }
      else if (!Array.from(requiredAgree).every(c => c.checked)) {
        showToast('필수 약관에 동의해주세요.');
      }
    });
  }

  /* ---------- 게스트 체험 로그인 (발표/시연용) ---------- */
  document.querySelectorAll('.guest-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setLoggedIn('guest');
      showToast('게스트 모드로 접속했어요 (시연용 계정)');
      setTimeout(goToRedirectTarget, 900);
    });
  });

  /* ---------- 토스트 ---------- */
  function showToast(message) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2400);
  }

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
