// functions/api/content.js
import { json, readJson } from "../_utils/json.js";
import { requireAuth } from "../_utils/auth.js";

const CONTENT_KEY = "site:content";

/**
 * GET /api/content
 * role: viewer/admin
 * returns: { ok:true, data:{ sections:{...}, updatedAt:"..." } }
 */
export async function onRequestGet({ request, env }) {
  const a = await requireAuth(request, env, "viewer");
  if (!a.ok) return a.res;

  const raw = await env.PHOENIX_KV.get(CONTENT_KEY);
  let data;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!data || typeof data !== "object") {
    data = { sections: {}, updatedAt: null };
  }

  if (!data.sections || typeof data.sections !== "object") {
    data.sections = {};
  }

  return json({ ok: true, data });
}

/**
 * PUT /api/content
 * role: admin only
 * body: { sections: { key: "<html...>" } }
 */
export async function onRequestPut({ request, env }) {
  const a = await requireAuth(request, env, "admin");
  if (!a.ok) return a.res;

  const body = await readJson(request);
  const sections = body?.sections;

  if (!sections || typeof sections !== "object") {
    return json({ error: "missing_sections" }, { status: 400 });
  }

  const data = {
    sections,
    updatedAt: new Date().toISOString(),
  };

  await env.PHOENIX_KV.put(CONTENT_KEY, JSON.stringify(data));

  return json({ ok: true, data });
}