const mapRecenter = document.getElementById('mapRecenter');
const propertyInfo = document.getElementById('propertyInfo');
const propertyVideoModal = document.getElementById('propertyVideoModal');
const propertyYoutube = document.getElementById('propertyYoutube');
const propertyVideoTitle = document.getElementById('propertyVideoTitle');
const propertyVideoClose = document.getElementById('propertyVideoClose');
const propertyVideoBackdrop = document.getElementById('propertyVideoBackdrop');

let activeHome = 0;

const liveMap = new naver.maps.Map('liveMap', {
  center: new naver.maps.LatLng(37.5446, 127.0556),
  zoom: 15,
  zoomControl: true,
  zoomControlOptions: {
    position: naver.maps.Position.RIGHT_BOTTOM,
    style: naver.maps.ZoomControlStyle.SMALL
  },
  draggable: true,
  scrollWheel: true,
  disableDoubleClickZoom: false
});

const recommendedHomes = [
  { name: '성수 리버뷰 84㎡', price: '매매 12.8억', lat: 37.5446, lng: 127.0556, pick: true, youtubeId: '2NpswwcViDE' },
  { name: '서울숲 시티뷰 59㎡', price: '전세 7.2억', lat: 37.5483, lng: 127.0447, youtubeId: 'nD4g9J7o-Yc' },
  { name: '왕십리 파크뷰 74㎡', price: '매매 10.4억', lat: 37.5385, lng: 127.0584, youtubeId: 'skvgwoCisMU' }
];

function focusHome(home, index) {
  activeHome = index;
  propertyInfo.textContent = `AI 추천 매물 · ${home.name} · ${home.price}`;
  liveMap.panTo(new naver.maps.LatLng(home.lat, home.lng));
  liveMap.setZoom(home.pick ? 16 : 15.5);
}

function openPropertyVideo(home) {
  propertyVideoTitle.textContent = `${home.name} 영상`;
  propertyYoutube.src = `https://www.youtube.com/embed/${home.youtubeId}?autoplay=1&rel=0`;
  propertyVideoModal.hidden = false;
  propertyVideoModal.setAttribute('aria-hidden', 'false');
  propertyVideoClose.focus();
}

function closePropertyVideo() {
  propertyYoutube.src = '';
  propertyVideoModal.hidden = true;
  propertyVideoModal.setAttribute('aria-hidden', 'true');
}

recommendedHomes.forEach((home, index) => {
  const marker = new naver.maps.Marker({
    position: new naver.maps.LatLng(home.lat, home.lng),
    map: liveMap,
    title: `${home.name} - ${home.price}`
  });

  naver.maps.Event.addListener(marker, 'click', () => {
    focusHome(home, index);
    openPropertyVideo(home);
  });
});

mapRecenter?.addEventListener('click', () => focusHome(recommendedHomes[activeHome], activeHome));
propertyVideoClose?.addEventListener('click', closePropertyVideo);
propertyVideoBackdrop?.addEventListener('click', closePropertyVideo);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !propertyVideoModal.hidden) closePropertyVideo();
});

focusHome(recommendedHomes[0], 0);
setInterval(() => {
  const next = (activeHome + 1) % recommendedHomes.length;
  focusHome(recommendedHomes[next], next);
}, 9000);
