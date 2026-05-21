'use strict';

const express  = require('express');
const cors     = require('cors');
const https    = require('https');

const app  = express();
const PORT = 3001;
const CACHE_TTL = 30 * 60 * 1000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const searchCache = new Map();

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Country → API ID mappings
const COUNTRY_MAP = {
  vietnam:  { htId: 7,  tvId: 16 },
  thailand: { htId: 3,  tvId: 2  },
  turkey:   { htId: 1,  tvId: 4  },
  uae:      { htId: 2,  tvId: 9  },
  egypt:    { htId: 18, tvId: 1  },
};

// ── HELPERS ───────────────────────────────
function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysFromNow(n) { return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10); }

function isoToDDMMYYYY(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}
function formatDate(isoDate) { return isoDate ? isoToDDMMYYYY(isoDate) : ''; }

function mapDest(text, country = 'vietnam') {
  const t = (text || '').toLowerCase();
  // Vietnam
  if (t.includes('нячанг') || t.includes('камрань') || t.includes('nha trang') || t.includes('cam ranh')) return 'nha-trang';
  if (t.includes('фу куок') || t.includes('фукуок') || t.includes('phu quoc')) return 'phu-quoc';
  if (t.includes('дананг') || t.includes('da nang') || t.includes('danang')) return 'da-nang';
  if (t.includes('хошимин') || t.includes('хо ши мин') || t.includes('ho chi minh') || t.includes('сайгон')) return 'ho-chi-minh';
  if (t.includes('ханой') || t.includes('hanoi')) return 'hanoi';
  if (t.includes('фантьет') || t.includes('фантхьет') || t.includes('муйне') || t.includes('phan thiet') || t.includes('mui ne')) return 'nha-trang';
  // Thailand
  if (t.includes('пхукет') || t.includes('phuket')) return 'phuket';
  if (t.includes('паттайя') || t.includes('pattaya')) return 'pattaya';
  if (t.includes('самуи') || t.includes('samui')) return 'koh-samui';
  if (t.includes('бангкок') || t.includes('bangkok')) return 'bangkok';
  // UAE
  if (t.includes('дубай') || t.includes('dubai')) return 'dubai';
  if (t.includes('абу') || t.includes('abu dhabi')) return 'abu-dhabi';
  if (t.includes('шарджа') || t.includes('sharjah')) return 'dubai';
  // Turkey
  if (t.includes('анталь') || t.includes('antalya') || t.includes('белек') || t.includes('belek') ||
      t.includes('алания') || t.includes('alanya') || t.includes('сиде') || t.includes(' side') ||
      t.includes('мармар') || t.includes('marmaris') || t.includes('кемер') || t.includes('kemer')) return 'antalya';
  if (t.includes('стамбул') || t.includes('istanbul')) return 'istanbul';
  if (t.includes('бодрум') || t.includes('bodrum')) return 'bodrum';
  // Egypt
  if (t.includes('хургада') || t.includes('hurghada') || t.includes('марса') || t.includes('marsa')) return 'hurghada';
  if (t.includes('шарм') || t.includes('sharm')) return 'sharm';
  // Country-specific defaults
  const defaults = { vietnam: 'nha-trang', thailand: 'phuket', uae: 'dubai', turkey: 'antalya', egypt: 'hurghada' };
  return defaults[country] || 'nha-trang';
}

function mapMeal(shortName, fullName) {
  const s = (shortName || '').toUpperCase();
  const f = (fullName || '').toLowerCase();
  if (s === 'AI' || f.includes('все включено') || f.includes('all inclusive')) return 'all-inclusive';
  if (s === 'HB' || f.includes('полупансион') || f.includes('half board') || f.includes('завтрак, ужин') || f.includes('ужин')) return 'half-board';
  if (s === 'BB' || f.includes('завтрак') || f.includes('breakfast')) return 'breakfast';
  return 'breakfast';
}

function mapRoom(roomName) {
  const r = (roomName || '').toLowerCase();
  if (r.includes('suite') || r.includes('сюит')) return 'suite';
  if (r.includes('deluxe') || r.includes('делюкс')) return 'deluxe';
  if (r.includes('superior') || r.includes('улучшен')) return 'superior';
  return 'standard';
}

