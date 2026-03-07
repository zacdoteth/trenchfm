// ═══════════════════════════════════════════════════════
// frontrun.js — Solana Trading (proxied through /api)
// API key stays server-side. WebSocket + Jupiter stay client-side.
// ═══════════════════════════════════════════════════════

import { io } from "socket.io-client";
import { apiFetch } from "./api.js";

const WS_URL = "wss://solana.frontrun.pro";
const WS_PATH = "/trading/socket.io";
const DEX_SEARCH_URL = "https://api.dexscreener.com/latest/dex/search";
const SEARCH_CACHE_TTL_MS = 15_000;

// Active wallet address — set after auth
let activeWallet = null;

export function setActiveWallet(address) {
  activeWallet = address;
}

export function getActiveWallet() {
  return activeWallet;
}

// ═══ REST (proxied through server) ═══

export async function getWalletBalance() {
  const data = await apiFetch("/api/wallets/balance");
  return data;
}

export async function executeTrade({
  tokenMint,
  side,
  uiInputAmount,
  sellPercent,
  slippageBasisPoint = 500,
  confirmationMode = "ASYNC",
  commitment,
}) {
  const body = { tokenMint, side, slippageBasisPoint, confirmationMode };
  if (commitment) body.commitment = commitment;
  if (side === "SELL" && sellPercent != null) {
    body.sellPercent = sellPercent;
  } else {
    body.uiInputAmount = uiInputAmount;
  }
  const json = await apiFetch("/api/trade", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return json.data;
}

// ═══ SOL PRICE (Jupiter — no secrets needed) ═══

const SOL_MINT = "So11111111111111111111111111111111111111112";
let cachedSolPrice = null;
let priceLastFetched = 0;

export async function getSolPrice() {
  const now = Date.now();
  if (cachedSolPrice && now - priceLastFetched < 30_000) return cachedSolPrice;
  try {
    const res = await fetch(
      `https://api.jup.ag/price/v2?ids=${SOL_MINT}`
    );
    const json = await res.json();
    cachedSolPrice = parseFloat(json.data[SOL_MINT]?.price) || 180;
    priceLastFetched = now;
  } catch {
    cachedSolPrice = cachedSolPrice || 180;
  }
  return cachedSolPrice;
}

export function usdToSol(usd, solPrice) {
  return usd / solPrice;
}

// ═══ WEBSOCKET — real-time balance push (no secrets) ═══

let socket = null;
let balanceCallback = null;

export function connectWebSocket(onBalanceUpdate) {
  if (!activeWallet) {
    console.warn("[frontrun] connectWebSocket called before wallet set");
    balanceCallback = onBalanceUpdate;
    return null;
  }

  if (socket?.connected) {
    balanceCallback = onBalanceUpdate;
    return socket;
  }

  balanceCallback = onBalanceUpdate;

  socket = io(WS_URL, {
    path: WS_PATH,
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 10,
  });

  socket.on("trading.connected", () => {
    console.log("[frontrun] ws connected");
    socket.emit("trading.batchSubscribeWallets", {
      wallets: [{ chain: "SOLANA", address: activeWallet }],
    });
  });

  socket.on("trading.batchSubscribed", (data) => {
    console.log("[frontrun] subscribed:", data?.data?.totalSuccess, "wallets");
  });

  socket.on("trading.balanceUpdated", (event) => {
    if (balanceCallback) balanceCallback(event.data);
  });

  socket.on("disconnect", (reason) => {
    console.log("[frontrun] ws disconnected:", reason);
  });

  return socket;
}

export function disconnectWebSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

// ═══ TOKEN SEARCH (DexScreener — free, no auth) ═══

let searchAbort = null;
const searchCache = new Map();

export async function searchTokens(query) {
  if (searchAbort) searchAbort.abort();
  const ctrl = new AbortController();
  searchAbort = ctrl;
  try {
    return await fetchDexSearchResults(query, { signal: ctrl.signal });
  } catch (e) {
    if (e.name === "AbortError") return null; // superseded
    console.warn("[frontrun] search failed:", e.message);
    return [];
  }
}

export async function lookupToken(query) {
  const results = await fetchDexSearchResults(query);
  if (!results.length) return null;

  const normalizedQuery = String(query || "").trim().toLowerCase();
  const normalizedTicker = normalizedQuery.startsWith("$")
    ? normalizedQuery
    : `$${normalizedQuery}`;

  return (
    results.find((result) => result.ca.toLowerCase() === normalizedQuery) ||
    results.find((result) => result.ticker.toLowerCase() === normalizedTicker) ||
    results.find((result) => result.name.toLowerCase() === normalizedQuery) ||
    results[0]
  );
}

async function fetchDexSearchResults(query, { signal } = {}) {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) return [];

  const cacheKey = normalizedQuery.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < SEARCH_CACHE_TTL_MS) {
    return cached.results;
  }

  const res = await fetch(
    `${DEX_SEARCH_URL}?q=${encodeURIComponent(normalizedQuery)}`,
    { signal }
  );
  const json = await res.json();

  // Filter to Solana pairs, dedupe by base token address, take top 20
  const seen = new Set();
  const results = (json.pairs || [])
    .filter((pair) => pair.chainId === "solana" && pair.baseToken?.address)
    .filter((pair) => {
      if (seen.has(pair.baseToken.address)) return false;
      seen.add(pair.baseToken.address);
      return true;
    })
    .slice(0, 20)
    .map(normalizeDexSearchPair);

  searchCache.set(cacheKey, { ts: Date.now(), results });
  return results;
}

