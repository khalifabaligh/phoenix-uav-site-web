import { json } from "./json.js";

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function randomToken() {
  // Cloudflare Workers support crypto.randomUUID()
  return crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
}

export async function createSession(env, role) {
  const ttl = parseInt(env.SESSION_TTL_SECONDS || "86400", 10);
  const token = randomToken();
  const payload = {
    role, // "viewer" | "admin"
    exp: nowSec() + ttl,
  };

  await env.PHOENIX_KV.put(`sess:${token}`, JSON.stringify(payload), {
    expirationTtl: ttl,
  });

  return { token, role, ttl };
}

export async function requireAuth(request, env, minRole = "viewer") {
  // minRole: "viewer" or "admin"
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return { ok: false, res: json({ error: "missing_token" }, { status: 401 }) };

  const token = m[1].trim();
  const raw = await env.PHOENIX_KV.get(`sess:${token}`);
  if (!raw) return { ok: false, res: json({ error: "invalid_token" }, { status: 401 }) };

  let sess;
  try { sess = JSON.parse(raw); } catch { sess = null; }
  if (!sess?.role || !sess?.exp) return { ok: false, res: json({ error: "bad_session" }, { status: 401 }) };
  if (sess.exp < nowSec()) return { ok: false, res: json({ error: "expired" }, { status: 401 }) };

  const roleRank = (r) => (r === "admin" ? 2 : 1);
  if (roleRank(sess.role) < roleRank(minRole)) {
    return { ok: false, res: json({ error: "forbidden" }, { status: 403 }) };
  }

  return { ok: true, token, session: sess };
}