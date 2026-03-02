import { json } from "../_utils/json.js";
import { requireAuth } from "../_utils/auth.js";

const INDEX_KEY = "docs:index"; // KV key -> array JSON

export async function onRequestGet({ request, env }) {
  const a = await requireAuth(request, env, "viewer");
  if (!a.ok) return a.res;

  const raw = await env.PHOENIX_KV.get(INDEX_KEY);
  if (!raw) return json([]);

  try {
    const arr = JSON.parse(raw);
    return json(Array.isArray(arr) ? arr : []);
  } catch {
    return json([]);
  }
}