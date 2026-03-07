import { createClient } from "@supabase/supabase-js";

let supabase;

export function initDB() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.warn("[db] SUPABASE_URL or SUPABASE_SERVICE_KEY not set — DB calls will fail");
    return;
  }
  supabase = createClient(url, key);
  console.log("[db] Supabase connected");
}

export function getDB() {
  return supabase;
}

export async function findUserByTgId(tgId) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("tg_id", String(tgId))
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createUser({ tgId, username, firstName, photoUrl }) {
  const { data, error } = await supabase
    .from("users")
    .insert({
      tg_id: String(tgId),
      username,
      first_name: firstName,
      photo_url: photoUrl,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getUserWallets(userId) {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("id", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function createWalletRecord({ userId, address, name, isDefault = false }) {
  const { data, error } = await supabase
    .from("wallets")
    .insert({
      user_id: userId,
      address,
      name,
      is_default: isDefault,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDefaultWallet(userId) {
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("id", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
