/* ==========================================
   A-TRAVEL — app.js
   ========================================== */

const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001/api/tours'
  : '/api/tours';

// ── TRANSLATIONS ──────────────────────────
const i18n = {
  ru: {
    nav_tag:        'Сравнение туров',
    hero_badge:     'Алматы → Вьетнам',
    hero_title:     'Найдите лучший тур во Вьетнам',
    hero_subtitle:  'до 2 месяцев вперёд · 3 крупнейших агентства · Только лучшие цены',
    stat_tours:     'туров',
    stat_agencies:  'агентства',
    stat_nights:    'ночей',
    filter_all:     'Все агентства',
    sort_label:     'Сортировка:',
    sort_cheap:     'Сначала дешевле',
    sort_expensive: 'Сначала дороже',
    sort_stars:     'По звёздам',
    results_note:   'Обновлено: май 2026',
    results_found:  'Найдено {n} туров',
    card_depart:    'Дата вылета',
    card_flight:    'Авиакомпания',
    card_meal:      'Питание',
    card_room:      'Номер',
    card_book:      'Подробнее',
    avail:          'Осталось {n} мест',
    footer_desc:    'Сравнение туров от ведущих агентств Казахстана',
    footer_disclaimer: 'Цены указаны за всех выбранных путешественников при двухместном размещении и актуальны на момент публикации. Уточняйте у агентства перед бронированием.',
    'nha-trang':    'Нячанг',
    'phu-quoc':     'Фу Куок',
    'da-nang':      'Дананг',
    'ho-chi-minh':  'Хошимин',
    'hanoi':        'Ханой',
    'breakfast':    'Завтрак',
    'all-inclusive':'Всё включено',
    'half-board':   'Полупансион',
    'standard':     'Стандартный',
    'deluxe':       'Делюкс',
    'superior':     'Улучшенный',
    'suite':        'Сюит',
    empty_title:    'Туры не найдены',
    empty_sub:      'Измените параметры поиска или выберите другое агентство',
    status_loading: 'Загружаем актуальные цены с сайтов агентств…',
    status_live:    'Актуальные цены · Обновлено {time}',
    status_cached:  'Цены из кэша · Обновлено {time}',
    status_demo:    'Демо-данные · Запустите сервер для актуальных цен',
    refresh_btn:    'Обновить',
    search_date:    'Дата вылета',
    search_delta:   '± 3 дня',
    search_nights:  'Ночей',
    search_nights_to: 'до',
    search_adults:  'Взрослые',
    search_go:      'Найти туры',
    adults_1:       'за 1 взрослого',
    adults_many:    'за {n} взрослых',
    nights_unit:    '{n} ночей',
  },
  kz: {
    nav_tag:        'Турларды салыстыру',
    hero_badge:     'Алматы → Вьетнам',
    hero_title:     'Вьетнамға ең тиімді турды табыңыз',
    hero_subtitle:  '2 айға дейін · 3 агенттіктің бағасын салыстырамыз · Тек үздік ұсыныстар',
    stat_tours:     'тур',
    stat_agencies:  'агенттік',
    stat_nights:    'түн',
    filter_all:     'Барлық агенттіктер',
    sort_label:     'Сұрыптау:',
    sort_cheap:     'Алдымен арзаны',
    sort_expensive: 'Алдымен қымбаты',
    sort_stars:     'Жұлдыздары бойынша',
    results_note:   'Жаңартылды: мамыр 2026',
    results_found:  '{n} тур табылды',
    card_depart:    'Ұшу күні',
    card_flight:    'Авиакомпания',
    card_meal:      'Тамақтану',
    card_room:      'Бөлме',
    card_book:      'Толығырақ',
    avail:          '{n} орын қалды',
    footer_desc:    'Қазақстанның жетекші агенттіктерінің турларын салыстыру',
    footer_disclaimer: 'Бағалар барлық таңдалған жолаушыларға 2 адамдық орналасу кезінде көрсетілген және жарияланған сәтте өзекті. Брондамас бұрын агенттіктен нақтылаңыз.',
    'nha-trang':    'Нячанг',
    'phu-quoc':     'Фу Куок',
    'da-nang':      'Дананг',
    'ho-chi-minh':  'Хошимин',
    'hanoi':        'Ханой',
    'breakfast':    'Таңғы ас',
    'all-inclusive':'Бәрі кіреді',
    'half-board':   'Жарты пансион',
    'standard':     'Стандартты',
    'deluxe':       'Делюкс',
    'superior':     'Жетілдірілген',
    'suite':        'Сюит',
    empty_title:    'Тур табылмады',
    empty_sub:      'Іздеу параметрлерін өзгертіп немесе басқа агенттікті таңдап көріңіз',
    status_loading: 'Агенттіктер сайттарынан өзекті бағаларды жүктеп жатырмыз…',
    status_live:    'Өзекті бағалар · Жаңартылды {time}',
    status_cached:  'Кэштегі бағалар · Жаңартылды {time}',
    status_demo:    'Демо-деректер · Өзекті бағалар үшін серверді іске қосыңыз',
    refresh_btn:    'Жаңарту',
    search_date:    'Ұшу күні',
    search_delta:   '± 3 күн',
    search_nights:  'Түн саны',
    search_nights_to: 'дейін',
    search_adults:  'Ересектер',
    search_go:      'Тур іздеу',
    adults_1:       '1 ересекке',
    adults_many:    '{n} ересекке',
    nights_unit:    '{n} түн',
  }
};

