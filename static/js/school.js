const schoolData= {
  "강남구": {
    count:[32,
    24,
    21],
    walk:9,
    infra:286,
    score:96,
    price:248000,
    traits:'학원가·교육 선택 폭',
    bars:[98,
    91,
    94,
    88]
  },
  "서초구": {
    count:[24,
    16,
    15],
    walk:10,
    infra:184,
    score:94,
    price:231000,
    traits:'안정적인 교육환경',
    bars:[95,
    92,
    88,
    90]
  },
  "송파구": {
    count:[40,
    27,
    19],
    walk:9,
    infra:168,
    score:91,
    price:176000,
    traits:'학교·주거 균형',
    bars:[92,
    90,
    91,
    87]
  },
  "마포구": {
    count:[25,
    15,
    13],
    walk:11,
    infra:129,
    score:86,
    price:142000,
    traits:'도심 접근·생활편의',
    bars:[84,
    87,
    92,
    82]
  },
  "성동구": {
    count:[22,
    14,
    10],
    walk:12,
    infra:112,
    score:84,
    price:158000,
    traits:'신축 주거·접근성',
    bars:[82,
    84,
    91,
    79]
  },
  "광진구": {
    count:[21,
    13,
    12],
    walk:11,
    infra:105,
    score:85,
    price:126000,
    traits:'대학가·교육 인프라',
    bars:[86,
    83,
    85,
    84]
  },
  "강동구": {
    count:[34,
    20,
    15],
    walk:10,
    infra:98,
    score:87,
    price:119000,
    traits:'신축·쾌적한 통학',
    bars:[88,
    89,
    84,
    87]
  }
};
const schoolNames= {
  "강남구":['대치중학교',
  '도곡중학교',
  '휘문중학교'],
  "서초구":['서초중학교',
  '반포중학교',
  '신동중학교'],
  "송파구":['잠실중학교',
  '신천중학교',
  '가락중학교'],
  "마포구":['성산중학교',
  '상암중학교',
  '동도중학교'],
  "성동구":['경일중학교',
  '광희중학교',
  '무학중학교'],
  "광진구":['광장중학교',
  '양진중학교',
  '광남중학교'],
  "강동구":['고덕중학교',
  '강명중학교',
  '명일중학교']
};
const $=s=>document.querySelector(s),regionEl=$('#regionFilter'),regions=Object.keys(schoolData),levels= {
  elementary:['초등학교',
  0],
  middle:['중학교',
  1],
  high:['고등학교',
  2]
};
regions.forEach(r=>regionEl.add(new Option(r,r)));
regionEl.value='송파구';
function money(v) {
  const e=Math.floor(v/10000),
  m=v%10000;
  return m ? `${e}억 ${m.toLocaleString()}만원` : `${e}억원`
}
function update() {
  const name=regionEl.value,
  d=schoolData[name],
  [level,
  index]=levels[$('#schoolLevel').value],
  distance=Number($('#distanceFilter').value),
  ratio=$('#areaFilter').value==='59'?.73:$('#areaFilter').value==='114'?1.31:1,
  count=Math.round(d.count[index]*distance/15),
  score=Math.min(99,Math.round(d.score+(distance-15)*.2));
  $('#schoolCount').textContent=`${count}개`;
  $('#levelText').textContent=`${level} · 도보 ${distance}분 범위`;
  $('#walkTime').textContent=`약 ${d.walk}분`;
  $('#walkText').textContent=d.walk<=10?'통학 접근 우수':'통학로 확인 권장';
  $('#academyCount').textContent=`${Math.round(d.infra*distance/15)}곳`;
  $('#educationScore').textContent=`${score}점`;
  $('#scoreText').textContent=score>=90?'교육환경 매우 우수':'교육환경 우수';
  $('#balanceRegion').textContent=name;
  $('#housingPrice').textContent=money(Math.round(d.price*ratio));
  $('#pricePremium').textContent=`서울 주요 지역 평균 대비 ${d.price>155000?'높은':'합리적인'} 주거비`;
  $('#schoolInsight').textContent=`${name}은 ${d.traits}이 강점입니다. 평균 통학시간은 ${d.walk}분이며, 집을 정하기 전 실제 배정 학교와 통학로를 확인하는 것이 좋습니다.`;
  renderBars(d.bars);
  renderCards(name,level,d.walk);
  renderTable();
  tick()
}
function renderBars(values) {
  const names=['학교 접근성',
  '통학로 환경',
  '생활 편의',
  '교육 선택 폭'];
  $('#educationBars').innerHTML=names.map((n,i)=>`<div><p><span>${n}</span><b>${values[i]}점</b></p><div><i style="width:${values[i]}%"></i></div></div>`).join('')
}
function renderCards(region,level,walk) {
  const names=schoolNames[region].map(n=>n.replace('중학교',level));
  $('#schoolCards').innerHTML=names.map((n,i)=>`<article><span class="school-distance"><i class="ti ti-walk"></i> 도보 ${walk+i*2}분</span><i class="ti ti-school"></i><h3>${n}</h3><p>학생 수 ${620+i*145}명 · 학급당 ${23+i}명</p><div><span>통학 안전</span><b>${i===2?'보통':'우수'}</b></div></article>`).join('')
}
function renderTable() {
  const q=$('#regionSearch').value.trim(),
  [,
  idx]=levels[$('#schoolLevel').value];
  $('#schoolTableBody').innerHTML=regions.filter(r=>!q||r.includes(q)).sort((a,b)=>schoolData[b].score-schoolData[a].score).map(r=> {
    const d=schoolData[r]; return `<tr><td><b>${r}</b></td><td>${d.count[idx]}개</td><td>도보 ${d.walk}분</td><td>${d.infra}곳</td><td><strong>${money(d.price)}</strong></td><td><span class="score-chip">${d.score}점</span></td><td>${d.traits}</td></tr>`
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
