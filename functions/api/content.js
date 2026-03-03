import { json, readJson } from "../_utils/json.js";
import { requireAuth } from "../_utils/auth.js";

const KEY = "content:main"; // KV key

export async function onRequestGet({ request, env }) {
  const a = await requireAuth(request, env, "viewer");
  if (!a.ok) return a.res;

  const raw = await env.PHOENIX_KV.get(KEY);
  if (!raw) return json({ ok: true, data: { sections: {} } });

  try {
    return json({ ok: true, data: JSON.parse(raw) });
  } catch {
    return json({ ok: true, data: { sections: {} } });
  }
}

export async function onRequestPut({ request, env }) {
  const a = await requireAuth(request, env, "admin");
  if (!a.ok) return a.res;

  const body = await readJson(request);
  if (!body || typeof body !== "object") {
    return json({ error: "bad_json" }, { status: 400 });
  }

  // Structure attendue: { sections: { key: "<html/text>" } }
  if (!body.sections || typeof body.sections !== "object") {
    return json({ error: "missing_sections" }, { status: 400 });
  }

  await env.PHOENIX_KV.put(KEY, JSON.stringify(body));
  return json({ ok: true });
}