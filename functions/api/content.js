import { json, readJson } from "../_utils/json.js";
import { requireAuth } from "../_utils/auth.js";

const CONTENT_KEY = "site:content";

export async function onRequestGet({ request, env }) {
  const a = await requireAuth(request, env, "viewer");
  if (!a.ok) return a.res;

  const raw = await env.PHOENIX_KV.get(CONTENT_KEY);
  let data = { sections: {} };
  try { data = raw ? JSON.parse(raw) : data; } catch { data = { sections: {} }; }

  return json({ ok: true, data });
}

export async function onRequestPut({ request, env }) {
  const a = await requireAuth(request, env, "admin");
  if (!a.ok) return a.res;

  const body = await readJson(request);
  const sections = body?.sections;

  if (!sections || typeof sections !== "object") {
    return json({ error: "missing_sections" }, { status: 400 });
  }

  const payload = {
    sections,
    updatedAt: new Date().toISOString(),
    updatedByRole: a.role
  };

  await env.PHOENIX_KV.put(CONTENT_KEY, JSON.stringify(payload));
  return json({ ok: true });
}son({ ok: true });
}