function fetchJSON(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json', ...extraHeaders },
      timeout: 25000,
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse failed: ${data.slice(0, 80)}`)); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

// ── SCRAPER: HT.KZ ────────────────────────
const HT_UKEY = '20e21f93e0c7dcc4b6c655094441c9eb';
const HT_BKEY = 'a18db8b9b7ec67ad61702c5ae1dddd36';

function postJSON(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = https.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data),
        'User-Agent': UA, 'Referer': 'https://ht.kz/', 'Origin': 'https://ht.kz',
      },
      timeout: 30000,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(new Error(`JSON parse: ${d.slice(0, 80)}`)); } });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

const EMPTY_FILTERS = {
  airlines: [], beachTypes: [], datesList: [], hotelServices: [],
  hotelsIds: [], mealIds: [], nightsList: [], ratings: [],
  regionsIds: [], seaLines: [], stars: [],
  smartfilters: null, priceMax: 0, priceMin: 0,
  onlyRecommendedHotels: false, onlySmart: false,
};

async function fetchHT({ nightsFrom = 7, nightsTo = 7, country = 'vietnam', adults = 2 } = {}) {
  const { htId } = COUNTRY_MAP[country] || COUNTRY_MAP.vietnam;
  console.log(`[ht.kz] Starting search: country=${country}(id=${htId}), nights ${nightsFrom}–${nightsTo}, adults=${adults}...`);
  const today  = todayISO();
  const dateTo = daysFromNow(60);
  const qBase  = () => Date.now() + Math.random().toString(36).slice(2, 8);

  const init = await postJSON('ws.ht.kz',
    `/v1/search/web?query-id=${qBase()}&query-start-time=${Date.now()}&dbg-type=desktop&dbg-event-id=1`,
    {
      type: 0, ukey: HT_UKEY, bkey: HT_BKEY,
      params: {
        adults, childAges: [], countryId: htId,
        dateFrom: today, dateTo,
        departCityId: 1, groupMode: 1, hotels: [],
        nightsFrom, nightsTo,
        onlyHotels: false, currency: 'kzt',
      },
    }
  );

  const uuid    = init.id;
  const timeout = (init.timeout || 30) * 1000;
  console.log(`[ht.kz] UUID: ${uuid}, timeout: ${timeout / 1000}s`);

  let results   = [];
  let prevCount = -1;
  const deadline = Date.now() + timeout + 3000;

  await new Promise(r => setTimeout(r, 8000));

  while (Date.now() < deadline) {
    try {
      const page1 = await postJSON('ws.ht.kz',
        `/v1/search/web/${uuid}?id=${uuid}&page=1&size=200&sort=price&currency=kzt&query-id=${qBase()}`,
        EMPTY_FILTERS
      );
      const batch = page1.tours || [];
      if (batch.length > prevCount) { results = batch; prevCount = batch.length; }
      else if (batch.length === prevCount && prevCount > 0) break;
    } catch { /* ignore */ }
    if (Date.now() >= deadline) break;
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log(`[ht.kz] Raw results: ${results.length}`);

  return results
    .filter(t => t.price?.value > 0 && t.nights >= nightsFrom && t.nights <= nightsTo)
    .map((t, i) => {
      const departure = formatDate(t.dateFrom);
      const link = `https://ht.kz/findtours?region=&departCity=1&country=${htId}&hotel=${t.hotelId}&daysFrom=${nightsFrom}&daysTo=${nightsTo}&stars=any&adult=${adults}&child=0&childAges=&splitRooms=&search=1&dateFrom=${departure}&delta=1&bank=`;
      return {
        id: `ht_${i}`, agency: 'ht.kz', badge: 'badge-ht',
        dest: mapDest(t.region || '', country),
        hotel: (t.hotelName || 'Hotel').replace(/\d\*\s*$/, '').trim(),
        stars: t.stars || 3,
        meal: mapMeal('', t.meal || ''),
        departure, nights: t.nights,
        flight: 'Air Astana',
        room: mapRoom(t.room || ''),
        price: Math.round(t.price.value / adults),
        available: null, link,
      };
    });
}

