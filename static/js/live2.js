const propertyInfo = document.getElementById('propertyInfo');
const recommendationList = document.getElementById('recommendationList');
const mapRecenter = document.getElementById('mapRecenter');

let activeIndex = 0;
let homes = [];
let markers = [];
let liveMap;

function formatPrice(value) {
  const price = Number(value || 0);
  if (!price) return '가격 협의';
  const eok = Math.floor(price / 100000000);
  const remainder = Math.round((price % 100000000) / 10000);
  return remainder ? `매매 ${eok}억 ${remainder.toLocaleString()}만 원` : `매매 ${eok}억 원`;
}

function focusHome(index) {
  const home = homes[index];
  if (!home) return;
  activeIndex = index;
  propertyInfo.textContent = `AI 추천 ${index + 1}순위 · ${home.building_name} · ${formatPrice(home.sale_price)}`;
  liveMap.panTo(new naver.maps.LatLng(home.latitude, home.longitude));
  liveMap.setZoom(index === 0 ? 15 : 14);
  document.querySelectorAll('[data-property-index]').forEach((card) => {
    card.classList.toggle('active', Number(card.dataset.propertyIndex) === index);
  });
}

function renderRecommendationCards() {
  recommendationList.innerHTML = homes.map((home, index) => `
    <button class="recommendation-card" type="button" data-property-index="${index}">
      <span class="recommendation-rank">${index + 1}</span>
      <strong>${escapeHtml(home.building_name)}</strong>
      <span>${formatPrice(home.sale_price)}</span>
      <small>${Number(home.exclusive_area || 0).toFixed(1)}㎡ · ${home.floor || '-'}층</small>
    </button>
  `).join('');
  document.querySelectorAll('[data-property-index]').forEach((card) => {
    card.addEventListener('click', () => focusHome(Number(card.dataset.propertyIndex)));
  });
}

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

async function loadRecommendations() {
  try {
    const response = await fetch('/api/live/recommendations');
    const data = await response.json();
    if (!response.ok || !data.ok || data.recommendations.length !== 3) throw new Error('추천 매물을 불러오지 못했습니다.');
    homes = data.recommendations;
    homes.forEach((home, index) => {
      const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(home.latitude, home.longitude),
        map: liveMap,
        title: `${index + 1}. ${home.building_name}`
      });
      naver.maps.Event.addListener(marker, 'click', () => focusHome(index));
      markers.push(marker);
    });
    renderRecommendationCards();
    focusHome(0);
  } catch (error) {
    console.error(error);
    propertyInfo.textContent = '추천 매물을 불러오지 못했습니다. 서버 실행 상태를 확인해 주세요.';
    recommendationList.innerHTML = '<p class="recommendation-error">추천 매물 조회에 실패했습니다.</p>';
  }
}

function initializeMap() {
  liveMap = new naver.maps.Map('liveMap', {
    center: new naver.maps.LatLng(37.38, 127.11),
    zoom: 13,
    zoomControl: true,
    zoomControlOptions: { position: naver.maps.Position.RIGHT_BOTTOM, style: naver.maps.ZoomControlStyle.SMALL }
  });
  loadRecommendations();
}

mapRecenter.addEventListener('click', () => focusHome(activeIndex));
initializeMap();
