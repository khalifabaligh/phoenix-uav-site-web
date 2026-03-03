import { json } from "../_utils/json.js";
import { requireAuth } from "../_utils/auth.js";

const INDEX_KEY = "docs:index";

export async function onRequestGet({ request, env }) {
  const a = await requireAuth(request, env, "viewer");
  if (!a.ok) return a.res;

  const raw = await env.PHOENIX_KV.get(INDEX_KEY);
  let arr = [];
  try { arr = raw ? JSON.parse(raw) : []; } catch { arr = []; }
  if (!Array.isArray(arr)) arr = [];

  // on renvoie sans key interne si tu veux (mais OK de laisser)
  return json(arr);
}