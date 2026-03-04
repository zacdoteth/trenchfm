// ═══════════════════════════════════════════════════════
// frontrun.js — Solana Trading API (frontrun.pro)
// Custodial wallet trades via REST + WebSocket confirmation
// ═══════════════════════════════════════════════════════

import { io } from "socket.io-client";

const API_BASE = "https://solana.frontrun.pro/api/v1/trading-api";
const WS_URL = "wss://solana.frontrun.pro";
const WS_PATH = "/trading/socket.io";

const API_KEY = import.meta.env.VITE_FRONTRUN_API_KEY;
const WALLET = import.meta.env.VITE_FRONTRUN_WALLET;

const headers = () => ({
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
});

// ═══ REST ENDPOINTS ═══

export async function listWallets() {
  const res = await fetch(`${API_BASE}/wallets`, { headers: headers() });
  const json = await res.json();
  if (!json.status) throw new Error(json.message || "Failed to list wallets");
  return json.data;
}

export async function getWalletBalance() {
  const wallets = await listWallets();
  const w = wallets.find((w) => w.address === WALLET) || wallets[0];
  if (!w) throw new Error("No wallet found");
  return {
    address: w.address,
    lamports: parseInt(w.balance, 10),
    sol: parseInt(w.balance, 10) / 1e9,
    name: w.name,
    status: w.status,
  };
}

export async function executeTrade({
  tokenMint,
  side,
  uiInputAmount,
  sellPercent,
  slippageBasisPoint = 500,
  confirmationMode = "ASYNC",
}) {
  const body = {
    tokenMint,
    side,
    slippageBasisPoint,
    walletAddress: WALLET,
    confirmationMode,
  };
  if (side === "SELL" && sellPercent != null) {
    body.sellPercent = sellPercent;
  } else {
    body.uiInputAmount = uiInputAmount;
  }

  const res = await fetch(`${API_BASE}/trade`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.status) {
    const err = new Error(json.message || `Trade failed (${res.status})`);
    err.code = json.code || res.status;
    throw err;
  }
  return json.data;
}

// ═══ SOL PRICE (Jupiter) ═══

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
    cachedSolPrice = cachedSolPrice || 180; // fallback
  }
  return cachedSolPrice;
}

export function usdToSol(usd, solPrice) {
  return usd / solPrice;
}

// ═══ WEBSOCKET — real-time balance push ═══

let socket = null;
let balanceCallback = null;

export function connectWebSocket(onBalanceUpdate) {
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
      wallets: [{ chain: "SOLANA", address: WALLET }],
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

// ═══ CONVENIENCE ═══

export function getWalletAddress() {
  return WALLET;
}

export function solscanTx(sig) {
  return `https://solscan.io/tx/${sig}`;
}