// ── SCRAPER: HAPPY-TRAVEL.KZ (Tourvisor API) ──
async function fetchHappyTravel({ nightsFrom = 7, nightsTo = 7, country = 'vietnam', adults = 2 } = {}) {
  const { tvId } = COUNTRY_MAP[country] || COUNTRY_MAP.vietnam;
  console.log(`[happy-travel.kz] Starting Tourvisor search: country=${country}(tv=${tvId}), nights ${nightsFrom}–${nightsTo}, adults=${adults}...`);
  const dateFrom = isoToDDMMYYYY(todayISO());
  const dateTo   = isoToDDMMYYYY(daysFromNow(60));
  const ref      = 'https%3A%2F%2Fhappy-travel.kz%2Ftur.php';
  const tvHeaders = { 'Referer': 'https://happy-travel.kz/tur.php', 'Accept': 'application/json' };

  const searchUrl = `https://tourvisor.ru/xml/modsearch.php?datefrom=${dateFrom}&dateto=${dateTo}&directflight=0&regular=1&nightsfrom=${nightsFrom}&nightsto=${nightsTo}&adults=${adults}&child=0&meal=0&rating=0&country=${tvId}&departure=60&pricefrom=0&priceto=0&currency=3&formmode=0&referrer=${ref}&session=`;
  const search = await fetchJSON(searchUrl, tvHeaders);
  const requestId = search.result?.requestid;
  if (!requestId) throw new Error('[happy-travel.kz] No requestid from Tourvisor');

  const operatorMap = {};
  for (const op of (search.result?.operators || [])) operatorMap[op.id] = op.name;

  console.log(`[happy-travel.kz] requestid: ${requestId}, operators: ${Object.keys(operatorMap).length}`);

  await new Promise(r => setTimeout(r, 6000));

  let data = null;
  for (const host of ['search2.tourvisor.ru', 'search3.tourvisor.ru']) {
    try {
      const res = await fetchJSON(
        `https://${host}/modresult.php?requestid=${requestId}&referrer=${ref}&session=`,
        tvHeaders
      );
      if (res.data?.block?.length) { data = res.data; break; }
    } catch { /* try next */ }
  }

  if (!data) throw new Error('[happy-travel.kz] No results from Tourvisor');

  const blocks = data.block || [];
  const decode = data.decode || {};

  const tours = [];
  for (const block of blocks) {
    for (const hotel of (block.hotel || [])) {
      const bestTour = [...(hotel.tour || [])].sort((a, b) => a.pr - b.pr)[0];
      if (!bestTour || !bestTour.pr) continue;

      const hotelInfo = decode.hotels?.[hotel.id] || {};
      const mealInfo  = decode.meal?.[bestTour.ml] || {};
      const roomInfo  = decode.rooms?.[bestTour.rm] || {};

      const departure   = formatDate(bestTour.dt);
      const depDDMMYYYY = isoToDDMMYYYY(bestTour.dt);
      const operator    = operatorMap[bestTour.op] || 'Тур-оператор';

      const link = `https://happy-travel.kz/tur.php?ts_dosearch=1&s_form_mode=0&s_nights_from=${nightsFrom}&s_nights_to=${nightsTo}&s_directflight=0&s_regular=1&s_j_date_from=${depDDMMYYYY}&s_j_date_to=${depDDMMYYYY}&s_adults=${adults}&s_flyfrom=60&s_country=${tvId}&s_currency=3`;

      tours.push({
        id: `happy_${hotel.id}`,
        agency: 'happy-travel.kz',
        badge: 'badge-happy',
        dest: mapDest(hotelInfo.region || '', country),
        hotel: (hotelInfo.name || 'Hotel').trim(),
        stars: parseInt(hotelInfo.stars || '3') || 3,
        meal: mapMeal('', mealInfo.name || ''),
        departure, nights: bestTour.nt,
        flight: operator,
        room: mapRoom(roomInfo.name || ''),
        price: Math.round(bestTour.pr / adults),
        available: null,
        link,
      });
    }
  }

  tours.sort((a, b) => a.price - b.price);
  console.log(`[happy-travel.kz] Found ${tours.length} tours`);
  return tours;
}

