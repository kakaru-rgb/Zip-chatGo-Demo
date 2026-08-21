const FAVORITE_PROPERTY_STORAGE_KEY = "zipchatgo.favoritePropertyIds";
const PROPERTY_IMAGE_BASE_PATH = "../../static/data/아파트_공통_이미지";
const APARTMENT_IMAGE_COUNT = 93;

let allFavoritePageProperties = [];
let displayedFavoriteProperties = [];
let favoritePropertyIds = loadFavoritePropertyIds();

document.addEventListener("DOMContentLoaded", initializeFavoritePage);
window.addEventListener("storage", handleFavoriteStorageChange);

async function initializeFavoritePage() {
  try {
    const response = await fetch("../../static/data/properties.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    allFavoritePageProperties = data.map(item => ({
      ...item,
      id: String(item.id),
      sale_price: Number(item.sale_price),
      exclusive_area: Number(item.exclusive_area)
    }));

    rebuildFavoriteCards();
  } catch (error) {
    console.error("관심 매물 데이터를 불러오지 못했습니다:", error);
    showFavoriteLoadError();
  }
}

function loadFavoritePropertyIds() {
  try {
    const storedValue = JSON.parse(localStorage.getItem(FAVORITE_PROPERTY_STORAGE_KEY) || "[]");
    if (!Array.isArray(storedValue)) return new Set();

    return new Set(storedValue.map(id => String(id)));
  } catch (error) {
    console.warn("관심 매물 목록을 불러오지 못했습니다:", error);
    return new Set();
  }
}

function saveFavoritePropertyIds() {
  try {
    localStorage.setItem(
      FAVORITE_PROPERTY_STORAGE_KEY,
      JSON.stringify(Array.from(favoritePropertyIds))
    );
  } catch (error) {
    console.warn("관심 매물 목록을 저장하지 못했습니다:", error);
  }
}

function rebuildFavoriteCards() {
  displayedFavoriteProperties = allFavoritePageProperties.filter(item => (
    favoritePropertyIds.has(item.id)
  ));

  renderFavoriteCards();
}

function renderFavoriteCards() {
  const grid = document.getElementById("favoriteGrid");
  const empty = document.getElementById("favoriteEmpty");

  grid.innerHTML = "";
  empty.hidden = displayedFavoriteProperties.length > 0;

  displayedFavoriteProperties.forEach(item => {
    grid.appendChild(createFavoriteCard(item));
  });

  updateFavoriteSummary();
}

function createFavoriteCard(item) {
  const propertyName = item.building_name || item.title || "매물";
  const apartmentImagePath = getApartmentImagePath(item);
  const card = document.createElement("article");

  card.className = "favorite-card";
  card.tabIndex = 0;
  card.setAttribute("role", "link");
  card.setAttribute("aria-label", `${propertyName} 지도에서 보기`);
  card.dataset.propertyId = item.id;
  card.innerHTML = `
    <div class="favorite-card-media">
      <img src="${escapeHtml(apartmentImagePath)}"
           alt="${escapeHtml(propertyName)} 대표 사진"
           loading="lazy"
           decoding="async">
      <span class="favorite-card-watermark" aria-hidden="true">SAMPLE</span>
      <button class="favorite-card-toggle is-active"
              type="button"
              aria-label="관심 매물에서 삭제"
              aria-pressed="true"
              title="관심 매물에서 삭제">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21S4 16.5 4 9.5A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8 3.5C20 16.5 12 21 12 21Z"/>
        </svg>
      </button>
    </div>
    <div class="favorite-card-body">
      <p class="favorite-card-type">${escapeHtml(item.property_type || "아파트")}</p>
      <h2 class="favorite-card-title">${escapeHtml(propertyName)}</h2>
      <p class="favorite-card-price">${escapeHtml(formatPrice(item.sale_price))}</p>
      <p class="favorite-card-meta">
        ${escapeHtml(formatPropertyMeta(item))}
      </p>
      <p class="favorite-card-address">${escapeHtml(item.address || "")}</p>
    </div>
  `;

  const toggle = card.querySelector(".favorite-card-toggle");
  syncCardFavoriteToggle(toggle, item.id);

  toggle.addEventListener("click", event => {
    event.stopPropagation();
    toggleFavoriteProperty(item.id);
    syncCardFavoriteToggle(toggle, item.id);
    updateFavoriteSummary();
  });

  card.addEventListener("click", () => openPropertyOnMap(item.id));
  card.addEventListener("keydown", event => {
    if (event.target !== card) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openPropertyOnMap(item.id);
  });

  return card;
}

