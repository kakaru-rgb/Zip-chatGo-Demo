const mapRecenter = document.getElementById("mapRecenter");
const propertyInfo = document.getElementById("propertyInfo");

let activeHome = 0;
let liveMap;

    liveMap = new naver.maps.Map("liveMap", {
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

new naver.maps.Marker({
    position: new naver.maps.LatLng(37.5446,127.0556),
    map: liveMap
});

liveMap.panTo(
    new naver.maps.LatLng(37.5483,127.0447)
);

const recommendedHomes = [
  { name: "성수 리버뷰 84㎡", price: "매매 12.8억", lat: 37.5446, lng: 127.0556, pick: true },
  { name: "서울숲 더시티 59㎡", price: "전세 7.2억", lat: 37.5483, lng: 127.0447 },
  { name: "뚝섬 파크힐 74㎡", price: "매매 10.4억", lat: 37.5385, lng: 127.0584 }
];

const focusHome = (home, index, animate = true) => {
    activeHome = index;
    propertyInfo.textContent = `AI가 선택한 추천 매물 · ${home.name} · ${home.price}`;
    liveMap.panTo(new naver.maps.LatLng(home.lat, home.lng));
    liveMap.setZoom(home.pick ? 16 : 15.5);
};

recommendedHomes.forEach((home, index) => {
    const marker = new naver.maps.Marker({
        position: new naver.maps.LatLng(home.lat, home.lng),
        map: liveMap,
        title: `${home.name} - ${home.price}`
    });

    naver.maps.Event.addListener(marker, 'click', () => focusHome(home, index));
});

mapRecenter?.addEventListener("click", () => focusHome(recommendedHomes[activeHome], activeHome));
setInterval(() => {
    const next = (activeHome + 1) % recommendedHomes.length;
    focusHome(recommendedHomes[next], next);
}, 9000);
