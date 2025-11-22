const express = require('express');
const cors = require('cors');

// Support de fetch universel (node-fetch si nécessaire)
let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

const app = express();
app.use(cors());

// ENDPOINT PRINCIPAL : Récupère les données Binance 1h et 4h
app.get('/api/market', async (req, res) => {
  const symbol = (req.query.symbol || 'BTCUSDT').toUpperCase();

  try {
    const url1h = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=200`;
    const url4h = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=200`;

    const [k1hRes, k4hRes] = await Promise.all([
      fetchFn(url1h),
      fetchFn(url4h)
    ]);

    const k1h = await k1hRes.json();
    const k4h = await k4hRes.json();

    const mapKlines = rows =>
      rows.map(r => ({
        openTime: r[0],
        open: +r[1],
        high: +r[2],
        low: +r[3],
        close: +r[4],
        volume: +r[5]
      }));

    res.json({
      symbol,
      ohlcv_1h: mapKlines(k1h),
      ohlcv_4h: mapKlines(k4h)
    });

  } catch (e) {
    res.status(500).json({ error: 'server_error', details: String(e) });
  }
});

// Render utilise process.env.PORT (obligatoire)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("VisionTrader backend online on port", PORT);
});