// ── MOCK DATA (fallback when server is offline) ───
const MOCK_TOURS = [
  { id: 1,  agency: 'ht.kz',          badge: 'badge-ht',     dest: 'nha-trang',    hotel: 'Muong Thanh Grand Nha Trang',    stars: 3, meal: 'breakfast',     departure: '15.06.2026', nights: 7, flight: 'Air Astana',       room: 'standard', price: 185000, available: 6 },
  { id: 2,  agency: 'gotour.kz',       badge: 'badge-gotour', dest: 'nha-trang',    hotel: 'TTC Hotel Premium Nha Trang',    stars: 3, meal: 'breakfast',     departure: '20.06.2026', nights: 7, flight: 'VietJet Air',      room: 'standard', price: 192000, available: 8 },
  { id: 3,  agency: 'happy-travel.kz',  badge: 'badge-happy',  dest: 'nha-trang',    hotel: 'Galina Hotel & Spa',             stars: 3, meal: 'breakfast',     departure: '18.06.2026', nights: 7, flight: 'FlyArystan',       room: 'superior', price: 198000, available: 4 },
  { id: 4,  agency: 'ht.kz',          badge: 'badge-ht',     dest: 'da-nang',      hotel: 'Sandy Beach Non Nuoc Resort',    stars: 3, meal: 'breakfast',     departure: '22.06.2026', nights: 7, flight: 'Air Astana',       room: 'deluxe',   price: 215000, available: 10 },
  { id: 5,  agency: 'gotour.kz',       badge: 'badge-gotour', dest: 'nha-trang',    hotel: 'Sheraton Nha Trang Hotel & Spa', stars: 4, meal: 'breakfast',     departure: '25.06.2026', nights: 7, flight: 'VietJet Air',      room: 'standard', price: 245000, available: 5 },
  { id: 6,  agency: 'happy-travel.kz',  badge: 'badge-happy',  dest: 'phu-quoc',     hotel: 'Vinpearl Resort & Spa Phú Quốc', stars: 4, meal: 'all-inclusive', departure: '01.07.2026', nights: 7, flight: 'Air Astana',       room: 'deluxe',   price: 268000, available: 3 },
  { id: 7,  agency: 'ht.kz',          badge: 'badge-ht',     dest: 'da-nang',      hotel: 'Furama Resort Danang',           stars: 4, meal: 'half-board',    departure: '05.07.2026', nights: 7, flight: 'Vietnam Airlines', room: 'superior', price: 289000, available: 7 },
  { id: 8,  agency: 'gotour.kz',       badge: 'badge-gotour', dest: 'ho-chi-minh',  hotel: 'Rex Hotel Saigon',               stars: 4, meal: 'breakfast',     departure: '10.07.2026', nights: 7, flight: 'FlyArystan',       room: 'deluxe',   price: 312000, available: 9 },
  { id: 9,  agency: 'happy-travel.kz',  badge: 'badge-happy',  dest: 'nha-trang',    hotel: 'Diamond Bay Resort & Spa',       stars: 5, meal: 'all-inclusive', departure: '15.07.2026', nights: 7, flight: 'Vietnam Airlines', room: 'suite',    price: 345000, available: 2 },
  { id: 10, agency: 'ht.kz',          badge: 'badge-ht',     dest: 'phu-quoc',     hotel: 'JW Marriott Phu Quoc Emerald Bay', stars: 5, meal: 'all-inclusive', departure: '20.07.2026', nights: 7, flight: 'Air Astana',      room: 'deluxe',   price: 389000, available: 4 },
];

