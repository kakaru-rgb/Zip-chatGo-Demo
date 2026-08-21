/* ==========================
   member.js
   회원가입 / 로그인 기능
   현재는 localStorage 임시 저장 방식
========================== */

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");
  const guestLoginBtn = document.getElementById("guestLoginBtn");

  /* 회원가입 화면 자동입력 제거 */
  if (signupForm) {
    clearSignupForm();

    setTimeout(clearSignupForm, 100);
    setTimeout(clearSignupForm, 500);

    signupForm.addEventListener("submit", handleSignup);
  }

  /* 로그인 화면 자동입력 제거 */
  if (loginForm) {
    clearLoginForm();

    setTimeout(clearLoginForm, 100);
    setTimeout(clearLoginForm, 500);

    loginForm.addEventListener("submit", handleLogin);
  }

  if (guestLoginBtn) {
    guestLoginBtn.addEventListener("click", handleGuestLogin);
  }
});

/* ==========================
   학교 시연용 게스트 로그인
========================== */

function handleGuestLogin() {
  const guestLoginBtn = document.getElementById("guestLoginBtn");
  const message = document.getElementById("loginMessage");
  const loginUser = {
    name: "시연 게스트",
    userId: "school-demo-guest",
    email: "demo@jipchatgo.com",
    isGuest: true,
    loginAt: new Date().toISOString(),
    rememberLogin: false
  };

  localStorage.setItem("jipchatgoLoginUser", JSON.stringify(loginUser));
  guestLoginBtn.disabled = true;
  guestLoginBtn.innerHTML = '<i class="ti ti-loader-2"></i> 게스트로 로그인 중...';
  showMessage(message, "시연용 게스트 계정으로 로그인되었습니다.", "success");

  setTimeout(() => {
    location.href = "../../index.html";
  }, 600);
}

/* ==========================
   회원가입 입력값 초기화
========================== */

function clearSignupForm() {
  const signupForm = document.getElementById("signupForm");

  if (signupForm) {
    signupForm.reset();
  }

  const userName = document.getElementById("userName");
  const userId = document.getElementById("userId");
  const userPassword = document.getElementById("userPassword");
  const userPasswordCheck = document.getElementById("userPasswordCheck");
  const userPhone = document.getElementById("userPhone");
  const userEmail = document.getElementById("userEmail");

  if (userName) userName.value = "";
  if (userId) userId.value = "";
  if (userPassword) userPassword.value = "";
  if (userPasswordCheck) userPasswordCheck.value = "";
  if (userPhone) userPhone.value = "";
  if (userEmail) userEmail.value = "";
}

/* ==========================
   로그인 입력값 초기화
========================== */

function clearLoginForm() {
  const loginForm = document.getElementById("loginForm");

  if (loginForm) {
    loginForm.reset();
  }

  const loginId = document.getElementById("loginId");
  const loginPassword = document.getElementById("loginPassword");

  if (loginId) loginId.value = "";
  if (loginPassword) loginPassword.value = "";
}

/* ==========================
   회원가입
========================== */

function handleSignup(e) {
  e.preventDefault();

  const name = document.getElementById("userName").value.trim();
  const userId = document.getElementById("userId").value.trim();
  const password = document.getElementById("userPassword").value.trim();
  const passwordCheck = document.getElementById("userPasswordCheck").value.trim();
  const phone = document.getElementById("userPhone").value.trim();
  const email = document.getElementById("userEmail").value.trim();
  const message = document.getElementById("signupMessage");

  message.className = "member-message";
  message.textContent = "";

  if (!name || !userId || !password || !passwordCheck || !phone || !email) {
    showMessage(message, "모든 항목을 입력해주세요.", "error");
    return;
  }

  if (userId.length < 4) {
    showMessage(message, "아이디는 4자 이상 입력해주세요.", "error");
    return;
  }

  if (password.length < 4) {
    showMessage(message, "비밀번호는 4자 이상 입력해주세요.", "error");
    return;
  }

  if (password !== passwordCheck) {
    showMessage(message, "비밀번호가 서로 일치하지 않습니다.", "error");
    return;
  }

  if (!email.includes("@")) {
    showMessage(message, "이메일 형식을 확인해주세요.", "error");
    return;
  }

  const users = JSON.parse(localStorage.getItem("jipchatgoUsers")) || [];

  const duplicateUser = users.find(user => user.userId === userId);

  if (duplicateUser) {
    showMessage(message, "이미 사용 중인 아이디입니다.", "error");
    return;
  }

  const newUser = {
    name,
    userId,
    password,
    phone,
    email,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  localStorage.setItem("jipchatgoUsers", JSON.stringify(users));

  showMessage(message, "회원가입이 완료되었습니다. 로그인 페이지로 이동합니다.", "success");

  clearSignupForm();

  setTimeout(() => {
    location.href = "../../login.html";
  }, 900);
}

/* ==========================
   로그인
========================== */

function handleLogin(e) {
  e.preventDefault();

  const loginId = document.getElementById("loginId").value.trim();
  const loginPassword = document.getElementById("loginPassword").value.trim();
  const rememberLoginEl = document.getElementById("rememberLogin");
  const rememberLogin = rememberLoginEl ? rememberLoginEl.checked : false;
  const message = document.getElementById("loginMessage");

  message.className = "member-message";
  message.textContent = "";

  if (!loginId || !loginPassword) {
    showMessage(message, "아이디와 비밀번호를 입력해주세요.", "error");
    return;
  }

  const users = JSON.parse(localStorage.getItem("jipchatgoUsers")) || [];

  const foundUser = users.find(user => {
    return user.userId === loginId && user.password === loginPassword;
  });

  if (!foundUser) {
    showMessage(message, "아이디 또는 비밀번호가 일치하지 않습니다.", "error");
    return;
  }

  const loginUser = {
    name: foundUser.name,
    userId: foundUser.userId,
    email: foundUser.email,
    loginAt: new Date().toISOString(),
    rememberLogin
  };

  localStorage.setItem("jipchatgoLoginUser", JSON.stringify(loginUser));

  showMessage(message, `${foundUser.name}님, 로그인되었습니다.`, "success");

  clearLoginForm();

  setTimeout(() => {
    location.href = "../../index.html";
  }, 800);
}

/* ==========================
   공통 메시지
========================== */

function showMessage(target, text, type) {
  target.textContent = text;
  target.classList.add(type);
}
