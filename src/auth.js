import { apiFetch } from "./api.js";

let cachedUser = null;
let cachedWallets = null;

export async function initAuth() {
  // Already authed this session?
  const existing = sessionStorage.getItem("trench_token");
  if (existing) {
    if (import.meta.env.DEV && existing === "dev_token") {
      cachedUser = JSON.parse(sessionStorage.getItem("trench_user"));
      cachedWallets = [{ address: "5XrajTY3AqvhbK5wqMN98zkBs2ocgDTm86auN9X2F9tB", is_default: true }];
      return { user: cachedUser, wallets: cachedWallets };
    }
    try {
      const data = await apiFetch("/api/wallets");
      cachedWallets = data.wallets;
      cachedUser = JSON.parse(sessionStorage.getItem("trench_user"));
      return { user: cachedUser, wallets: cachedWallets };
    } catch {
      // Token expired, re-auth below
      sessionStorage.removeItem("trench_token");
      sessionStorage.removeItem("trench_user");
    }
  }

  let data;
  const tg = window.Telegram?.WebApp;
  if (tg?.initData) {
    // Inside Telegram Mini App
    tg.ready();
    tg.expand();
    data = await apiFetch("/api/auth/telegram", {
      method: "POST",
      body: JSON.stringify({ initData: tg.initData }),
    });
  } else if (import.meta.env.DEV) {
    // Local dev — no backend needed, return mock user
    data = {
      token: "dev_token",
      user: { id: "dev", name: "zac", username: "zac" },
      wallets: [{ address: "5XrajTY3AqvhbK5wqMN98zkBs2ocgDTm86auN9X2F9tB", is_default: true }],
    };
  } else {
    // Production fallback
    data = await apiFetch("/api/auth/dev", { method: "POST" });
  }

  sessionStorage.setItem("trench_token", data.token);
  sessionStorage.setItem("trench_user", JSON.stringify(data.user));
  cachedUser = data.user;
  cachedWallets = data.wallets;
  return { user: data.user, wallets: data.wallets };
}

export function getUser() {
  return cachedUser;
}

export function getWallets() {
  return cachedWallets;
}
