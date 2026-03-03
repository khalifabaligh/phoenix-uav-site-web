import { json, readJson } from "../_utils/json.js";
import { requireAuth } from "../_utils/auth.js";

const CONTENT_KEY = "site:content";

export async function onRequestGet({ request, env }) {
  // viewer suffit pour lire
  const a = await requireAuth(request, env, "viewer");
  if (!a.ok) return a.res;

  const raw = await env.PHOENIX_KV.get(CONTENT_KEY);
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  return json({ ok: true, data: data || { sections: {} } });
}

export async function onRequestPut({ request, env }) {
  // admin requis pour sauvegarder
  const a = await requireAuth(request, env, "admin");
  if (!a.ok) return a.res;

  const body = await readJson(request);
  const sections = body?.sections;

  if (!sections || typeof sections !== "object") {
    return json({ error: "invalid_sections" }, { status: 400 });
  }

  const payload = {
    sections,
    updatedAt: new Date().toISOString(),
  };

  await env.PHOENIX_KV.put(CONTENT_KEY, JSON.stringify(payload));

  return json({ ok: true });
}