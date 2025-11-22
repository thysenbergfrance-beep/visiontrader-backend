const express = require("express");
const cors = require("cors");

// fetch universel (Node 18+ a déjà fetch, sinon node-fetch)
let fetchFn = global.fetch;
if (!fetchFn) {
  fetchFn = (...args) =>
    import("node-fetch").then(({ default: fetch }) => fetch(...args));
}

const app = express();
app.use(cors());

// ---------------------------
//   UTILITAIRE SYMBOL -> OKX
// ---------------------------
// On accepte soit : BTCUSDT (style Binance)
// soit : BTC-USDT (style OKX)
// et on retourne un instId OKX du type "BTC-USDT"
function toOkxInstId(symbolRaw) {
  const s = (symbolRaw || "BTCUSDT").toUpperCase().trim();

  // déjà au format OKX avec tiret
  if (s.includes("-")) return s;

  // format classique BASEUSDT
  const QUOTES = ["USDT", "USDC", "BTC", "ETH"];
  for (const q of QUOTES) {
    if (s.endsWith(q)) {
      const base = s.slice(0, -q.length);
      if (base.length > 0) {
        return `${base}-${q}`;
      }
    }
  }

  // fallback
  return s;
}

// ---------------------------
//      FETCH CANDLES OKX
// ---------------------------
// OKX : GET /api/v5/market/candles?instId=BTC-USDT&bar=1H&limit=200
async function fetchOkxCandles(instId, bar) {
  const url = `https://www.okx.com/api/v5/market/candles?instId=${encodeURIComponent(
    instId
  )}&bar=${encodeURIComponent(bar)}&limit=200`;

  const res = await fetchFn(url, {
    headers: {
      "User-Agent": "VisionTraderBot/1.0",
      Accept: "application/json",
    },
  });

  const json = await res.json();

  // OKX : code === "0" => OK
  if (!json || json.code !== "0" || !Array.isArray(json.data)) {
    throw new Error(
      `OKX error for ${instId} ${bar}: ${JSON.stringify(json)}`
    );
  }

  // json.data : array de [ts, o, h, l, c, vol, volCcy, volCcyQuote, ...]
  // OKX renvoie les plus récentes en premier -> on reverse pour avoir du plus ancien au plus récent
  const rows = [...json.data].reverse();

  return rows.map((r) => ({
    timestamp: Number(r[0]),
    open: parseFloat(r[1]),
    high: parseFloat(r[2]),
    low: parseFloat(r[3]),
    close: parseFloat(r[4]),
    volume: parseFloat(r[5]),
  }));
}

// ---------------------------
//       ENDPOINT PRINCIPAL
// ---------------------------
app.get("/api/market", async (req, res) => {
  try {
    const symbol = req.query.symbol || "BTCUSDT";
    const instId = toOkxInstId(symbol); // ex : BTC-USDT

    const [klines1h, klines4h] = await Promise.all([
      fetchOkxCandles(instId, "1H"),
      fetchOkxCandles(instId, "4H"),
    ]);

    res.json({
      provider: "okx",
      symbol: symbol.toUpperCase(),
      instId,
      ohlcv_1h: klines1h,
      ohlcv_4h: klines4h,
    });
  } catch (e) {
    console.error("VisionTrader OKX backend error:", e);
    res.status(500).json({
      error: "server_error",
      details: e.toString(),
    });
  }
});

// ---------------------------
//       LANCEMENT SERVEUR
// ---------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("VisionTrader OKX backend ONLINE on port", PORT);
});
