import { json } from "../../../_utils/json.js";
import { requireAuth } from "../../../_utils/auth.js";

const INDEX_KEY = "docs:index";

function base64ToUint8Array(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export async function onRequestGet({ request, env, params }) {
  // ✅ Viewer OK (comme ton code)
  const a = await requireAuth(request, env, "viewer");
  if (!a.ok) return a.res;

  const id = (params.id || "").toString();
  if (!id) return json({ error: "missing_id" }, { status: 400 });

  // ✅ Find in index
  const raw = await env.PHOENIX_KV.get(INDEX_KEY);
  let arr = [];
  try { arr = raw ? JSON.parse(raw) : []; } catch { arr = []; }

  const doc = Array.isArray(arr) ? arr.find(d => d?.id === id) : null;
  if (!doc) return json({ error: "not_found" }, { status: 404 });

  // ✅ Read file from KV
  const base64 = await env.PHOENIX_KV.get(`doc:file:${id}`);
  if (!base64) return json({ error: "file_missing_kv" }, { status: 404 });

  const bytes = base64ToUint8Array(base64);

  const headers = new Headers();
  headers.set("Content-Type", doc.mime || "application/octet-stream");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(doc.originalName || "document")}"`
  );
  headers.set("Cache-Control", "no-store");

  return new Response(bytes, { headers });
}