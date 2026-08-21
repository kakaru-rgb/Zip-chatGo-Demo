const $=s=>document.querySelector(s),products=[['집찾은행',
'혼합형',
3.62,
4.82,
'1.2%',
'40년',
'금융채 5년 기준'],
['고홈은행',
'고정형',
3.78,
4.65,
'1.0%',
'30년',
'상환액 고정'],
['우리집은행',
'변동형',
3.45,
5.05,
'1.4%',
'40년',
'신규 코픽스 연동'],
['안심주택기금',
'정책형',
2.85,
3.95,
'면제 조건',
'30년',
'소득·주택가액 요건']];
function payment(principal,annual,years,type='equal') {
  const r=annual/100/12,
  n=years*12;
  if(type==='principal')return principal/n+principal*r;
  return principal*r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1)
}
function update() {
  const amount=Number($('#loanAmount').value)*10000,
  years=Number($('#loanYears').value),
  type=$('#rateType').value,
  repay=$('#repayment').value,
  rate= {
    fixed:3.78,
    mixed:3.62,
    variable:3.45
  }
  [type],
  monthly=payment(amount,rate,years,repay),
  stress=payment(amount,rate+1,years,repay)-monthly,
  total=repay==='equal'?monthly*years*12-amount:amount*(rate/100/12)*(years*12+1)/2,
  score=Math.min(95,Math.round(35+rate*9+years/3));
  $('#appliedRate').textContent=`연 ${rate.toFixed(2)}%`;
  $('#monthlyPayment').textContent=`${Math.round(monthly/10000).toLocaleString()}만원`;
  $('#paymentNote').textContent=`${years}년 · ${repay==='equal'?'원리금균등':'원금균등'} 기준`;
  $('#totalInterest').textContent=`${Math.round(total/100000000*10)/10}억원`;
  $('#interestRatio').textContent=`대출원금의 ${Math.round(total/amount*100)}%`;
  $('#stressPayment').textContent=`+${Math.round(stress/10000).toLocaleString()}만원`;
  $('#burdenScore').textContent=score;
  $('#burdenRing').style.setProperty('--score',`${score}%`);
  $('#rateInsight').textContent=`현재 조건의 첫 달 상환액은 약 ${Math.round(monthly/10000)}만원입니다. 금리가 1%p 오르면 매달 약 ${Math.round(stress/10000)}만원이 추가되므로 여유자금을 포함해 예산을 잡으세요.`;
  renderTable(amount,years);
  tick()
}
function renderTable(amount,years) {
  $('#loanTableBody').innerHTML=products.map(p=>`<tr><td><b>${p[0]}</b></td><td>${p[1]}</td><td><strong>${p[2].toFixed(2)}~${p[3].toFixed(2)}%</strong></td><td>${p[4]}</td><td>${p[5]}</td><td>${Math.round(payment(amount,p[2],Math.min(years,parseInt(p[5])))/10000).toLocaleString()}만원</td><td><span class="contract-tag">${p[6]}</span></td></tr>`).join('')
}
function chart() {
  const a=[4.28,
  4.21,
  4.08,
  3.96,
  3.88,
  3.82,
  3.75,
  3.71,
  3.69,
  3.66,
  3.64,
  3.62],
  b=[4.12,
  4.05,
  3.91,
  3.79,
  3.7,
  3.62,
  3.57,
  3.52,
  3.49,
  3.47,
  3.46,
  3.45],
  svg=$('#rateChart'),
  w=760,
  h=300,
  p=42,
  min=3,
  max=4.6,
  pts=x=>x.map((v,i)=>`${p+i*(w-p*2)/(x.length-1)},${h-p-(v-min)/(max-min)*(h-p*2)}`).join(' ');
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svg.innerHTML=`<g class="grid">${[0,1,2,3,4].map(i=>{const y=p+i*(h-p*2)/4;return `<line x1="${p}" y1="${y}" x2="${w-p}" y2="${y}"/><text x="5" y="${y+4}">${(max-i*(max-min)/4).toFixed(1)}%</text>`}).join('')}</g><polyline class="line base" points="${pts(a)}"/><polyline class="line compare" points="${pts(b)}"/>`
}
function tick() {
  $('#updatedAt').textContent=new Date().toLocaleTimeString('ko-KR', {
    hour12:false
  })
}
$('#calculateBtn').addEventListener('click',update);
chart();
update();
setInterval(tick,1000);
