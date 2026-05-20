'use strict';
// Vercel serverless — happy-travel.kz via Tourvisor API (no Playwright)

const https = require('https');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const HT_UKEY = '20e21f93e0c7dcc4b6c655094441c9eb';
const HT_BKEY = 'a18db8b9b7ec67ad61702c5ae1dddd36';
const EMPTY_FILTERS = {
  airlines:[], beachTypes:[], datesList:[], hotelServices:[],
  hotelsIds:[], mealIds:[], nightsList:[], ratings:[],
  regionsIds:[], seaLines:[], stars:[],
  smartfilters:null, priceMax:0, priceMin:0,
  onlyRecommendedHotels:false, onlySmart:false,
};

function todayISO() { return new Date().toISOString().slice(0, 10); }
function daysFromNow(n) { return new Date(Date.now() + n*24*60*60*1000).toISOString().slice(0,10); }
function isoToDDMMYYYY(iso) { const [y,m,d]=iso.split('-'); return `${d}.${m}.${y}`; }
function formatDate(iso) { return iso ? isoToDDMMYYYY(iso) : ''; }

function mapDest(text) {
  const t=(text||'').toLowerCase();
  if(t.includes('нячанг')||t.includes('камрань')||t.includes('nha trang')||t.includes('cam ranh')) return 'nha-trang';
  if(t.includes('фу куок')||t.includes('фукуок')||t.includes('phu quoc')) return 'phu-quoc';
  if(t.includes('дананг')||t.includes('da nang')||t.includes('danang')) return 'da-nang';
  if(t.includes('хошимин')||t.includes('хо ши мин')||t.includes('ho chi minh')||t.includes('сайгон')) return 'ho-chi-minh';
  if(t.includes('ханой')||t.includes('hanoi')) return 'hanoi';
  if(t.includes('фантьет')||t.includes('муйне')||t.includes('phan thiet')||t.includes('mui ne')) return 'nha-trang';
  return 'nha-trang';
}
function mapMeal(s, f) {
  const sU=(s||'').toUpperCase(), fL=(f||'').toLowerCase();
  if(sU==='AI'||fL.includes('все включено')||fL.includes('all inclusive')) return 'all-inclusive';
  if(sU==='HB'||fL.includes('полупансион')||fL.includes('half board')||fL.includes('ужин')) return 'half-board';
  if(sU==='BB'||fL.includes('завтрак')||fL.includes('breakfast')) return 'breakfast';
  return 'breakfast';
}
function mapRoom(r) {
  const n=(r||'').toLowerCase();
  if(n.includes('suite')||n.includes('сюит')) return 'suite';
  if(n.includes('deluxe')||n.includes('делюкс')) return 'deluxe';
  if(n.includes('superior')||n.includes('улучшен')) return 'superior';
  return 'standard';
}

function fetchJSON(url, extraHeaders={}) {
  return new Promise((resolve,reject)=>{
    const req=https.get(url,{
      headers:{'User-Agent':UA,'Accept':'application/json',...extraHeaders},
      timeout:10000,
    },res=>{
      let d=''; res.on('data',c=>d+=c);
      res.on('end',()=>{ try{resolve(JSON.parse(d))}catch(e){reject(new Error('parse:'+d.slice(0,80)))} });
    });
    req.on('error',reject);
    req.on('timeout',()=>{req.destroy();reject(new Error('Timeout'))});
  });
}

function postJSON(hostname,path,body) {
  return new Promise((resolve,reject)=>{
    const data=JSON.stringify(body);
    const req=https.request({
      hostname,path,method:'POST',
      headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(data),'User-Agent':UA,'Referer':'https://ht.kz/','Origin':'https://ht.kz'},
      timeout:10000,
    },res=>{
      let d=''; res.on('data',c=>d+=c);
      res.on('end',()=>{ try{resolve(JSON.parse(d))}catch(e){reject(new Error('parse:'+d.slice(0,80)))} });
    });
    req.on('error',reject);
    req.on('timeout',()=>{req.destroy();reject(new Error('Timeout'))});
    req.write(data); req.end();
  });
}

