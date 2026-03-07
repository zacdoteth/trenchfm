const API_BASE = "https://solana.frontrun.pro/api/v1/trading-api";
const API_KEY = process.env.FRONTRUN_API_KEY;

const headers = () => ({
  Authorization: `Bearer ${API_KEY}`,
  "Content-Type": "application/json",
});

export async function createFrontrunWallet(name) {
  const res = await fetch(`${API_BASE}/wallets/create`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ name, chain: "SOLANA" }),
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message || "Failed to create wallet");
  return json.data;
}

export async function listFrontrunWallets() {
  const res = await fetch(`${API_BASE}/wallets`, { headers: headers() });
  const json = await res.json();
  if (!json.status) throw new Error(json.message || "Failed to list wallets");
  return json.data;
}

export async function getWalletBalance(address) {
  const wallets = await listFrontrunWallets();
  const w = wallets.find((w) => w.address === address) || wallets[0];
  if (!w) throw new Error("No wallet found");
  return {
    address: w.address,
    lamports: parseInt(w.balance, 10),
    sol: parseInt(w.balance, 10) / 1e9,
    name: w.name,
    status: w.status,
  };
}

export async function executeFrontrunTrade(params) {
  const res = await fetch(`${API_BASE}/trade`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(params),
  });
  const json = await res.json();
  if (!json.status) {
    const err = new Error(json.message || `Trade failed (${res.status})`);
    err.code = json.code || res.status;
    throw err;
  }
  return json.data;
}