function toggleFavoriteProperty(propertyId) {
  const normalizedId = String(propertyId);

  if (favoritePropertyIds.has(normalizedId)) {
    favoritePropertyIds.delete(normalizedId);
  } else {
    favoritePropertyIds.add(normalizedId);
  }

  saveFavoritePropertyIds();
}

function syncCardFavoriteToggle(button, propertyId) {
  const isFavorite = favoritePropertyIds.has(String(propertyId));
  const label = isFavorite ? "관심 매물에서 삭제" : "관심 매물에 추가";

  button.classList.toggle("is-active", isFavorite);
  button.setAttribute("aria-pressed", String(isFavorite));
  button.setAttribute("aria-label", label);
  button.title = label;
}

function updateFavoriteSummary() {
  const summary = document.getElementById("favoriteSummary");
  const favoriteCount = allFavoritePageProperties.filter(item => (
    favoritePropertyIds.has(item.id)
  )).length;

  summary.innerHTML = `총 <strong>${favoriteCount.toLocaleString()}개</strong>의 관심목록이 있습니다.`;
}

function openPropertyOnMap(propertyId) {
  const mapUrl = new URL("../property/map.html", window.location.href);
  mapUrl.searchParams.set("property_id", String(propertyId));
  window.location.href = mapUrl.href;
}

function handleFavoriteStorageChange(event) {
  if (event.key !== FAVORITE_PROPERTY_STORAGE_KEY && event.key !== null) return;

  favoritePropertyIds = loadFavoritePropertyIds();
  rebuildFavoriteCards();
}

function getStableImageIndex(item, length, salt = "") {
  if (!length) return 0;

  const seed = `${item?.id || ""}|${item?.building_name || ""}|${salt}`;
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % length;
}

function getApartmentImagePath(item) {
  const imageNumber = getStableImageIndex(item, APARTMENT_IMAGE_COUNT, "apartment") + 1;
  const filename = `apartment_${String(imageNumber).padStart(3, "0")}.jpg`;

  return `${PROPERTY_IMAGE_BASE_PATH}/이미지/${filename}`;
}

function formatPropertyMeta(item) {
  const parts = [
    item.exclusive_area ? `${item.exclusive_area}㎡` : "",
    item.floor ? `${item.floor}층` : "",
    item.built_year ? `${item.built_year}년 준공` : ""
  ].filter(Boolean);

  return parts.join(" · ");
}

function formatPrice(price) {
  if (!price || Number.isNaN(Number(price))) return "가격 정보 없음";

  const numericPrice = Number(price);
  const eok = Math.floor(numericPrice / 100000000);
  const man = Math.floor((numericPrice % 100000000) / 10000);

  if (eok > 0 && man > 0) return `${eok}억 ${man.toLocaleString()}만`;
  if (eok > 0) return `${eok}억`;
  return `${man.toLocaleString()}만`;
}

function showFavoriteLoadError() {
  const grid = document.getElementById("favoriteGrid");
  const empty = document.getElementById("favoriteEmpty");

  grid.innerHTML = "";
  empty.hidden = false;
  empty.querySelector("h2").textContent = "관심목록을 불러오지 못했습니다";
  empty.querySelector("p").textContent = "잠시 후 페이지를 다시 열어 주세요.";
  updateFavoriteSummary();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
