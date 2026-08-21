const flowData= {
  "강남구":[["송파구",
  1240,
  18.4,
  176000,
  "생활 인프라"],
  ["성동구",
  980,
  22.1,
  158000,
  "직주근접"],
  ["마포구",
  760,
  14.8,
  142000,
  "가격 경쟁력"],
  ["서초구",
  690,
  8.3,
  231000,
  "학군 환경"],
  ["강동구",
  610,
  19.2,
  119000,
  "신축 단지"]],
  "마포구":[["은평구",
  1180,
  24.5,
  98000,
  "가격 경쟁력"],
  ["서대문구",
  970,
  17.2,
  112000,
  "생활권 유사"],
  ["성동구",
  840,
  20.4,
  158000,
  "직주근접"],
  ["영등포구",
  710,
  13.8,
  105000,
  "교통 접근"],
  ["송파구",
  590,
  9.1,
  176000,
  "교육 환경"]],
  "송파구":[["강동구",
  1380,
  26.1,
  119000,
  "신축 단지"],
  ["성남시",
  1050,
  18.7,
  132000,
  "가격 경쟁력"],
  ["광진구",
  780,
  14.3,
  126000,
  "교통 접근"],
  ["강남구",
  730,
  11.6,
  248000,
  "학군 환경"],
  ["하남시",
  680,
  21.9,
  101000,
  "주거 쾌적성"]],
  "용산구":[["마포구",
  930,
  19.5,
  142000,
  "직주근접"],
  ["성동구",
  870,
  21.4,
  158000,
  "생활 인프라"],
  ["영등포구",
  650,
  12.8,
  105000,
  "가격 경쟁력"],
  ["서대문구",
  590,
  10.2,
  112000,
  "교통 접근"],
  ["강남구",
  520,
  8.7,
  248000,
  "자산 가치"]],
  "성동구":[["광진구",
  1020,
  23.2,
  126000,
  "가격 경쟁력"],
  ["송파구",
  890,
  17.6,
  176000,
  "생활 인프라"],
  ["마포구",
  750,
  15.1,
  142000,
  "직주근접"],
  ["동대문구",
  640,
  20.8,
  93000,
  "신축 단지"],
  ["강남구",
  570,
  9.4,
  248000,
  "업무 접근"]]
};
const $=s=>document.querySelector(s),originEl=$("#originRegion"),origins=Object.keys(flowData);
origins.forEach(r=>originEl.add(new Option(r,r)));
originEl.value="송파구";
const positions=[[18,
22],
[82,
24],
[17,
78],
[83,
76],
[50,
10]];
function money(v) {
  const e=Math.floor(v/10000),
  m=v%10000;
  return m ? `${e}억 ${m.toLocaleString()}만원` : `${e}억원`
}
function adjustedRows() {
  const housing=$("#housingFilter").value,
  age=$("#ageFilter").value,
  period=Number($("#periodFilter").value),
  hm=housing==='officetel'?.72:housing==='villa'?.81:1,
  am=age==='2030'?1.12:age==='4050'?1.05:age==='60'?.83:1,
  pm=period/30;
  return flowData[originEl.value].map(r=>[r[0],Math.round(r[1]*hm*am*pm),r[2],Math.round(r[3]*(housing==='officetel'?.48:housing==='villa'?.64:1)),r[4]])
}
function update() {
  const rows=adjustedRows(),
  total=rows.reduce((s,r)=>s+r[1],0),
  top=rows[0],
  focus=Math.round(top[1]/total*100),
  avgGap=Math.round(rows.reduce((s,r)=>s+r[3],0)/rows.length-156000);
  $("#totalMoves").textContent=`${total.toLocaleString()}회`;
  $("#moveChange").innerHTML=`<span class="up">▲ ${top[2]}%</span> 이전 기간 대비`;
  $("#topDestination").textContent=top[0];
  $("#topShare").textContent=`전체 이동의 ${focus}%`;
  $("#budgetGap").textContent=`${Math.abs(avgGap/10000).toFixed(1)}억원`;
  $("#budgetText").textContent=avgGap<0?'이동 지역 평균 예산 절감':'이동 지역 평균 예산 증가';
  $("#flowIndex").textContent=`${focus+48}점`;
  $("#flowText").textContent=focus>25?'상위 지역 집중':'관심 지역 분산';
  $("#trendLegend").textContent=`${originEl.value} 출발`;
  $("#flowInsight").textContent=`${originEl.value} 관심 사용자는 ${top[0]}으로 가장 많이 이동했습니다. 주요 이유는 ${top[4]}이며, 이전 기간보다 관심이 ${top[2]}% 증가했습니다.`;
  renderMap(rows);
  renderRanking(rows,total);
  renderChart(rows);
  renderReasons(rows);
  renderTable(rows);
  tick()
}
function renderMap(rows) {
  $("#originNode").innerHTML=`<div>${originEl.value}<small>출발 지역</small></div>`;
  $("#destinationNodes").innerHTML=rows.map((r,i)=>`<div class="destination-node" style="left:${positions[i][0]}%;top:${positions[i][1]}%"><div>${r[0]}<small>${r[1].toLocaleString()}회</small></div></div>`).join('');
  $("#flowSvg").setAttribute('viewBox','0 0 100 100');
  $("#flowSvg").innerHTML=rows.map((r,i)=>`<path class="flow-line ${i%2?'alt':''}" d="M50 50 Q${(50+positions[i][0])/2+(i%2?8:-8)} ${(50+positions[i][1])/2} ${positions[i][0]} ${positions[i][1]}" stroke-width="${Math.max(1.2,4-i*.55)}"/>`).join('')
}
function renderRanking(rows,total) {
  $("#flowRanking").innerHTML=rows.map((r,i)=>`<div class="flow-rank-item"><b>${i+1}</b><span>${r[0]}<small>${r[1].toLocaleString()}회 · 점유 ${Math.round(r[1]/total*100)}%</small></span><strong>+${r[2]}%</strong></div>`).join('')
}
function renderChart(rows) {
  const svg=$("#flowChart"),
  w=760,
  h=300,
  p=42,
  days=Number($("#periodFilter").value),
  count=Math.min(days,30),
  base=rows.reduce((s,r)=>s+r[1],0)/count,
  arr=Array.from( {
    length:count
  },(_,i)=>Math.round(base*(.76+i/count*.25+Math.sin(i*1.7)*.09))),
  max=Math.max(...arr)*1.15,
  pts=arr.map((v,i)=>`${p+i*(w-p*2)/(arr.length-1)},${h-p-v/max*(h-p*2)}`).join(' ');
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svg.innerHTML=`<g class="grid">${[0,1,2,3,4].map(i=>{const y=p+i*(h-p*2)/4;return `<line x1="${p}" y1="${y}" x2="${w-p}" y2="${y}"/><text x="5" y="${y+4}">${Math.round(max-i*max/4)}</text>`}).join('')}</g><polyline class="line base" points="${pts}"/>`
}
function renderReasons(rows) {
  $("#reasonList").innerHTML=rows.slice(0,3).map(r=>`<p><i class="ti ti-circle-check"></i><span><strong>${r[0]}</strong> · ${r[4]}</span></p>`).join('')
}
function renderTable(rows=adjustedRows()) {
  const q=$("#regionSearch").value.trim(),
  list=rows.filter(r=>!q||r[0].includes(q));
  $("#flowTableBody").innerHTML=list.map((r,i)=>`<tr><td><b>${i+1}</b></td><td><strong>${r[0]}</strong></td><td>${r[1].toLocaleString()}회</td><td class="up">▲ ${r[2]}%</td><td>${money(r[3])}</td><td>${r[4]}</td><td><span class="score-chip">높음</span></td></tr>`).join('');
  $("#emptyRegions").hidden=list.length>0
}
function tick() {
  $("#updatedAt").textContent=new Date().toLocaleTimeString('ko-KR', {
    hour12:false
  })
}
$("#analyzeBtn").addEventListener('click',update);
$("#regionSearch").addEventListener('input',()=>renderTable());
update();
setInterval(tick,1000);