// ── HT.KZ (fast: 3s wait + 1 poll) ───────
async function fetchHT({ nightsFrom=7, nightsTo=7 }={}) {
  const today=todayISO(), dateTo=daysFromNow(60);
  const qBase=()=>Date.now()+Math.random().toString(36).slice(2,8);

  const init=await postJSON('ws.ht.kz',
    `/v1/search/web?query-id=${qBase()}&query-start-time=${Date.now()}&dbg-type=desktop&dbg-event-id=1`,
    { type:0, ukey:HT_UKEY, bkey:HT_BKEY,
      params:{ adults:2, childAges:[], countryId:7, dateFrom:today, dateTo,
        departCityId:1, groupMode:1, hotels:[], nightsFrom, nightsTo,
        onlyHotels:false, currency:'kzt' } }
  );
  const uuid=init.id;
  await new Promise(r=>setTimeout(r,3000));
  const page1=await postJSON('ws.ht.kz',
    `/v1/search/web/${uuid}?id=${uuid}&page=1&size=200&sort=price&currency=kzt&query-id=${qBase()}`,
    EMPTY_FILTERS
  );
  return (page1.tours||[])
    .filter(t=>t.price?.value>0 && t.nights>=nightsFrom && t.nights<=nightsTo)
    .map((t,i)=>{
      const departure=formatDate(t.dateFrom);
      const link=`https://ht.kz/findtours?region=&departCity=1&country=7&hotel=${t.hotelId}&daysFrom=${nightsFrom}&daysTo=${nightsTo}&stars=any&adult=2&child=0&childAges=&splitRooms=&search=1&dateFrom=${departure}&delta=1&bank=`;
      return { id:`ht_${i}`, agency:'ht.kz', badge:'badge-ht',
        dest:mapDest(t.region||''),
        hotel:(t.hotelName||'Vietnam Hotel').replace(/\d\*\s*$/,'').trim(),
        stars:t.stars||3, meal:mapMeal('',t.meal||''),
        departure, nights:t.nights, flight:'Air Astana',
        room:mapRoom(t.room||''), price:Math.round(t.price.value/2),
        available:null, link };
    });
}

// ── HAPPY-TRAVEL.KZ (Tourvisor, 4s wait) ──
async function fetchHappyTravel({ nightsFrom=7, nightsTo=7 }={}) {
  const dateFrom=isoToDDMMYYYY(todayISO()), dateTo=isoToDDMMYYYY(daysFromNow(60));
  const ref='https%3A%2F%2Fhappy-travel.kz%2Ftur.php';
  const hdrs={ 'Referer':'https://happy-travel.kz/tur.php', 'Accept':'application/json' };

  const search=await fetchJSON(
    `https://tourvisor.ru/xml/modsearch.php?datefrom=${dateFrom}&dateto=${dateTo}&directflight=0&regular=1&nightsfrom=${nightsFrom}&nightsto=${nightsTo}&adults=2&child=0&meal=0&rating=0&country=16&departure=60&currency=3&formmode=0&referrer=${ref}&session=`,
    hdrs
  );
  const requestId=search.result?.requestid;
  if(!requestId) throw new Error('No requestid');

  const operatorMap={};
  for(const op of (search.result?.operators||[])) operatorMap[op.id]=op.name;

  await new Promise(r=>setTimeout(r,4000));

  let data=null;
  for(const host of ['search2.tourvisor.ru','search3.tourvisor.ru']){
    try{
      const res=await fetchJSON(`https://${host}/modresult.php?requestid=${requestId}&referrer=${ref}&session=`,hdrs);
      if(res.data?.block?.length){ data=res.data; break; }
    }catch{ /* try next */ }
  }
  if(!data) throw new Error('No Tourvisor results');

  const decode=data.decode||{};
  const tours=[];
  for(const block of (data.block||[])){
    for(const hotel of (block.hotel||[])){
      const bestTour=[...(hotel.tour||[])].sort((a,b)=>a.pr-b.pr)[0];
      if(!bestTour?.pr) continue;
      const hotelInfo=decode.hotels?.[hotel.id]||{};
      const mealInfo=decode.meal?.[bestTour.ml]||{};
      const roomInfo=decode.rooms?.[bestTour.rm]||{};
      const departure=formatDate(bestTour.dt);
      const depDDMMYYYY=isoToDDMMYYYY(bestTour.dt);
      const link=`https://happy-travel.kz/tur.php?ts_dosearch=1&s_form_mode=0&s_nights_from=${nightsFrom}&s_nights_to=${nightsTo}&s_directflight=0&s_regular=1&s_j_date_from=${depDDMMYYYY}&s_j_date_to=${depDDMMYYYY}&s_adults=2&s_flyfrom=60&s_country=16&s_currency=3`;
      tours.push({
        id:`happy_${hotel.id}`, agency:'happy-travel.kz', badge:'badge-happy',
        dest:mapDest(hotelInfo.region||''),
        hotel:(hotelInfo.name||'Vietnam Hotel').trim(),
        stars:parseInt(hotelInfo.stars||'3')||3,
        meal:mapMeal('',mealInfo.name||''),
        departure, nights:bestTour.nt,
        flight:operatorMap[bestTour.op]||'Тур-оператор',
        room:mapRoom(roomInfo.name||''),
        price:Math.round(bestTour.pr/2),
        available:null, link,
      });
    }
  }
  tours.sort((a,b)=>a.price-b.price);
  return tours;
}

