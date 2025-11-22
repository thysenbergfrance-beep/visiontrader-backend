const express = require("express");
const cors = require("cors");

// fetch universel
let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
}

const app = express();
app.use(cors());

// =========================
//     SAFE KLINE PARSER
// =========================
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

// =========================
// MAIN API ENDPOINT
// =========================
app.get("/api/market", async (req, res) => {
  const symbol = req.query.symbol || "BTCUSDT";

  const url1h = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1h&limit=200`;
  const url4h = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=200`;

  try {
    const headers = {
      "User-Agent": "Mozilla/5.0 VisionTraderBot",
      "Accept": "application/json"
    };

    const [r1h, r4h] = await Promise.all([
      fetchFn(url1h, { headers }),
      fetchFn(url4h, { headers })
    ]);

    const json1h = await r1h.json();
    const json4h = await r4h.json();

    // 🔥 DEBUG BINANCE ERROR
    if (!Array.isArray(json1h)) {
      return res.json({
        symbol,
        error: "binance_1h_error",
        details: json1h
      });
    }

    if (!Array.isArray(json4h)) {
      return res.json({
        symbol,
        error: "binance_4h_error",
        details: json4h
      });
    }

    res.json({
      symbol,
      ohlcv_1h: safeMapKlines(json1h),
      ohlcv_4h: safeMapKlines(json4h)
    });

  } catch (e) {
    res.status(500).json({
      error: "server_error",
      details: e.toString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("VisionTrader backend ONLINE on port", PORT));
