const express = require("express");
const cors = require("cors");

// Support node-fetch (ESM import)
let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
}

const app = express();
app.use(cors());

// SAFE PARSE FUNCTION
function safeMapKlines(data) {
  // Si pas un tableau → retourne tableau vide
  if (!Array.isArray(data)) return [];

  return data.map(r => ({
    opentime: r[0],
    open: +r[1],
    high: +r[2],
    low: +r[3],
    close: +r[4],
    volume: +r[5]
  }));
}

// ===============================
//           MAIN ENDPOINT
// ===============================
app.get("/api/market", async (req, res) => {
  const symbol = req.query.symbol || "BTCUSDT";

  const url1h = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=100`;
  const url4h = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=100`;

  try {
    const [r1h, r4h] = await Promise.all([
      fetchFn(url1h),
      fetchFn(url4h)
    ]);

    const k1h = await r1h.json();
    const k4h = await r4h.json();

    res.json({
      symbol,
      ohlcv_1h: safeMapKlines(k1h),
      ohlcv_4h: safeMapKlines(k4h)
    });

  } catch (e) {
    res.status(500).json({ error: "server_error", details: e.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("VisionTrader backend ONLINE on port", PORT));