// ── GOTUR.KZ ──────────────────────────────
async function fetchGotur({ nightsFrom=7, nightsTo=7 }={}) {
  const date=todayISO();
  const tours=await fetchJSON(
    `https://www.gotur.kz/country/load-tours.html?countryAlias=vietnam&departCityAlias=almaty&date=${date}&nights=${nightsFrom}&nightsTo=${nightsTo}`,
    { Referer:'https://www.gotur.kz/tury/vietnam/almaty.html' }
  );
  if(!Array.isArray(tours)) throw new Error('Expected array');
  return tours
    .filter(t=>t.price?.forOne>0 && t.totalNights>=nightsFrom && t.totalNights<=nightsTo)
    .map((t,i)=>({
      id:`gotur_${i}`, agency:'gotour.kz', badge:'badge-gotour',
      dest:mapDest(t.region?.name||''),
      hotel:(t.hotel?.name||'Vietnam Hotel').replace(/\d\*\s*$/,'').trim(),
      stars:parseInt(t.hotel?.class||'3')||3,
      meal:mapMeal(t.meal?.shortName,t.meal?.name),
      departure:formatDate(t.checkIn), nights:t.totalNights,
      flight:(t.airlineCodes?.length?t.airlineCodes[0]:null)||'VietJet Air',
      room:mapRoom(t.room?.name),
      price:t.price.forOne, available:null,
      link:`https://www.gotur.kz/tour/view.html?tour=${t.id}`,
    }));
}

// ── HANDLER ───────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const nightsFrom=Math.max(1,parseInt(req.query?.nightsFrom)||7);
  const nightsTo=Math.max(nightsFrom,parseInt(req.query?.nightsTo)||7);
  const t0=Date.now();

  const [htRes, happyRes, goturRes]=await Promise.allSettled([
    fetchHT({nightsFrom,nightsTo}),
    fetchHappyTravel({nightsFrom,nightsTo}),
    fetchGotur({nightsFrom,nightsTo}),
  ]);

  const ht    = htRes.status    ==='fulfilled' ? htRes.value    : [];
  const happy = happyRes.status ==='fulfilled' ? happyRes.value : [];
  const gotur = goturRes.status ==='fulfilled' ? goturRes.value : [];

  const htTop    = [...ht].sort((a,b)=>a.price-b.price).slice(0,15);
  const happyTop = [...happy].sort((a,b)=>a.price-b.price).slice(0,15);
  const goturTop = [...gotur].sort((a,b)=>a.price-b.price).slice(0,10);

  const all=[...htTop,...happyTop,...goturTop];
  all.sort((a,b)=>a.price-b.price);

  const seen=new Set();
  const tours=all.filter(t=>{
    const key=`${t.hotel.toLowerCase().slice(0,20)}_${t.departure}_${t.price}`;
    if(seen.has(key)) return false;
    seen.add(key); return true;
  }).map((t,i)=>({...t,id:`tour_${i+1}`}));

  res.status(200).json({
    tours,
    updated:new Date().toISOString(),
    count:tours.length,
    elapsed:+((Date.now()-t0)/1000).toFixed(1),
    cached:false,
    sources:{
      'ht.kz':          htRes.status==='fulfilled'    ? ht.length    : 'error',
      'happy-travel.kz':happyRes.status==='fulfilled' ? happy.length : 'error',
      'gotour.kz':      goturRes.status==='fulfilled' ? gotur.length : 'error',
    },
  });
};
