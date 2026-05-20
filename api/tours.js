'use strict';
// Vercel serverless function — no Playwright, shorter timeouts

const https = require('https');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const HT_UKEY = '20e21f93e0c7dcc4b6c655094441c9eb';
const HT_BKEY = 'a18db8b9b7ec67ad61702c5ae1dddd36';

const EMPTY_FILTERS = {
  airlines: [], beachTypes: [], datesList: [], hotelServices: [],
  hotelsIds: [], mealIds: [], nightsList: [], ratings: [],
  regionsIds: [], seaLines: [], stars: [],
  smartfilters: null, priceMax: 0, priceMin: 0,
  onlyRecommendedHotels: false, onlySmart: false,
};

// ── HELPERS ───────────────────────────────
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function daysFromNow(n) {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function mapDest(text) {
  const t = (text || '').toLowerCase();
  if (t.includes('нячанг') || t.includes('камрань') || t.includes('nha trang') || t.includes('cam ranh')) return 'nha-trang';
  if (t.includes('фу куок') || t.includes('фукуок') || t.includes('phu quoc')) return 'phu-quoc';
  if (t.includes('дананг') || t.includes('da nang') || t.includes('danang')) return 'da-nang';
  if (t.includes('хошимин') || t.includes('хо ши мин') || t.includes('ho chi minh') || t.includes('сайгон')) return 'ho-chi-minh';
  if (t.includes('ханой') || t.includes('hanoi')) return 'hanoi';
  return 'nha-trang';
}

function mapMeal(shortName, fullName) {
  const s = (shortName || '').toUpperCase();
  const f = (fullName || '').toLowerCase();
  if (s === 'AI' || f.includes('всё включено') || f.includes('all inclusive')) return 'all-inclusive';
  if (s === 'HB' || f.includes('полупансион') || f.includes('half board')) return 'half-board';
  return 'breakfast';
}

function mapRoom(roomName) {
  const r = (roomName || '').toLowerCase();
  if (r.includes('suite') || r.includes('сюит')) return 'suite';
  if (r.includes('deluxe') || r.includes('делюкс')) return 'deluxe';
  if (r.includes('superior') || r.includes('улучшен')) return 'superior';
  return 'standard';
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

function fetchJSON(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': UA, 'Accept': 'application/json', ...extraHeaders },
      timeout: 8000,
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse failed')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function postJSON(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req  = https.request({
      hostname, path, method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent':     UA,
        'Referer':        'https://ht.kz/',
        'Origin':         'https://ht.kz',
      },
      timeout: 8000,
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try { resolve(JSON.parse(d)); }
        catch (e) { reject(new Error('JSON parse failed')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(data);
    req.end();
  });
}

// ── HT.KZ (fast version — 1 poll after short wait) ──
async function fetchHT({ nightsFrom = 7, nightsTo = 7 } = {}) {
  const today  = todayISO();
  const dateTo = daysFromNow(60);
  const qBase  = () => Date.now() + Math.random().toString(36).slice(2, 8);

  const init = await postJSON('ws.ht.kz',
    `/v1/search/web?query-id=${qBase()}&query-start-time=${Date.now()}&dbg-type=desktop&dbg-event-id=1`,
    {
      type: 0, ukey: HT_UKEY, bkey: HT_BKEY,
      params: {
        adults: 2, childAges: [], countryId: 7,
        dateFrom: today, dateTo,
        departCityId: 1, groupMode: 1, hotels: [],
        nightsFrom, nightsTo,
        onlyHotels: false, currency: 'kzt',
      },
    }
  );

  const uuid = init.id;
  // Shorter wait for serverless environment (3s instead of 8s)
  await new Promise(r => setTimeout(r, 3000));

  const page1 = await postJSON('ws.ht.kz',
    `/v1/search/web/${uuid}?id=${uuid}&page=1&size=200&sort=price&currency=kzt&query-id=${qBase()}`,
    EMPTY_FILTERS
  );

  const results = page1.tours || [];

  return results
    .filter(t => t.price?.value > 0 && t.nights >= nightsFrom && t.nights <= nightsTo)
    .map((t, i) => {
      const departure = formatDate(t.dateFrom);
      const link = `https://ht.kz/findtours?region=&departCity=1&country=7&hotel=${t.hotelId}&daysFrom=${nightsFrom}&daysTo=${nightsTo}&stars=any&adult=2&child=0&childAges=&splitRooms=&search=1&dateFrom=${departure}&delta=1&bank=`;
      return {
        id: `ht_${i}`, agency: 'ht.kz', badge: 'badge-ht',
        dest: mapDest(t.region || ''),
        hotel: (t.hotelName || 'Vietnam Hotel').replace(/\d\*\s*$/, '').trim(),
        stars: t.stars || 3,
        meal: mapMeal('', t.meal || ''),
        departure, nights: t.nights,
        flight: 'Air Astana',
        room: mapRoom(t.room || ''),
        price: Math.round(t.price.value / 2),
        available: null, link,
      };
    });
}

// ── GOTUR.KZ ──────────────────────────────
async function fetchGotur({ nightsFrom = 7, nightsTo = 7 } = {}) {
  const date = todayISO();
  const url  = `https://www.gotur.kz/country/load-tours.html?countryAlias=vietnam&departCityAlias=almaty&date=${date}&nights=${nightsFrom}&nightsTo=${nightsTo}`;
  const tours = await fetchJSON(url, { Referer: 'https://www.gotur.kz/tury/vietnam/almaty.html' });
  if (!Array.isArray(tours)) throw new Error('Expected array');

  return tours
    .filter(t => t.price?.forOne > 0 && t.totalNights >= nightsFrom && t.totalNights <= nightsTo)
    .map((t, i) => ({
      id: `gotur_${i}`, agency: 'gotour.kz', badge: 'badge-gotour',
      dest: mapDest(t.region?.name || ''),
      hotel: (t.hotel?.name || 'Vietnam Hotel').replace(/\d\*\s*$/, '').trim(),
      stars: parseInt(t.hotel?.class || '3') || 3,
      meal: mapMeal(t.meal?.shortName, t.meal?.name),
      departure: formatDate(t.checkIn),
      nights: t.totalNights,
      flight: (t.airlineCodes?.length ? t.airlineCodes[0] : null) || 'VietJet Air',
      room: mapRoom(t.room?.name),
      price: t.price.forOne,
      available: null,
      link: `https://www.gotur.kz/tour/view.html?tour=${t.id}`,
    }));
}

// ── HANDLER ───────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const nightsFrom = Math.max(1, parseInt(req.query?.nightsFrom) || 7);
  const nightsTo   = Math.max(nightsFrom, parseInt(req.query?.nightsTo) || 7);

  const t0 = Date.now();

  const [htRes, goturRes] = await Promise.allSettled([
    fetchHT({ nightsFrom, nightsTo }),
    fetchGotur({ nightsFrom, nightsTo }),
  ]);

  const ht    = htRes.status    === 'fulfilled' ? htRes.value    : [];
  const gotur = goturRes.status === 'fulfilled' ? goturRes.value : [];

  const all = [...ht, ...gotur];
  all.sort((a, b) => a.price - b.price);

  const seen = new Set();
  const unique = all.filter(t => {
    const key = `${t.hotel.toLowerCase().slice(0, 20)}_${t.departure}_${t.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const tours = unique.slice(0, 100).map((t, i) => ({ ...t, id: `tour_${i + 1}` }));
  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

  res.status(200).json({
    tours,
    updated: new Date().toISOString(),
    count: tours.length,
    elapsed: +elapsed,
    cached: false,
    sources: {
      'ht.kz':     htRes.status    === 'fulfilled' ? ht.length    : 'error',
      'gotour.kz': goturRes.status === 'fulfilled' ? gotur.length : 'error',
    },
  });
};
