/* 대화 시작 문장 빠른 입력 */
document.querySelectorAll(".quick-tags button").forEach(tag => {
  tag.addEventListener("click", () => {
    const input = document.querySelector(".ai-search-box input");
    if (input) {
      input.value = tag.innerText;
      input.focus();
    }
  });
});

function isLoggedIn() {
  return Boolean(localStorage.getItem("jipchatgoLoginUser"));
}

function redirectToLoginIfNeeded(event) {
  if (!isLoggedIn()) {
    event.preventDefault();
    const target = event.currentTarget.href; // 원래 가려던 페이지 (예: register.html)
    window.location.href = "./templates/member/login.html?redirect=" + encodeURIComponent(target);
  }
}

document.querySelectorAll(".feature-link").forEach(link => {
  link.addEventListener("click", redirectToLoginIfNeeded);
});

const conversationInput = document.querySelector(".ai-search-box input");
const conversationButton = document.querySelector(".ai-search-box button");

function startDemoConversation(event) {
  if (!isLoggedIn()) {
    event?.preventDefault();
    const target = new URL("./templates/ai/chat.html", window.location.href).href;
    window.location.href = "./templates/member/login.html?redirect=" + encodeURIComponent(target);
    return;
  }

  const firstMessage = conversationInput?.value.trim();
  if (firstMessage) sessionStorage.setItem("jipchatgoFirstMessage", firstMessage);
  location.href = "../../templates/ai/chat.html";
}

conversationButton?.addEventListener("click", startDemoConversation);
conversationInput?.addEventListener("keydown", event => {
  if (event.key === "Enter") startDemoConversation(event);
});