// ── MAIN ORCHESTRATOR ──────────────────────
async function scrapeAll({ nightsFrom = 7, nightsTo = 7, country = 'vietnam', adults = 2 } = {}) {
  const cacheKey = `${nightsFrom}|${nightsTo}|${country}|${adults}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    console.log(`[API] Cache hit: nights ${nightsFrom}–${nightsTo}, country=${country}, adults=${adults}`);
    return { ...cached.data, cached: true };
  }

  console.log(`\n[A-Travel] Fetching country=${country}, nights ${nightsFrom}–${nightsTo}, adults=${adults}, next 60 days...`);
  const t0 = Date.now();

  const [htRes, happyRes] = await Promise.allSettled([
    fetchHT({ nightsFrom, nightsTo, country, adults }),
    fetchHappyTravel({ nightsFrom, nightsTo, country, adults }),
  ]);

  const ht    = htRes.status    === 'fulfilled' ? htRes.value    : [];
  const happy = happyRes.status === 'fulfilled' ? happyRes.value : [];

  if (htRes.status    === 'rejected') console.error('[ht.kz] Failed:', htRes.reason?.message);
  if (happyRes.status === 'rejected') console.error('[happy-travel.kz] Failed:', happyRes.reason?.message);

  const htTop    = [...ht].sort((a, b) => a.price - b.price).slice(0, 20);
  const happyTop = [...happy].sort((a, b) => a.price - b.price).slice(0, 20);

  const all = [...htTop, ...happyTop];
  all.sort((a, b) => a.price - b.price);

  const seen = new Set();
  const tours = all
    .filter(t => {
      const key = `${t.hotel.toLowerCase().slice(0, 20)}_${t.departure}_${t.price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((t, i) => ({ ...t, id: `tour_${i + 1}` }));

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[A-Travel] Done in ${elapsed}s — ${tours.length} tours | ht:${ht.length} happy:${happy.length}`);

  const result = {
    tours,
    updated: new Date().toISOString(),
    count: tours.length,
    elapsed: +elapsed,
    sources: {
      'ht.kz':           htRes.status    === 'fulfilled' ? ht.length    : 'error',
      'happy-travel.kz': happyRes.status === 'fulfilled' ? happy.length : 'error',
    },
  };

  searchCache.set(cacheKey, { data: result, at: Date.now() });
  return result;
}

// ── API ROUTES ─────────────────────────────
const VALID_COUNTRIES = ['vietnam', 'thailand', 'turkey', 'uae', 'egypt'];

app.get('/api/tours', async (req, res) => {
  const nightsFrom = Math.max(1, parseInt(req.query.nightsFrom) || 7);
  const nightsTo   = Math.max(nightsFrom, parseInt(req.query.nightsTo) || 7);
  const country    = VALID_COUNTRIES.includes(req.query.country) ? req.query.country : 'vietnam';
  const adults     = Math.min(8, Math.max(1, parseInt(req.query.adults) || 2));
  try {
    const data = await scrapeAll({ nightsFrom, nightsTo, country, adults });
    res.json({ ...data, cached: !!data.cached });
  } catch (err) {
    console.error('[API] Error:', err.message);
    res.status(500).json({ error: err.message, tours: [] });
  }
});

app.get('/api/refresh', (req, res) => {
  const nightsFrom = Math.max(1, parseInt(req.query.nightsFrom) || 7);
  const nightsTo   = Math.max(nightsFrom, parseInt(req.query.nightsTo) || 7);
  const country    = VALID_COUNTRIES.includes(req.query.country) ? req.query.country : 'vietnam';
  const adults     = Math.min(8, Math.max(1, parseInt(req.query.adults) || 2));
  searchCache.delete(`${nightsFrom}|${nightsTo}|${country}|${adults}`);
  res.json({ message: `Cache cleared for nights ${nightsFrom}–${nightsTo}, country=${country}, adults=${adults}.` });
});

app.get('/health', (_req, res) => res.json({ status: 'ok', cacheKeys: [...searchCache.keys()] }));

app.listen(PORT, () => {
  console.log(`\n✅  A-Travel API → http://localhost:${PORT}`);
  console.log(`   GET /api/tours?nightsFrom=7&nightsTo=9&country=vietnam\n`);
});
