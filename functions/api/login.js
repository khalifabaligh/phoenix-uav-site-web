import { json, readJson } from "../_utils/json.js";
import { createSession } from "../_utils/auth.js";

export async function onRequestPost({ request, env }) {
  const body = await readJson(request);
  const password = (body?.password || "").trim();

  if (!password) return json({ error: "missing_password" }, { status: 400 });

  // ADMIN
  if (password === (env.ADMIN_PASSWORD || "")) {
    const s = await createSession(env, "admin");
    return json({ ok: true, role: s.role, token: s.token, ttl: s.ttl });
  }

  // VIEWER
  if (password === (env.SITE_PASSWORD || "")) {
    const s = await createSession(env, "viewer");
    return json({ ok: true, role: s.role, token: s.token, ttl: s.ttl });
  }

  return json({ error: "wrong_password" }, { status: 403 });
}