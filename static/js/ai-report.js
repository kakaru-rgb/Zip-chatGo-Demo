const aiMarketData= {
  "강남구": {
    score:82,
    temp:76,
    forecast:2.8,
    trade:428,
    confidence:91,
    trend:[91,
    92,
    93,
    94,
    95,
    96,
    98,
    99,
    100,
    102,
    103,
    105],
    factors:[['매수 수요',
    88,
    1],
    ['교통·학군',
    92,
    1],
    ['대출 부담',
    66,
    -1],
    ['매물 증가',
    41,
    -1]]
  },
  "서초구": {
    score:79,
    temp:72,
    forecast:2.2,
    trade:351,
    confidence:89,
    trend:[92,
    93,
    94,
    95,
    96,
    97,
    98,
    99,
    100,
    101,
    102,
    104],
    factors:[['학군 수요',
    94,
    1],
    ['희소 매물',
    83,
    1],
    ['가격 부담',
    72,
    -1],
    ['금리 영향',
    58,
    -1]]
  },
  "송파구": {
    score:86,
    temp:81,
    forecast:3.1,
    trade:512,
    confidence:93,
    trend:[88,
    90,
    91,
    92,
    94,
    95,
    97,
    99,
    100,
    102,
    104,
    106],
    factors:[['거래 회복',
    91,
    1],
    ['생활 인프라',
    90,
    1],
    ['입주 물량',
    52,
    -1],
    ['전세가 상승',
    78,
    1]]
  },
  "용산구": {
    score:75,
    temp:68,
    forecast:1.9,
    trade:196,
    confidence:84,
    trend:[94,
    94,
    95,
    96,
    97,
    98,
    99,
    100,
    100,
    101,
    102,
    103],
    factors:[['개발 기대',
    89,
    1],
    ['교통 중심성',
    96,
    1],
    ['거래 부족',
    61,
    -1],
    ['고가 부담',
    70,
    -1]]
  },
  "마포구": {
    score:84,
    temp:78,
    forecast:2.5,
    trade:287,
    confidence:90,
    trend:[89,
    90,
    91,
    93,
    94,
    95,
    96,
    98,
    99,
    101,
    102,
    104],
    factors:[['직주근접',
    94,
    1],
    ['생활 편의',
    91,
    1],
    ['매물 감소',
    76,
    1],
    ['가격 상승',
    59,
    -1]]
  },
  "성동구": {
    score:88,
    temp:84,
    forecast:3.4,
    trade:264,
    confidence:92,
    trend:[87,
    89,
    90,
    92,
    94,
    95,
    97,
    99,
    101,
    103,
    105,
    107],
    factors:[['선호도 상승',
    93,
    1],
    ['신축 희소성',
    88,
    1],
    ['가격 급등',
    68,
    -1],
    ['거래 집중',
    77,
    1]]
  },
  "광진구": {
    score:72,
    temp:65,
    forecast:1.7,
    trade:218,
    confidence:82,
    trend:[91,
    91,
    92,
    93,
    94,
    95,
    96,
    97,
    98,
    99,
    100,
    102],
    factors:[['가격 경쟁력',
    86,
    1],
    ['교통 개선',
    79,
    1],
    ['거래 정체',
    55,
    -1],
    ['공급 부담',
    48,
    -1]]
  },
  "강동구": {
    score:83,
    temp:80,
    forecast:2.9,
    trade:394,
    confidence:88,
    trend:[86,
    88,
    89,
    91,
    92,
    94,
    96,
    97,
    99,
    101,
    103,
    105],
    factors:[['신축 수요',
    91,
    1],
    ['전세가율',
    84,
    1],
    ['입주 물량',
    64,
    -1],
    ['거래 증가',
    87,
    1]]
  }
};
const $=s=>document.querySelector(s),regionEl=$("#regionFilter"),regions=Object.keys(aiMarketData);
regions.forEach(r=>regionEl.add(new Option(r,r)));
regionEl.value="송파구";
function update() {
  const name=regionEl.value,
  d=aiMarketData[name],
  housing=$("#housingFilter").value,
  period=Number($("#periodFilter").value),
  modifier=housing==='officetel'?.76:housing==='villa'?.63:1,
  score=Math.round(d.score*modifier+(1-modifier)*68),
  forecast=(d.forecast*modifier*(period/6)).toFixed(1),
  temp=Math.round(d.temp*modifier);
  $("#marketTemperature").textContent=`${temp}℃`;
  $("#temperatureText").textContent=temp>=80?'매수 문의가 활발해요':temp>=70?'완만한 회복 흐름':'관망세가 우세해요';
  $("#priceForecast").textContent=`+${forecast}%`;
  $("#forecastRange").textContent=`향후 ${period}개월 예상 범위`;
  $("#tradeSignal").textContent=d.trade>=400?'활발':'보통';
  $("#tradeText").textContent=`월 ${Math.round(d.trade*modifier)}건 신고`;
  $("#confidence").textContent=`${Math.round(d.confidence*modifier+(1-modifier)*75)}%`;
  $("#marketScore").textContent=score;
  $("#scoreRing").style.setProperty('--score',`${score}%`);
  $("#marketSummary").textContent=`${name} ${$("#housingFilter").selectedOptions[0].text} 시장은 ${temp>=75?'수요 회복과 가격 상승 신호가 함께 나타나는 구간':'매수자와 매도자 모두 관망하는 안정 구간'}입니다. 향후 ${period}개월은 ${forecast}% 내외의 변동 가능성이 있습니다.`;
  renderChart(d.trend,period,Number(forecast));
  renderFactors(d.factors);
  renderStrategies(name,d,score);
  renderSignals(name,d);
  tick()
}
function renderChart(actual,period,forecast) {
  const svg=$("#forecastChart"),
  w=760,
  h=300,
  p=42,
  future=Array.from( {
    length:period
  },(_,i)=>actual.at(-1)*(1+(forecast/100)*(i+1)/period)),
  series=[...actual,
  ...future],
  min=Math.min(...series)-5,
  max=Math.max(...series)+5,
  pts=(arr,start=0)=>arr.map((v,i)=>`${p+(i+start)*(w-p*2)/(series.length-1)},${h-p-(v-min)/(max-min)*(h-p*2)}`).join(' ');
  svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
  svg.innerHTML=`<g class="grid">${[0,1,2,3,4].map(i=>{const y=p+i*(h-p*2)/4;return `<line x1="${p}" y1="${y}" x2="${w-p}" y2="${y}"/><text x="8" y="${y+4}">${Math.round(max-i*(max-min)/4)}</text>`}).join('')}</g><polyline class="line base" points="${pts(actual)}"/><polyline class="line compare forecast" points="${pts([actual.at(-1),...future],actual.length-1)}"/>`
}
function renderFactors(factors) {
  $("#factorGrid").innerHTML=factors.map(([name,value,direction])=>`<article><div><span>${name}</span><b class="${direction>0?'up':'down'}">${direction>0?'상승':'하락'} 요인</b></div><strong>${value}<small>점</small></strong><div class="factor-bar"><i class="${direction>0?'positive':'negative'}" style="width:${value}%"></i></div><p>시장 영향도 ${value>=85?'매우 높음':value>=70?'높음':'보통'}</p></article>`).join('')
}
function renderStrategies(name,d,score) {
  const buyers=[`${name} 최근 실거래가와 호가 차이를 먼저 비교하세요.`,
  `대출 원리금과 관리비를 포함한 월 부담액을 계산하세요.`,
  score>=82?'급매물은 빠르게 소진될 수 있어 알림을 활용하세요.':'가격 협상 여지가 있으므로 충분히 비교하세요.'];
  const risks=[`금리 변동 시 대출 가능 금액이 달라질 수 있습니다.`,
  `단기 상승률만 보고 계약하지 말고 거래량을 함께 확인하세요.`,
  `개별 단지의 입주 물량과 권리관계를 반드시 확인하세요.`];
  const draw=(id,list)=>$(id).innerHTML=list.map((x,i)=>`<li><b>${i+1}</b><span>${x}</span></li>`).join('');
  draw('#buyerStrategy',buyers);
  draw('#riskStrategy',risks)
}
function renderSignals(name,d) {
  const signals=[["방금 전",
  "거래량",
  `${name} 거래량이 전월 동기 대비 ${d.score>80?'증가':'보합'} 흐름입니다.`,
  "ti-chart-bar"],
  ["12분 전",
  "가격",
  `84㎡ 평균 실거래가가 최근 3개월 이동평균을 상회했습니다.`,
  "ti-trending-up"],
  ["35분 전",
  "전세",
  `전세 문의량과 전세가율이 완만하게 회복되고 있습니다.`,
  "ti-home-dollar"],
  ["오늘",
  "정책",
  `대출·세금 조건은 계약 전 최신 기준을 확인해야 합니다.`,
  "ti-building-bank"]];
  $("#signalRegion").textContent=name;
  $("#signalFeed").innerHTML=signals.map(s=>`<article><i class="ti ${s[3]}"></i><div><span>${s[0]} · ${s[1]}</span><p>${s[2]}</p></div></article>`).join('')
}
function tick() {
  $("#updatedAt").textContent=new Date().toLocaleTimeString('ko-KR', {
    hour12:false
  })
}
$("#analyzeBtn").addEventListener('click',update);
update();
setInterval(tick,1000);
