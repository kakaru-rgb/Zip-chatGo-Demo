const trafficData= {
  "강남구": {
    base:16,
    walk:7,
    transfer:0,
    score:96,
    line:'2호선',
    projects:[['위례신사선',
    '계획',
    '강남권 남북 연결'],
    ['GTX-C',
    '공사',
    '삼성역 광역 접근']]
  },
  "송파구": {
    base:28,
    walk:9,
    transfer:1,
    score:89,
    line:'2·8·9호선',
    projects:[['위례신사선',
    '계획',
    '위례·신사 연결'],
    ['GTX-A',
    '개통 단계',
    '수서 광역 접근']]
  },
  "마포구": {
    base:37,
    walk:8,
    transfer:1,
    score:91,
    line:'2·5·6호선',
    projects:[['서부선',
    '계획',
    '새절·서울대 연결'],
    ['대장홍대선',
    '설계',
    '서부권 광역 연결']]
  },
  "성동구": {
    base:24,
    walk:8,
    transfer:1,
    score:92,
    line:'2·3·분당선',
    projects:[['동북선',
    '공사',
    '왕십리 연계'],
    ['GTX-C',
    '공사',
    '왕십리 광역 접근']]
  },
  "강동구": {
    base:42,
    walk:10,
    transfer:1,
    score:82,
    line:'5·8호선',
    projects:[['9호선 4단계',
    '공사',
    '강남 접근 개선'],
    ['세종포천고속도로',
    '개통 단계',
    '차량 접근 개선']]
  },
  "용산구": {
    base:31,
    walk:7,
    transfer:1,
    score:95,
    line:'1·4·경의중앙선',
    projects:[['신분당선 연장',
    '계획',
    '강남 연결 강화'],
    ['GTX-B',
    '착공 준비',
    '수도권 광역 연결']]
  }
};
const $=s=>document.querySelector(s),regionEl=$('#regionFilter'),regions=Object.keys(trafficData),destNames= {
  gangnam:'강남역',
  yeouido:'여의도',
  gwanghwamun:'광화문',
  pangyo:'판교'
};
regions.forEach(r=>regionEl.add(new Option(r,r)));
regionEl.value='송파구';
function getTime(r) {
  const d=trafficData[r],
  dest=$('#destination').value,
  mode=$('#transportType').value,
  time=$('#departTime').value,
  dm= {
    gangnam:1,
    yeouido:1.25,
    gwanghwamun:1.18,
    pangyo:1.35
  }
  [dest],
  mm=mode==='car'?.82:1,
  tm=time==='peak'?1.18:time==='weekend'?.86:1;
  return Math.round(d.base*dm*mm*tm)
}
function update() {
  const name=regionEl.value,
  d=trafficData[name],
  time=getTime(name),
  mode=$('#transportType').value,
  score=Math.max(55,d.score-(time-30)*.35);
  $('#travelTime').textContent=`약 ${time}분`;
  $('#timeCompare').textContent=time<=30?'30분 생활권':'혼잡시간 여유 필요';
  $('#transferCount').textContent=mode==='car'?'해당 없음':`${d.transfer}회`;
  $('#routeText').textContent=mode==='car'?'실시간 도로 기준':d.line;
  $('#stationAccess').textContent=`도보 ${d.walk}분`;
  $('#trafficScore').textContent=`${Math.round(score)}점`;
  $('#scoreText').textContent=score>=90?'접근성 매우 우수':score>=80?'접근성 우수':'보통';
  $('#ringScore').textContent=Math.round(score);
  $('#trafficRing').style.setProperty('--score',`${score}%`);
  $('#routeTitle').textContent=`${name} → ${destNames[$('#destination').value]}`;
  $('#trafficInsight').textContent=`${name}에서 ${destNames[$('#destination').value]}까지 ${mode==='car'?'자동차':'대중교통'}으로 약 ${time}분이 예상됩니다. 역 접근은 평균 도보 ${d.walk}분이며 ${d.line} 이용이 편리합니다.`;
  renderRoute(name,d,time);
  renderProjects(d.projects);
  renderTable();
  tick()
}
function renderRoute(name,d,time) {
  const stops=$('#transportType').value==='car'?[name,
  '주요 간선도로',
  destNames[$('#destination').value]]:[name,
  d.line,
  d.transfer?'환승역':'직통',
  destNames[$('#destination').value]];
  $('#routeLine').innerHTML=stops.map((s,i)=>`<div><i class="ti ${i===0?'ti-home':i===stops.length-1?'ti-flag':'ti-train'}"></i><strong>${s}</strong><span>${i===stops.length-1?`${time}분 도착`:`구간 ${i+1}`}</span></div>`).join('<b><i class="ti ti-chevron-right"></i></b>')
}
function renderProjects(list) {
  $('#projectGrid').innerHTML=list.map((p,i)=>`<article><span class="project-stage stage-${i}">${p[1]}</span><i class="ti ti-train"></i><h3>${p[0]}</h3><p>${p[2]}</p><div class="project-progress"><i style="width:${i?58:36}%"></i></div><small>일정은 관계기관 발표에 따라 변경될 수 있습니다.</small></article>`).join('')
}
function renderTable() {
  const q=$('#regionSearch').value.trim(),
  dest=destNames[$('#destination').value];
  $('#trafficTableBody').innerHTML=regions.filter(r=>!q||r.includes(q)).sort((a,b)=>getTime(a)-getTime(b)).map(r=> {
    const d=trafficData[r]; return `<tr><td><b>${r}</b></td><td>${dest}</td><td><strong>${getTime(r)}분</strong></td><td>${$('#transportType').value==='car'?'-':d.transfer+'회'}</td><td>도보 ${d.walk}분</td><td><span class="score-chip">${d.score}점</span></td><td>${d.line}</td></tr>`
  }).join('')
}
function tick() {
  $('#updatedAt').textContent=new Date().toLocaleTimeString('ko-KR', {
    hour12:false
  })
}
$('#analyzeBtn').addEventListener('click',update);
$('#regionSearch').addEventListener('input',renderTable);
update();
setInterval(tick,1000);
