const express = require("express");
const cors = require("cors");

let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
}

const app = express();
app.use(cors());

// Binance endpoints fallback (pour bypass restriction)
const BINANCE_BASE = [
  "https://api1.binance.com",
  "https://api2.binance.com",
  "https://api3.binance.com"
];

async function fetchKlines(symbol, interval) {
  const params = `symbol=${symbol}&interval=${interval}&limit=200`;

  for (const base of BINANCE_BASE) {
    try {
      const r = await fetchFn(`${base}/api/v3/klines?${params}`);
      const json = await r.json();
      if (Array.isArray(json)) return json;
    } catch (e) {}
  }

  return null;
}

function safeMapKlines(data) {
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

app.get("/api/market", async (req, res) => {
  const symbol = req.query.symbol || "BTCUSDT";

  try {
    const k1h = await fetchKlines(symbol, "1h");
    const k4h = await fetchKlines(symbol, "4h");

    if (!k1h || !k4h) {
      return res.json({
        symbol,
        error: "binance_blocked_or_unreachable",
        details: "All fallback endpoints failed"
      });
    }

    res.json({
      symbol,
      ohlcv_1h: safeMapKlines(k1h),
      ohlcv_4h: safeMapKlines(k4h)
    });

  } catch (e) {
    res.json({
      error: "server_error",
      details: e.toString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("VisionTrader backend ONLINE on port", PORT));
