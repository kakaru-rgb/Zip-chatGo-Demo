import 'dotenv/config';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { XMLParser } from 'fast-xml-parser';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dataDirectory = path.join(__dirname, 'data');
const databasePath = path.join(dataDirectory, 'jipchatgo.sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

const MOLIT_SERVICE_KEY = process.env.MOLIT_SERVICE_KEY || '';
const DEFAULT_LAWD_CD = process.env.DEFAULT_LAWD_CD || '41117';
const DEFAULT_DEAL_YMD = process.env.DEFAULT_DEAL_YMD || getPreviousMonthYmd();

const APT_TRADE_URL = process.env.MOLIT_APT_TRADE_URL ||
  'https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade';

const APT_RENT_URL = process.env.MOLIT_APT_RENT_URL ||
  'https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent';

const REGION_NAMES = {
  '41117': '수원 영통구 · 광교',
  '41465': '용인 수지구',
  '41135': '성남 분당구 · 판교',
  '41590': '화성시 · 동탄',
  '11110': '서울 종로구'
};

const parser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false,
  isArray: (name) => name === 'item'
});

const db = initializeDatabase();

app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.static(projectRoot));

app.get('/api/market/health', (req, res) => {
  res.json({
    ok: true,
    service: 'jipchatgo-market-api',
    defaultDealYmd: DEFAULT_DEAL_YMD,
    source: hasServiceKey() ? 'molit-openapi' : 'demo'
  });
});

// LIVE 화면에서 사용할 추천 매물 3건입니다. 매물 데이터는 SQLite DB에서 조회합니다.
app.get('/api/live/recommendations', (req, res) => {
  try {
    const recommendations = db.prepare(`
      SELECT id, building_name, property_type, sale_price, exclusive_area,
             floor, address, district, latitude, longitude, thumbnail_url
      FROM properties
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      ORDER BY
        CASE WHEN exclusive_area BETWEEN 59 AND 100 THEN 0 ELSE 1 END,
        sale_price ASC,
        id ASC
      LIMIT 3
    `).all();

    res.json({ ok: true, recommendations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, message: '추천 매물을 조회하지 못했습니다.' });
  }
});

