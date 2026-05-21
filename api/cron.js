'use strict';
// Runs every 2 hours via Vercel Cron.
// Fetches all 5 countries and writes results to KV.
// Users never trigger a scrape — they only read from KV.

const { kv } = require('@vercel/kv');
const { fetchAllCountry } = require('./_lib');

const COUNTRIES = ['vietnam', 'thailand', 'turkey', 'uae', 'egypt'];
const KV_TTL    = 90000; // 25 hours — slightly longer than cron interval so data never expires between runs

module.exports = async function handler(req, res) {
  // Vercel automatically sends CRON_SECRET in Authorization header
  if (process.env.CRON_SECRET &&
      req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const results = await Promise.allSettled(
    COUNTRIES.map(async country => {
      const data = await fetchAllCountry({ country, nightsFrom: 7, nightsTo: 9, adults: 2 });
      await kv.set(`tours:${country}:7:9:2`, data, { ex: KV_TTL });
      return { country, count: data.tours.length };
    })
  );

  const summary = results.map((r, i) =>
    r.status === 'fulfilled'
      ? { country: COUNTRIES[i], count: r.value.count, ok: true }
      : { country: COUNTRIES[i], error: r.reason?.message, ok: false }
  );

  console.log('[cron] refresh complete:', JSON.stringify(summary));
  res.status(200).json({ refreshed: summary, time: new Date().toISOString() });
};
