document.addEventListener('DOMContentLoaded', () => {
  const scenes = [
    { title: '마스터 침실', subtitle: '고요한 아침을 위한 가장 사적인 공간', image: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=85' },
    { title: '라운지 거실', subtitle: '빛과 여유가 머무는 가족의 중심', image: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85' },
    { title: '다이닝 키친', subtitle: '매일의 식사가 더 특별해지는 곳', image: '/static/images/주방사진2.jpg' },
    { title: '프라이빗 배스', subtitle: '호텔 스파처럼 편안한 휴식의 순간', image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1200&q=85' },
    { title: '스마트 평면', subtitle: '침실·드레스룸·팬트리까지 세심하게 연결한 프리미엄 공간 설계', image: 'https://home.sarangbang.com/v2/thumb/thumb.php?date=1774316744&src=%2Fdistrib%2F669%2F84.885acre.jpg&type=linead&w=1200' },
    { title: '랜드마크 뷰', subtitle: '도시의 새로운 기준이 되는 프리미엄 단지', image: '/static/images/building1.png' },
    { title: '그린 산책로', subtitle: '꽃과 나무 사이로 이어지는 단지 안의 산책길', image: 'https://unsplash.com/photos/5PHjo1TFzsw/download?force=true&w=1200' }
  ];
  const current = document.querySelector('#sceneCurrent'), next = document.querySelector('#sceneNext');

  const title = document.querySelector('#sceneTitle'), subtitle = document.querySelector('#sceneSubtitle'), number = document.querySelector('#sceneNumber');

  const progress = document.querySelector('#sceneProgress'), dots = document.querySelector('#sceneDots'), plan = document.querySelector('#floorplanOverlay');
  
  let index = 0, timer;
  scenes.forEach((scene, i) => { const dot = document.createElement('button'); dot.type = 'button'; dot.setAttribute('aria-label', `${scene.title} 보기`); dot.addEventListener('click', () => setScene(i)); dots.append(dot); });
  function restartProgress() { progress.classList.remove('running'); void progress.offsetWidth; progress.classList.add('running'); }
  function setScene(nextIndex) {
    index = (nextIndex + scenes.length) % scenes.length; const scene = scenes[index];
    next.style.backgroundImage = `url("${scene.image}")`; next.classList.add('visible');
    window.setTimeout(() => { current.style.backgroundImage = `url("${scene.image}")`; current.classList.remove('zoom'); void current.offsetWidth; current.classList.add('zoom'); next.classList.remove('visible'); }, 680);
    title.textContent = scene.title; subtitle.textContent = scene.subtitle; number.textContent = `${String(index + 1).padStart(2, '0')} — 07`;
    plan.classList.toggle('active', Boolean(scene.plan)); [...dots.children].forEach((dot, i) => dot.classList.toggle('active', i === index));
    clearInterval(timer); restartProgress(); timer = setInterval(() => setScene(index + 1), 4600);
  }
  
  document.querySelector('#prevScene').addEventListener('click', () => setScene(index - 1)); document.querySelector('#nextScene').addEventListener('click', () => setScene(index + 1));
  current.style.backgroundImage = `url("${scenes[0].image}")`; setScene(0);
});