app.get('/api/market/summary', async (req, res) => {
  try {
    const lawdCd = String(req.query.region || DEFAULT_LAWD_CD).trim();
    const dealYmd = String(req.query.month || DEFAULT_DEAL_YMD).trim();
    const prevYmd = getPrevYmd(dealYmd);

    if (!/^\d{5}$/.test(lawdCd)) {
      return res.status(400).json({ ok: false, message: 'region은 법정동코드 앞 5자리여야 합니다. 예: 41117' });
    }

    if (!/^\d{6}$/.test(dealYmd)) {
      return res.status(400).json({ ok: false, message: 'month는 YYYYMM 형식이어야 합니다. 예: 202606' });
    }

    if (!hasServiceKey()) {
      return res.json(makeDemoSummary(lawdCd, dealYmd));
    }

    const [tradeNow, tradePrev, rentNow, rentPrev] = await Promise.all([
      callMolitApi(APT_TRADE_URL, lawdCd, dealYmd),
      callMolitApi(APT_TRADE_URL, lawdCd, prevYmd),
      callMolitApi(APT_RENT_URL, lawdCd, dealYmd),
      callMolitApi(APT_RENT_URL, lawdCd, prevYmd)
    ]);

    res.json(buildSummary({
      lawdCd,
      dealYmd,
      prevYmd,
      tradeNow: tradeNow.items,
      tradePrev: tradePrev.items,
      rentNow: rentNow.items,
      rentPrev: rentPrev.items
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json({
      ok: false,
      message: '시장동향 데이터를 불러오는 중 오류가 발생했습니다.',
      detail: error.message
    });
  }
});

async function callMolitApi(baseUrl, lawdCd, dealYmd) {
  const url = buildMolitUrl(baseUrl, {
    serviceKey: MOLIT_SERVICE_KEY,
    LAWD_CD: lawdCd,
    DEAL_YMD: dealYmd,
    pageNo: '1',
    numOfRows: '1000'
  });

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/xml,text/xml,*/*' }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`공공 API 호출 실패: ${response.status} ${extractApiErrorMessage(text)}`);
  }

  const xml = parser.parse(text);
  const serviceError = xml?.OpenAPI_ServiceResponse?.cmmMsgHeader;
  if (serviceError) {
    throw new Error(serviceError.returnAuthMsg || serviceError.errMsg || '공공 API 인증 오류');
  }

  const header = xml?.response?.header;
  if (header && header.resultCode && header.resultCode !== '000') {
    throw new Error(header.resultMsg || '공공 API 응답 오류');
  }

  const body = xml?.response?.body || {};
  const rawItems = body?.items?.item || [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems].filter(Boolean);

  return {
    totalCount: Number(body.totalCount || items.length || 0),
    items
  };
}

function extractApiErrorMessage(text) {
  if (!text) return '';
  try {
    const xml = parser.parse(text);
    const serviceError = xml?.OpenAPI_ServiceResponse?.cmmMsgHeader;
    if (serviceError) {
      return serviceError.returnAuthMsg || serviceError.errMsg || '';
    }
    return xml?.response?.header?.resultMsg || '';
  } catch {
    return text.replace(/\s+/g, ' ').trim().slice(0, 200);
  }
}

function buildMolitUrl(baseUrl, params) {
  const url = new URL(baseUrl);
  const { serviceKey, ...rest } = params;
  Object.entries(rest).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const separator = url.toString().includes('?') ? '&' : '?';
  const keyParam = serviceKey.includes('%')
    ? `serviceKey=${serviceKey}`
    : `serviceKey=${encodeURIComponent(serviceKey)}`;
  return `${url.toString()}${separator}${keyParam}`;
}

function buildSummary({ lawdCd, dealYmd, prevYmd, tradeNow, tradePrev, rentNow, rentPrev }) {
  const tradeAvgNow = average(tradeNow.map(item => toNumber(getFirst(item, ['dealAmount', 'dealAmt', '거래금액']))));
  const tradeAvgPrev = average(tradePrev.map(item => toNumber(getFirst(item, ['dealAmount', 'dealAmt', '거래금액']))));
  const rentDepositNow = average(rentNow.map(item => toNumber(getFirst(item, ['deposit', '보증금액']))));
  const rentDepositPrev = average(rentPrev.map(item => toNumber(getFirst(item, ['deposit', '보증금액']))));

  const saleRate = changeRate(tradeAvgNow, tradeAvgPrev);
  const rentRate = changeRate(rentDepositNow, rentDepositPrev);
  const volumeNow = tradeNow.length;
  const volumePrev = tradePrev.length;
  const volumeRate = changeRate(volumeNow, volumePrev);
  const rentVolumeNow = rentNow.length;
  const rentVolumePrev = rentPrev.length;
  const rentVolumeRate = changeRate(rentVolumeNow, rentVolumePrev);

  const saleStatus = getStatusByRate(saleRate);
  const jeonseStatus = getStatusByRate(rentRate);
  const volumeStatus = getVolumeStatus(volumeRate);
  const topDongs = countTopDongs([...tradeNow, ...rentNow]);
  const hotRegion = topDongs.length ? topDongs.slice(0, 2).join(' · ') : (REGION_NAMES[lawdCd] || '관심지역');

  return {
    ok: true,
    source: 'molit-openapi',
    regionCode: lawdCd,
    regionName: REGION_NAMES[lawdCd] || `${lawdCd} 지역`,
    dealYmd,
    prevYmd,
    saleStatus,
    jeonseStatus,
    volumeStatus,
    hotRegion,
    saleAvg: tradeAvgNow,
    saleChangeRate: saleRate,
    jeonseAvgDeposit: rentDepositNow,
    jeonseChangeRate: rentRate,
    tradeCount: volumeNow,
    tradeCountPrev: volumePrev,
    volumeChangeRate: volumeRate,
    rentCount: rentVolumeNow,
    rentCountPrev: rentVolumePrev,
    rentVolumeChangeRate: rentVolumeRate,
    sampleTradeList: tradeNow.slice(0, 50).map(normalizeTrade),
    sampleRentList: rentNow.slice(0, 50).map(normalizeRent),
    saleText: makeSaleText(saleStatus, saleRate, tradeAvgNow, volumeNow),
    jeonseText: makeJeonseText(jeonseStatus, rentRate, rentDepositNow, rentNow.length),
    volumeText: makeVolumeText(volumeStatus, volumeRate, volumeNow, volumePrev),
    aiText: makeAiText(saleStatus, jeonseStatus, volumeStatus, hotRegion)
  };
}

function normalizeTrade(item) {
  return {
    aptName: getFirst(item, ['aptNm', '아파트']) || '-',
    dong: getFirst(item, ['umdNm', '법정동']) || '-',
    amount: toNumber(getFirst(item, ['dealAmount', 'dealAmt', '거래금액'])),
    area: getFirst(item, ['excluUseAr', 'exclUseAr', '전용면적']) || '-',
    floor: getFirst(item, ['floor', '층']) || '-',
    day: getFirst(item, ['dealDay', '계약일']) || '-'
  };
}

function normalizeRent(item) {
  return {
    aptName: getFirst(item, ['aptNm', '아파트']) || '-',
    dong: getFirst(item, ['umdNm', '법정동']) || '-',
    deposit: toNumber(getFirst(item, ['deposit', '보증금액'])),
    monthlyRent: toNumber(getFirst(item, ['monthlyRent', '월세금액'])),
    area: getFirst(item, ['excluUseAr', 'exclUseAr', '전용면적']) || '-',
    floor: getFirst(item, ['floor', '층']) || '-',
    day: getFirst(item, ['dealDay', '계약일']) || '-'
  };
}

function makeDemoSummary(lawdCd, dealYmd) {
  return {
    ok: true,
    source: 'demo',
    regionCode: lawdCd,
    regionName: REGION_NAMES[lawdCd] || `${lawdCd} 지역`,
    dealYmd,
    prevYmd: getPrevYmd(dealYmd),
    saleStatus: '보합세',
    jeonseStatus: '수요 증가',
    volumeStatus: '관망세',
    hotRegion: '광교 · 판교',
    saleAvg: 87200,
    saleChangeRate: 0.7,
    jeonseAvgDeposit: 51200,
    jeonseChangeRate: 2.1,
    tradeCount: 42,
    tradeCountPrev: 39,
    volumeChangeRate: 7.7,
    rentCount: 28,
    rentCountPrev: 24,
    rentVolumeChangeRate: 16.7,
    sampleTradeList: [
      { aptName: '광교 예시 아파트', dong: '이의동', amount: 92000, area: '84.9', floor: '12', day: '8' },
      { aptName: '영통 예시 단지', dong: '원천동', amount: 76000, area: '74.3', floor: '7', day: '14' }
    ],
    sampleRentList: [
      { aptName: '광교 전세 예시', dong: '하동', deposit: 54000, monthlyRent: 0, area: '84.7', floor: '10', day: '5' }
    ],
    saleText: '실제 API 키를 넣으면 국토교통부 실거래가 기준으로 매매 흐름을 자동 계산합니다.',
    jeonseText: '실제 API 키를 넣으면 전월세 실거래 데이터를 기준으로 전세 흐름을 자동 계산합니다.',
    volumeText: '실제 API 키를 넣으면 전월 대비 거래량 변화를 자동 계산합니다.',
    aiText: '현재는 데모 데이터입니다. API 키 입력 후 실제 시장 데이터를 기준으로 자동 분석됩니다.'
  };
}

function countTopDongs(items) {
  const counts = new Map();
  items.forEach(item => {
    const dong = getFirst(item, ['umdNm', '법정동']);
    if (!dong) return;
    counts.set(dong, (counts.get(dong) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([dong]) => dong);
}

function makeSaleText(status, rate, avg, count) {
  if (!count) return '해당 월의 매매 실거래 데이터가 부족해 흐름 판단이 제한적입니다.';
  return `매매가격은 전월 대비 ${formatRate(rate)} 수준으로 ${status} 흐름입니다. 평균 거래금액은 약 ${formatMoney(avg)}입니다.`;
}

function makeJeonseText(status, rate, avg, count) {
  if (!count) return '해당 월의 전월세 실거래 데이터가 부족해 흐름 판단이 제한적입니다.';
  return `전세 보증금 흐름은 전월 대비 ${formatRate(rate)} 수준으로 ${status}입니다. 평균 보증금은 약 ${formatMoney(avg)}입니다.`;
}

function makeVolumeText(status, rate, now, prev) {
  return `거래량은 전월 ${prev}건에서 현재 ${now}건으로 ${formatRate(rate)} 변해 ${status} 분위기입니다.`;
}

function makeAiText(saleStatus, jeonseStatus, volumeStatus, hotRegion) {
  return `현재 시장은 매매 ${saleStatus}, 전세 ${jeonseStatus}, 거래량 ${volumeStatus} 흐름입니다. 관심이 집중되는 지역은 ${hotRegion} 중심으로 볼 수 있습니다.`;
}

function average(values) {
  const nums = values.filter(value => Number.isFinite(value) && value > 0);
  if (!nums.length) return 0;
  return Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length);
}

function getFirst(item, keys) {
  for (const key of keys) {
    if (item?.[key] !== undefined && item[key] !== null && item[key] !== '') return item[key];
  }
  return undefined;
}

function toNumber(value) {
  if (value === undefined || value === null) return 0;
  const clean = String(value).replace(/,/g, '').trim();
  const num = Number(clean);
  return Number.isFinite(num) ? num : 0;
}

function changeRate(now, prev) {
  if (!prev || !now) return 0;
  return Number((((now - prev) / prev) * 100).toFixed(1));
}

function getStatusByRate(rate) {
  if (rate >= 2) return '상승세';
  if (rate <= -2) return '하락세';
  return '보합세';
}

function getVolumeStatus(rate) {
  if (rate >= 15) return '거래 회복';
  if (rate <= -15) return '거래 감소';
  return '관망세';
}

function formatRate(rate) {
  const sign = rate > 0 ? '+' : '';
  return `${sign}${rate}%`;
}

function formatMoney(value) {
  if (!value) return '-';
  if (value >= 10000) {
    const eok = Math.floor(value / 10000);
    const man = value % 10000;
    return man ? `${eok}억 ${man.toLocaleString()}만원` : `${eok}억원`;
  }
  return `${value.toLocaleString()}만원`;
}

function getPreviousMonthYmd() {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}`;
}

function getPrevYmd(ymd) {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(4, 6));
  const date = new Date(year, month - 2, 1);
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function hasServiceKey() {
  return Boolean(MOLIT_SERVICE_KEY && !MOLIT_SERVICE_KEY.includes('여기에') && !MOLIT_SERVICE_KEY.includes('YOUR_'));
}

function initializeDatabase() {
  fs.mkdirSync(dataDirectory, { recursive: true });
  const database = new DatabaseSync(databasePath);
  database.exec(`
    CREATE TABLE IF NOT EXISTS properties (
      id INTEGER PRIMARY KEY,
      building_name TEXT NOT NULL,
      property_type TEXT,
      sale_price REAL,
      deposit REAL,
      monthly_rent REAL,
      maintenance_fee REAL,
      exclusive_area REAL,
      floor INTEGER,
      built_year INTEGER,
      address TEXT,
      district TEXT,
      latitude REAL,
      longitude REAL,
      thumbnail_url TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  const { count } = database.prepare('SELECT COUNT(*) AS count FROM properties').get();
  if (count > 0) return database;

  const sourcePath = path.join(projectRoot, 'static', 'data', 'properties.json');
  const sourceProperties = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  const insert = database.prepare(`
    INSERT INTO properties (
      id, building_name, property_type, sale_price, deposit, monthly_rent,
      maintenance_fee, exclusive_area, floor, built_year, address, district,
      latitude, longitude, thumbnail_url, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  database.exec('BEGIN');
  try {
    for (const item of sourceProperties) {
      insert.run(
        item.id, item.building_name || '이름 없는 매물', item.property_type || null,
        item.sale_price || null, item.deposit || null, item.monthly_rent || null,
        item.maintenance_fee || null, item.exclusive_area || null, item.floor || null,
        item.built_year || null, item.address || null, item.district || null,
        item.latitude || null, item.longitude || null, item.thumbnail_url || null,
        item.created_at || null, item.updated_at || null
      );
    }
    database.exec('COMMIT');
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }

  return database;
}

app.listen(PORT, () => {
  console.log(`집찾GO 시장동향 API 서버 실행: http://localhost:${PORT}`);
  console.log(`테스트 주소: http://localhost:${PORT}/api/market/summary?region=${DEFAULT_LAWD_CD}&month=${DEFAULT_DEAL_YMD}`);
});
