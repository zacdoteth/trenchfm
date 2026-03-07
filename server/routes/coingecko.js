import { Router } from "express";

const router = Router();
const API_BASE = "https://pro-api.coingecko.com/api/v3";
const ONCHAIN_BASE = "https://pro-api.coingecko.com/api/v3/onchain";
const API_KEY = process.env.COINGECKO_API_KEY || "";

// ═══ In-memory cache ═══
const cache = new Map();
function cached(key, ttlMs, fetcher) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  const promise = fetcher().then((data) => {
    cache.set(key, { ts: Date.now(), data });
    return data;
  }).catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { ts: Date.now(), data: promise });
  return promise;
}

function cgHeaders() {
  return { "x-cg-pro-api-key": API_KEY, Accept: "application/json" };
}

// ═══ Trending pools on Solana (GeckoTerminal on-chain data) ═══
// GET /api/coingecko/trending
router.get("/trending", async (_req, res) => {
  if (!API_KEY) return res.status(503).json({ error: "CoinGecko API key not configured" });
  try {
    const data = await cached("cg:trending", 60_000, async () => {
      const r = await fetch(`${ONCHAIN_BASE}/networks/solana/trending_pools?page=1`, { headers: cgHeaders() });
      if (!r.ok) throw new Error(`CG trending ${r.status}`);
      return r.json();
    });
    res.json(data);
  } catch (e) {
    console.error("[coingecko/trending]", e.message);
    res.status(502).json({ error: e.message });
  }
});

// ═══ Token data by mint address ═══
// GET /api/coingecko/token/:mint
router.get("/token/:mint", async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: "CoinGecko API key not configured" });
  const { mint } = req.params;
  try {
    const data = await cached(`cg:token:${mint}`, 15_000, async () => {
      const r = await fetch(`${ONCHAIN_BASE}/networks/solana/tokens/${mint}`, { headers: cgHeaders() });
      if (!r.ok) throw new Error(`CG token ${r.status}`);
      return r.json();
    });
    res.json(data);
  } catch (e) {
    console.error("[coingecko/token]", e.message);
    res.status(502).json({ error: e.message });
  }
});

// ═══ Token info (metadata, socials, description) ═══
// GET /api/coingecko/token/:mint/info
router.get("/token/:mint/info", async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: "CoinGecko API key not configured" });
  const { mint } = req.params;
  try {
    const data = await cached(`cg:info:${mint}`, 300_000, async () => {
      const r = await fetch(`${ONCHAIN_BASE}/networks/solana/tokens/${mint}/info`, { headers: cgHeaders() });
      if (!r.ok) throw new Error(`CG token info ${r.status}`);
      return r.json();
    });
    res.json(data);
  } catch (e) {
    console.error("[coingecko/token/info]", e.message);
    res.status(502).json({ error: e.message });
  }
});

// ═══ Top pools for a token ═══
// GET /api/coingecko/token/:mint/pools
router.get("/token/:mint/pools", async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: "CoinGecko API key not configured" });
  const { mint } = req.params;
  try {
    const data = await cached(`cg:pools:${mint}`, 30_000, async () => {
      const r = await fetch(`${ONCHAIN_BASE}/networks/solana/tokens/${mint}/pools?page=1`, { headers: cgHeaders() });
      if (!r.ok) throw new Error(`CG pools ${r.status}`);
      return r.json();
    });
    res.json(data);
  } catch (e) {
    console.error("[coingecko/token/pools]", e.message);
    res.status(502).json({ error: e.message });
  }
});

// ═══ Pool OHLCV ═══
// GET /api/coingecko/ohlcv/:poolAddress?timeframe=hour&aggregate=1&limit=24
router.get("/ohlcv/:poolAddress", async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: "CoinGecko API key not configured" });
  const { poolAddress } = req.params;
  const { timeframe = "minute", aggregate = "5", limit = "72" } = req.query;
  try {
    const cacheKey = `cg:ohlcv:${poolAddress}:${timeframe}:${aggregate}:${limit}`;
    const data = await cached(cacheKey, 30_000, async () => {
      const r = await fetch(
        `${ONCHAIN_BASE}/networks/solana/pools/${poolAddress}/ohlcv/${timeframe}?aggregate=${aggregate}&limit=${limit}&currency=usd`,
        { headers: cgHeaders() }
      );
      if (!r.ok) throw new Error(`CG ohlcv ${r.status}`);
      return r.json();
    });
    res.json(data);
  } catch (e) {
    console.error("[coingecko/ohlcv]", e.message);
    res.status(502).json({ error: e.message });
  }
});

// ═══ Top holders (Analyst+ exclusive) ═══
// GET /api/coingecko/token/:mint/holders
router.get("/token/:mint/holders", async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: "CoinGecko API key not configured" });
  const { mint } = req.params;
  try {
    const data = await cached(`cg:holders:${mint}`, 60_000, async () => {
      const r = await fetch(`${ONCHAIN_BASE}/networks/solana/tokens/${mint}/top_holders`, { headers: cgHeaders() });
      if (!r.ok) throw new Error(`CG holders ${r.status}`);
      return r.json();
    });
    res.json(data);
  } catch (e) {
    console.error("[coingecko/holders]", e.message);
    res.status(502).json({ error: e.message });
  }
});

// ═══ Top traders (Analyst+ exclusive) ═══
// GET /api/coingecko/token/:mint/traders
router.get("/token/:mint/traders", async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: "CoinGecko API key not configured" });
  const { mint } = req.params;
  try {
    const data = await cached(`cg:traders:${mint}`, 60_000, async () => {
      const r = await fetch(`${ONCHAIN_BASE}/networks/solana/tokens/${mint}/top_traders`, { headers: cgHeaders() });
      if (!r.ok) throw new Error(`CG traders ${r.status}`);
      return r.json();
    });
    res.json(data);
  } catch (e) {
    console.error("[coingecko/traders]", e.message);
    res.status(502).json({ error: e.message });
  }
});

// ═══ Recent trades for a token ═══
// GET /api/coingecko/token/:mint/trades
router.get("/token/:mint/trades", async (req, res) => {
  if (!API_KEY) return res.status(503).json({ error: "CoinGecko API key not configured" });
  const { mint } = req.params;
  try {
    const data = await cached(`cg:trades:${mint}`, 15_000, async () => {
      const r = await fetch(`${ONCHAIN_BASE}/networks/solana/tokens/${mint}/trades`, { headers: cgHeaders() });
      if (!r.ok) throw new Error(`CG trades ${r.status}`);
      return r.json();
    });
    res.json(data);
  } catch (e) {
    console.error("[coingecko/trades]", e.message);
    res.status(502).json({ error: e.message });
  }
});

export default router;
