import { json } from "./json.js";

const SESS_PREFIX = "sess:";

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function roleRank(role) {
  if (role === "admin") return 2;
  if (role === "viewer") return 1;
  return 0;
}

// Create session in KV: sess:<token> -> {role, exp}
export async function createSession(env, role) {
  const ttl = parseInt(env.SESSION_TTL_SECONDS || "86400", 10);
  const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  const exp = nowSec() + ttl;

  await env.PHOENIX_KV.put(
    SESS_PREFIX + token,
    JSON.stringify({ role, exp }),
    { expirationTtl: ttl }
  );

  return { token, role, ttl };
}

export async function requireAuth(request, env, minRole = "viewer") {
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m?.[1]?.trim();

  if (!token) {
    return { ok: false, res: json({ error: "missing_token" }, { status: 401 }) };
  }

  const raw = await env.PHOENIX_KV.get(SESS_PREFIX + token);
  if (!raw) {
    return { ok: false, res: json({ error: "invalid_or_expired_session" }, { status: 401 }) };
  }

  let sess;
  try { sess = JSON.parse(raw); } catch { sess = null; }

  const role = sess?.role || "viewer";
  const exp = sess?.exp || 0;

  if (exp && exp < nowSec()) {
    return { ok: false, res: json({ error: "session_expired" }, { status: 401 }) };
  }

  if (roleRank(role) < roleRank(minRole)) {
    return { ok: false, res: json({ error: "forbidden" }, { status: 403 }) };
  }

  return { ok: true, token, role, sess };
}