function normalizeDexSearchPair(pair) {
  const dayChange = pair.priceChange?.h24 || 0;
  return {
    ticker: "$" + (pair.baseToken.symbol || "???").toUpperCase(),
    name: pair.baseToken.name || "",
    ca: pair.baseToken.address,
    poolAddress: pair.pairAddress || null,
    mcap: fmtNum(pair.marketCap),
    fdv: fmtNum(pair.fdv),
    liq: fmtNum(pair.liquidity?.usd),
    vol: fmtNum(pair.volume?.h24),
    change: `${dayChange >= 0 ? "+" : ""}${dayChange.toFixed(1)}%`,
    positive: dayChange >= 0,
    price: pair.priceUsd || "0",
    imageUrl: pair.info?.imageUrl || null,
    pairUrl: pair.url || null,
    priceChanges: { m5: pair.priceChange?.m5 || 0, h1: pair.priceChange?.h1 || 0, h6: pair.priceChange?.h6 || 0, h24: pair.priceChange?.h24 || 0 },
    dex: pair.dexId || "—",
    headerUrl: pair.info?.header || null,
  };
}

function fmtNum(n) {
  if (!n) return "—";
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toFixed(0);
}

// ═══ TRENDING (CoinGecko Analyst via server → GeckoTerminal fallback) ═══

const TRENDING_URL = "https://api.geckoterminal.com/api/v2/networks/solana/trending_pools";
let trendingCache = null;
let trendingFetchedAt = 0;
const TRENDING_TTL_MS = 60_000;

export async function fetchTrendingSolana() {
  const now = Date.now();
  if (trendingCache && now - trendingFetchedAt < TRENDING_TTL_MS) return trendingCache;

  // Try CoinGecko Analyst (server-proxied) first
  try {
    const json = await apiFetch("/api/coingecko/trending");
    const results = normalizeTrendingPools(json.data || []);
    if (results.length > 0) {
      trendingCache = results;
      trendingFetchedAt = now;
      console.log("[frontrun] trending via CoinGecko:", results.length);
      return results;
    }
  } catch (e) {
    console.warn("[frontrun] CoinGecko trending failed, falling back:", e.message);
  }

  // Fallback: free GeckoTerminal (no auth)
  try {
    const res = await fetch(`${TRENDING_URL}?page=1`);
    const json = await res.json();
    const results = normalizeTrendingPools(json.data || []);
    trendingCache = results;
    trendingFetchedAt = now;
    return results;
  } catch (e) {
    console.warn("[frontrun] trending fetch failed:", e.message);
    return trendingCache || [];
  }
}

function normalizeTrendingPools(pools) {
  const seen = new Set();
  return pools
    .filter((p) => {
      const mint = p.relationships?.base_token?.data?.id?.replace("solana_", "");
      if (!mint || seen.has(mint)) return false;
      seen.add(mint);
      return true;
    })
    .slice(0, 24)
    .map((p) => {
      const a = p.attributes;
      const mint = p.relationships.base_token.data.id.replace("solana_", "");
      const name = (a.name || "").split(" / ")[0].trim();
      const symbol = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
      const dayChange = parseFloat(a.price_change_percentage?.h24) || 0;
      const pcp = a.price_change_percentage || {};
      return {
        ticker: "$" + symbol,
        name,
        ca: mint,
        poolAddress: a.address || null,
        mcap: fmtNum(parseFloat(a.market_cap_usd) || parseFloat(a.fdv_usd)),
        fdv: fmtNum(parseFloat(a.fdv_usd)),
        liq: fmtNum(parseFloat(a.reserve_in_usd)),
        vol: fmtNum(parseFloat(a.volume_usd?.h24)),
        change: `${dayChange >= 0 ? "+" : ""}${dayChange.toFixed(1)}%`,
        positive: dayChange >= 0,
        price: a.base_token_price_usd || "0",
        imageUrl: a.image_url || null,
        pairUrl: null,
        priceChanges: { m5: parseFloat(pcp.m5) || 0, h1: parseFloat(pcp.h1) || 0, h6: parseFloat(pcp.h6) || 0, h24: dayChange },
        dex: "—",
        headerUrl: null,
      };
    });
}