// ── STATE ─────────────────────────────────
let lang             = 'ru';
let agency           = 'all';
let sort             = 'price-asc';
let liveTours        = null;
let isLoading        = false;
let filterDate       = '';      // 'YYYY-MM-DD' or ''
let filterDelta      = false;   // ±3 days toggle
let filterNightsFrom = 7;
let filterNightsTo   = 9;
let filterAdults     = 2;

function getActiveTours() {
  return liveTours || MOCK_TOURS;
}

// ── HELPERS ───────────────────────────────
function t(key, vars = {}) {
  let s = (i18n[lang] && i18n[lang][key]) ? i18n[lang][key] : key;
  Object.entries(vars).forEach(([k, v]) => { s = s.replace(`{${k}}`, v); });
  return s;
}

function starsHTML(n) {
  return Array.from({ length: n || 0 }, () => '<span class="star">★</span>').join('');
}

function fmt(price) {
  return (price || 0).toLocaleString('ru-RU');
}

function fmtTime(isoStr) {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleTimeString(lang === 'kz' ? 'kk-KZ' : 'ru-RU', {
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return ''; }
}

function adultsLabel(n) {
  if (n === 1) return t('adults_1');
  return t('adults_many', { n });
}

function nightsLabel(n) {
  if (!n) return '';
  return t('nights_unit', { n });
}

// Parse tour departure "DD.MM.YYYY" → Date object
function parseDeparture(dep) {
  if (!dep) return null;
  const [d, m, y] = dep.split('.');
  if (!d || !m || !y) return null;
  return new Date(+y, +m - 1, +d);
}

// ── STATUS BAR ────────────────────────────
function setStatus(state, payload = {}) {
  const bar = document.getElementById('statusBar');
  if (!bar) return;
  bar.className = 'status-bar status-' + state;

  const dot   = bar.querySelector('.status-dot');
  const msg   = bar.querySelector('.status-msg');
  const extra = bar.querySelector('.status-extra');

  if (state === 'loading') {
    if (dot) dot.className = 'status-dot dot-loading';
    if (msg) msg.textContent = t('status_loading');
    if (extra) extra.textContent = '';
  } else if (state === 'live') {
    if (dot) dot.className = 'status-dot dot-live';
    if (msg) msg.textContent = t('status_live', { time: fmtTime(payload.updated) });
    if (extra) extra.textContent = payload.sources
      ? Object.entries(payload.sources).map(([k, v]) => `${k}: ${v}`).join(' · ')
      : '';
  } else if (state === 'cached') {
    if (dot) dot.className = 'status-dot dot-cached';
    if (msg) msg.textContent = t('status_cached', { time: fmtTime(payload.updated) });
    if (extra) extra.textContent = '';
  } else if (state === 'demo') {
    if (dot) dot.className = 'status-dot dot-demo';
    if (msg) msg.textContent = t('status_demo');
    if (extra) extra.textContent = '';
  }
}

// ── FETCH FROM API ────────────────────────
async function fetchTours() {
  if (isLoading) return;
  isLoading = true;

  // Disable search button
  const btn = document.getElementById('searchBtn');
  if (btn) { btn.disabled = true; btn.textContent = '…'; }

  setStatus('loading');
  showSkeleton();

  const params = new URLSearchParams({
    nightsFrom: filterNightsFrom,
    nightsTo:   filterNightsTo,
  });

  try {
    const res = await fetch(`${API_URL}?${params}`, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (data.tours && data.tours.length > 0) {
      liveTours = data.tours;
      setStatus(data.cached ? 'cached' : 'live', { updated: data.updated, sources: data.sources });
    } else {
      liveTours = null;
      setStatus('demo');
    }
  } catch (err) {
    console.warn('[A-Travel] API unavailable, using demo data:', err.message);
    liveTours = null;
    setStatus('demo');
  } finally {
    isLoading = false;
    if (btn) { btn.disabled = false; btn.textContent = t('search_go'); }
    render();
  }
}

// ── SKELETON LOADER ───────────────────────
function showSkeleton() {
  const grid = document.getElementById('toursGrid');
  const skeletons = Array.from({ length: 6 }, () => `
    <div class="tour-card skeleton-card">
      <div class="skeleton-img"></div>
      <div class="card-body">
        <div class="skeleton-line w-80"></div>
        <div class="skeleton-line w-50"></div>
        <div class="skeleton-grid">
          <div class="skeleton-line w-full"></div>
          <div class="skeleton-line w-full"></div>
          <div class="skeleton-line w-full"></div>
          <div class="skeleton-line w-full"></div>
        </div>
      </div>
      <div class="card-footer">
        <div>
          <div class="skeleton-line w-30"></div>
          <div class="skeleton-line w-50" style="height:24px;margin-top:4px"></div>
        </div>
        <div class="skeleton-btn"></div>
      </div>
    </div>
  `).join('');
  grid.innerHTML = skeletons;
}

// ── CARD TEMPLATE ─────────────────────────
function cardHTML(tour, index) {
  const destName  = t(tour.dest);
  const mealName  = t(tour.meal);
  const roomName  = tour.room ? t(tour.room) : '—';
  const nLabel    = tour.nights ? nightsLabel(tour.nights) : '';

  const totalPrice = tour.price * filterAdults;
  const priceLabel = adultsLabel(filterAdults);

  const availHTML = (tour.available && tour.available <= 3)
    ? `<div class="avail-warn">${t('avail', { n: tour.available })}</div>`
    : '';

  const agencyURL = tour.link || 'https://' + tour.agency;

  return `
    <div class="tour-card" style="animation-delay:${index * 0.055}s">
      <div class="card-img img-${tour.dest}">
        <svg class="card-img-deco" viewBox="0 0 400 60" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 30 Q100 0 200 30 T400 30 L400 60 L0 60Z" fill="white"/>
        </svg>
        <div class="card-rank">#${index + 1}</div>
        <span class="card-badge ${tour.badge}">${tour.agency}</span>
        <div class="card-dest">
          ${destName}
          <small>Вьетнам${nLabel ? ' · ' + nLabel : ''}</small>
        </div>
      </div>

      <div class="card-body">
        <div class="card-hotel-row">
          <div class="hotel-name">${tour.hotel}</div>
          <div class="stars">${starsHTML(tour.stars)}</div>
        </div>
        <div class="card-details">
          <div class="detail">
            <span class="d-label">${t('card_depart')}</span>
            <span class="d-value">${tour.departure || '—'}</span>
          </div>
          <div class="detail">
            <span class="d-label">${t('card_flight')}</span>
            <span class="d-value">${tour.flight || '—'}</span>
          </div>
          <div class="detail">
            <span class="d-label">${t('card_meal')}</span>
            <span class="d-value">${mealName}</span>
          </div>
          <div class="detail">
            <span class="d-label">${t('card_room')}</span>
            <span class="d-value">${roomName}</span>
          </div>
        </div>
      </div>

      <div class="card-footer">
        <div class="price-block">
          <div class="price-per">${priceLabel}</div>
          <div class="price-main">
            <span class="price-tenge">${fmt(totalPrice)}</span>
            <span class="price-kzt">₸</span>
          </div>
          ${availHTML}
        </div>
        <button class="book-btn" onclick="window.open('${agencyURL}','_blank')">${t('card_book')}</button>
      </div>
    </div>
  `;
}

// ── RENDER TOURS ──────────────────────────
function render() {
  let list = getActiveTours().slice();

  // Client-side date filter
  if (filterDate) {
    const [fy, fm, fd] = filterDate.split('-');
    const target = new Date(+fy, +fm - 1, +fd);
    const delta  = filterDelta ? 3 : 0;
    list = list.filter(tour => {
      const d = parseDeparture(tour.departure);
      if (!d) return true;
      const diffDays = Math.round(Math.abs(d - target) / (1000 * 60 * 60 * 24));
      return diffDays <= delta;
    });
  }

  // Agency filter
  if (agency !== 'all') list = list.filter(item => item.agency === agency);

  list.sort((a, b) => {
    if (sort === 'price-asc')  return a.price - b.price;
    if (sort === 'price-desc') return b.price - a.price;
    if (sort === 'stars-desc') return b.stars - a.stars || a.price - b.price;
    return 0;
  });

  const grid = document.getElementById('toursGrid');

  if (list.length === 0) {
    grid.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🔍</div>
        <h3>${t('empty_title')}</h3>
        <p>${t('empty_sub')}</p>
      </div>
    `;
  } else {
    grid.innerHTML = list.map((tour, i) => cardHTML(tour, i)).join('');
  }

  document.getElementById('resultsText').textContent = t('results_found', { n: list.length });
}

// ── APPLY i18n TO STATIC ELEMENTS ─────────
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('#sortSelect option[data-i18n]').forEach(opt => {
    opt.textContent = t(opt.dataset.i18n);
  });
  // Update search button text
  const searchBtn = document.getElementById('searchBtn');
  if (searchBtn && !searchBtn.disabled) searchBtn.textContent = t('search_go');
  // Re-apply current status text in new language
  const bar = document.getElementById('statusBar');
  if (bar) {
    const state = (bar.className.match(/status-(\w+)/) || [])[1];
    if (state) setStatus(state, {});
  }
  render();
}

// ── SYNC FILTER UI FROM STATE ──────────────
function syncFilterUI() {
  const dateEl = document.getElementById('filterDate');
  if (dateEl) dateEl.value = filterDate;

  const deltaEl = document.getElementById('filterDelta');
  if (deltaEl) deltaEl.checked = filterDelta;

  const deltaField = document.getElementById('deltaField');
  if (deltaField) deltaField.style.opacity = filterDate ? '1' : '0.4';

  document.getElementById('filterNightsFrom').value = filterNightsFrom;
  document.getElementById('filterNightsTo').value   = filterNightsTo;
  document.getElementById('adultsVal').textContent  = filterAdults;
}

// ── INIT ──────────────────────────────────
function init() {
  // Language toggle
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      lang = btn.dataset.lang;
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.documentElement.lang = lang;
      applyI18n();
    });
  });

  // Agency filter tabs
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      agency = btn.dataset.agency;
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      render();
    });
  });

  // Sort
  document.getElementById('sortSelect').addEventListener('change', e => {
    sort = e.target.value;
    render();
  });

  // Refresh button
  document.getElementById('refreshBtn')?.addEventListener('click', () => {
    liveTours = null;
    fetchTours();
  });

  // ── SEARCH PANEL CONTROLS ────────────────

  // Date input — dim the ±3 toggle when no date chosen
  document.getElementById('filterDate')?.addEventListener('change', e => {
    filterDate = e.target.value;
    const deltaField = document.getElementById('deltaField');
    if (deltaField) deltaField.style.opacity = filterDate ? '1' : '0.4';
    render(); // date filter is client-side: instant update
  });

  // ±3 days checkbox
  document.getElementById('filterDelta')?.addEventListener('change', e => {
    filterDelta = e.target.checked;
    render(); // client-side
  });

  // Nights from/to — re-fetch when changed (server param)
  document.getElementById('filterNightsFrom')?.addEventListener('change', e => {
    filterNightsFrom = Math.max(1, parseInt(e.target.value) || 7);
    if (filterNightsTo < filterNightsFrom) {
      filterNightsTo = filterNightsFrom;
      document.getElementById('filterNightsTo').value = filterNightsTo;
    }
  });

  document.getElementById('filterNightsTo')?.addEventListener('change', e => {
    filterNightsTo = Math.max(filterNightsFrom, parseInt(e.target.value) || 7);
  });

  // Adults counter — client-side only (updates price display)
  document.getElementById('adultsDown')?.addEventListener('click', () => {
    if (filterAdults <= 1) return;
    filterAdults--;
    document.getElementById('adultsVal').textContent = filterAdults;
    render();
  });

  document.getElementById('adultsUp')?.addEventListener('click', () => {
    if (filterAdults >= 8) return;
    filterAdults++;
    document.getElementById('adultsVal').textContent = filterAdults;
    render();
  });

  // Search button — re-fetch with new nights params
  document.getElementById('searchBtn')?.addEventListener('click', () => {
    liveTours = null;
    fetchTours();
  });

  syncFilterUI();
  applyI18n();

  render();
  fetchTours();
}

document.addEventListener('DOMContentLoaded', init);
