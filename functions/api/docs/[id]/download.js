import { json } from "../../../_utils/json.js";
import { requireAuth } from "../../../_utils/auth.js";

const INDEX_KEY = "docs:index";

export async function onRequestGet({ request, env, params }) {
  const a = await requireAuth(request, env, "viewer");
  if (!a.ok) return a.res;

  const id = (params.id || "").toString();
  if (!id) return json({ error: "missing_id" }, { status: 400 });

  const raw = await env.PHOENIX_KV.get(INDEX_KEY);
  let arr = [];
  try { arr = raw ? JSON.parse(raw) : []; } catch { arr = []; }

  const doc = Array.isArray(arr) ? arr.find(d => d?.id === id) : null;
  if (!doc?.key) return json({ error: "not_found" }, { status: 404 });

  const obj = await env.PHOENIX_R2.get(doc.key);
  if (!obj) return json({ error: "file_missing_r2" }, { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Content-Type", headers.get("Content-Type") || "application/octet-stream");
  headers.set("Cache-Control", "no-store");

  // IMPORTANT: filename propre
  const filename = (doc.originalName || "document").replace(/"/g, "");
  headers.set("Content-Disposition", `attachment; filename="${filename}"`);

  return new Response(obj.body, { headers });
}