// ═══ CHART DATA (CoinGecko Analyst via server → GeckoTerminal fallback) ═══

const OHLCV_BASE = "https://api.geckoterminal.com/api/v2/networks/solana/pools";
const chartCache = new Map();
const CHART_TTL_MS = 30_000;

export async function fetchTokenChart(poolAddress, timeframe = "1h") {
  if (!poolAddress) return null;
  const key = `${poolAddress}_${timeframe}`;
  const hit = chartCache.get(key);
  if (hit && Date.now() - hit.ts < CHART_TTL_MS) return hit.data;

  const cfg = { "1m": { tf: "minute", agg: 1, lim: 60 }, "5m": { tf: "minute", agg: 5, lim: 60 }, "1h": { tf: "minute", agg: 5, lim: 72 }, "1d": { tf: "hour", agg: 1, lim: 24 } };
  const { tf, agg, lim } = cfg[timeframe] || cfg["1h"];

  // Try CoinGecko Analyst (server-proxied) first
  try {
    const json = await apiFetch(`/api/coingecko/ohlcv/${poolAddress}?timeframe=${tf}&aggregate=${agg}&limit=${lim}`);
    const candles = json.data?.attributes?.ohlcv_list || [];
    const closes = candles.map(c => parseFloat(c[4])).reverse();
    if (closes.length >= 2) {
      chartCache.set(key, { ts: Date.now(), data: closes });
      return closes;
    }
  } catch (e) {
    console.warn("[frontrun] CoinGecko OHLCV failed, falling back:", e.message);
  }

  // Fallback: free GeckoTerminal
  try {
    const res = await fetch(`${OHLCV_BASE}/${poolAddress}/ohlcv/${tf}?aggregate=${agg}&limit=${lim}&currency=usd`);
    const json = await res.json();
    const candles = json.data?.attributes?.ohlcv_list || [];
    const closes = candles.map(c => parseFloat(c[4])).reverse();
    if (closes.length < 2) return null;
    chartCache.set(key, { ts: Date.now(), data: closes });
    return closes;
  } catch (e) {
    console.warn("[frontrun] chart fetch failed:", e.message);
    return null;
  }
}

// Look up pool address for a token mint (needed for chart fetch)
export async function findPoolAddress(tokenMint) {
  if (!tokenMint) return null;

  // Try CoinGecko first
  try {
    const json = await apiFetch(`/api/coingecko/token/${tokenMint}/pools`);
    const addr = json.data?.[0]?.attributes?.address;
    if (addr) return addr;
  } catch {}

  // Fallback: free GeckoTerminal
  try {
    const res = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${tokenMint}/pools?page=1`);
    const json = await res.json();
    return json.data?.[0]?.attributes?.address || null;
  } catch {
    return null;
  }
}

// ═══ COINGECKO ANALYST — enriched token data (holders, traders) ═══

export async function fetchTokenDetail(mint) {
  try {
    return await apiFetch(`/api/coingecko/token/${mint}`);
  } catch {
    return null;
  }
}

export async function fetchTokenHolders(mint) {
  try {
    return await apiFetch(`/api/coingecko/token/${mint}/holders`);
  } catch {
    return null;
  }
}

export async function fetchTokenTraders(mint) {
  try {
    return await apiFetch(`/api/coingecko/token/${mint}/traders`);
  } catch {
    return null;
  }
}

export async function fetchRecentTrades(mint) {
  try {
    return await apiFetch(`/api/coingecko/token/${mint}/trades`);
  } catch {
    return null;
  }
}

// ═══ CONVENIENCE ═══

export function getWalletAddress() {
  return activeWallet;
}

export function solscanTx(sig) {
  return `https://solscan.io/tx/${sig}`;
}
