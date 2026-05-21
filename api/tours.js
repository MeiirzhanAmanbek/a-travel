'use strict';

const { fetchAllCountry } = require('./_lib');

// Lazy-load KV — works fine if env vars aren't set yet (local dev)
let kv = null;
try {
  if (process.env.KV_REST_API_URL) kv = require('@vercel/kv').kv;
} catch { /* @vercel/kv not installed */ }

const VALID_COUNTRIES = ['vietnam','thailand','turkey','uae','egypt'];
const KV_TTL = 90000; // 25 hours — matches cron interval with buffer

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const nightsFrom = Math.max(1, parseInt(req.query?.nightsFrom) || 7);
  const nightsTo   = Math.max(nightsFrom, parseInt(req.query?.nightsTo) || 9);
  const country    = VALID_COUNTRIES.includes(req.query?.country) ? req.query.country : 'vietnam';
  const adults     = Math.min(8, Math.max(1, parseInt(req.query?.adults) || 2));

  const cacheKey = `tours:${country}:${nightsFrom}:${nightsTo}:${adults}`;

  // ── 1. Try KV cache ────────────────────────
  if (kv) {
    try {
      const cached = await kv.get(cacheKey);
      if (cached) return res.status(200).json({ ...cached, cached: true });
    } catch { /* KV unavailable, fall through */ }
  }

  // ── 2. Live fetch (cache miss) ─────────────
  const data = await fetchAllCountry({ country, nightsFrom, nightsTo, adults });

  // ── 3. Store result in KV for next requests ─
  if (kv) {
    try { await kv.set(cacheKey, data, { ex: KV_TTL }); } catch { /* ignore */ }
  }

  res.status(200).json(data);
};
