const $ = selector => document.querySelector(selector);
const messages = $("#messageList");
const input = $("#chatInput");
const replies = $("#quickReplies");
const typing = $("#typingIndicator");
const conditions = {
};
let step = 0;
let waiting = false;
const stages = [ {
  key: "need",
  question: "좋아요. 집을 찾을 때 지금 가장 중요하게 생각하는 것은 무엇인가요?",
  replies: ["출퇴근이 편한 곳",
  "예산에 맞는 곳",
  "아이와 살기 좋은 곳",
  "조용하고 쾌적한 곳"]
}, {
  key: "budget",
  question: "한 달 주거비나 보증금은 어느 정도까지 생각하고 계세요? 정확하지 않아도 괜찮아요.",
  replies: ["전세 3억원 안팎",
  "보증금 1억에 월세 100만원",
  "매매 8억원 이하",
  "예산부터 같이 계산하고 싶어"]
}, {
  key: "region",
  question: "선호하는 지역이나 생활권이 있나요? 아직 없다면 자주 가는 곳을 알려주세요.",
  replies: ["강남·송파 쪽",
  "마포·서대문 쪽",
  "성동·광진 쪽",
  "지역은 추천받고 싶어"]
}, {
  key: "commute",
  question: "주로 어디로 출퇴근하시고, 편도 몇 분까지 괜찮으세요?",
  replies: ["강남역까지 40분",
  "여의도까지 30분",
  "광화문까지 40분",
  "재택근무라 상관없어"]
}, {
  key: "household",
  question: "마지막으로 함께 사는 분과 꼭 필요한 생활조건을 알려주세요.",
  replies: ["신혼부부, 방 2개",
  "아이 1명, 학교와 공원",
  "혼자 거주, 역세권",
  "부모님과 거주, 병원 접근성"]
}];
function addMessage(text, role = "assistant", extra = "") {
  const article = document.createElement("article");
  article.className = `message ${role}`;
  article.innerHTML = role === "assistant" ? `<div class="message-avatar"><i class="ti ti-message-chatbot"></i></div><div class="message-content"><span class="message-name">집찾GO AI</span><div class="message-bubble">${escapeHtml(text)}</div>${extra}</div>` : `<div class="message-content"><div class="message-bubble">${escapeHtml(text)}</div></div>`;
  messages.appendChild(article);
  messages.scrollTop = messages.scrollHeight;
}
function escapeHtml(text) {
  return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
function askCurrentStage() {
  if (step >= stages.length) return showResult();
  const stage = stages[step];
  addMessage(stage.question);
  replies.innerHTML = stage.replies.map(value => `<button type="button">${value}</button>`).join("");
  replies.querySelectorAll("button").forEach(button => button.addEventListener("click", () => sendUserMessage(button.textContent)));
  updateProgress();
}
function sendUserMessage(text) {
  if (!text.trim() || waiting) return;
  addMessage(text.trim(), "user");
  replies.innerHTML = "";
  conditions[stages[step].key] = text.trim();
  step += 1;
  updateConditions();
  waiting = true;
  typing.hidden = false;
  messages.scrollTop = messages.scrollHeight;
  setTimeout(() => {
    typing.hidden = true; waiting = false; askCurrentStage();
  }, 650);
}
function updateProgress() {
  const percent = Math.round(step / stages.length * 100);
  $("#progressText").textContent = `${percent}%`;
  $("#progressBar").style.width = `${percent}%`;
  document.querySelectorAll("#stepList li").forEach((item, index) => {
    item.classList.toggle("done", index < step); item.classList.toggle("active", index === Math.min(step, 5));
  });
}
function updateConditions() {
  const labels = {
    need: "가장 중요한 조건",
    budget: "예산",
    region: "희망 지역",
    commute: "출퇴근",
    household: "가구·생활조건"
  };
  $("#conditionEmpty").hidden = Object.keys(conditions).length > 0;
  $("#conditionList").innerHTML = Object.entries(conditions).map(([key, value]) => `<div><dt>${labels[key]}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
}
function showResult() {
  updateProgress();
  const regionText = conditions.region || "지역 추천";
  const resultRegions = regionText.includes("마포") ? ["마포구",
  "서대문구",
  "영등포구"] : regionText.includes("성동") ? ["성동구",
  "광진구",
  "동대문구"] : ["송파구",
  "강동구",
  "성남시"];
  const cards = resultRegions.map((region, index) => `<div class="result-card"><span>추천 ${index + 1}</span><h3>${region}</h3><ul><li>${index ? "예산 균형" : "조건 적합도 높음"}</li><li>교통 접근 우수</li><li>생활 인프라</li></ul><a href="../../templates/market/region.html">지역 데이터 보기 <i class="ti ti-arrow-right"></i></a></div>`).join("");
  addMessage(`말씀해 주신 내용을 정리했어요.\n“${conditions.need}”을 가장 중요하게 보고, ${conditions.budget} 범위에서 살펴볼게요.`, "assistant", cards);
  replies.innerHTML = `<button type="button" id="moreCondition">조건을 더 이야기할게</button><button type="button" id="restartResult">처음부터 다시 찾기</button>`;
  $("#restartResult").addEventListener("click", resetChat);
  $("#moreCondition").addEventListener("click", () => {
    replies.innerHTML = ""; input.focus();
  });
  $("#chatSubTitle").textContent = "조건 정리가 끝났어요. 추천 지역을 비교해 보세요.";
}
function resetChat() {
  step = 0;
  waiting = false;
  Object.keys(conditions).forEach(key => delete conditions[key]);
  messages.innerHTML = "";
  replies.innerHTML = "";
  updateConditions();
  $("#chatSubTitle").textContent = "편하게 이야기하면 AI가 조건을 정리해 드려요.";
  addMessage("안녕하세요! 저는 집찾GO AI예요. 정해진 조건을 입력하는 대신, 대화를 나누며 나에게 맞는 집을 함께 찾아볼게요.");
  setTimeout(askCurrentStage, 350);
}
$("#chatForm").addEventListener("submit", event => {
  event.preventDefault(); const text = input.value; input.value = ""; sendUserMessage(text);
});
input.addEventListener("keydown", event => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault(); $("#chatForm").requestSubmit();
  }
});
$("#resetChat").addEventListener("click", resetChat);
$("#mobileSummaryBtn").addEventListener("click", () => $("#conditionPanel").classList.add("open"));
$("#closeSummary").addEventListener("click", () => $("#conditionPanel").classList.remove("open"));
const firstMessage = sessionStorage.getItem("jipchatgoFirstMessage");
sessionStorage.removeItem("jipchatgoFirstMessage");
addMessage("안녕하세요! 저는 집찾GO AI예요. 정해진 조건을 입력하는 대신, 대화를 나누며 나에게 맞는 집을 함께 찾아볼게요.");
if (firstMessage) setTimeout(() => sendUserMessage(firstMessage), 450);
else setTimeout(askCurrentStage, 450);
