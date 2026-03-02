import { json } from "../_utils/json.js";
import { requireAuth } from "../_utils/auth.js";

const INDEX_KEY = "docs:index";

// ⚠️ KV limite la taille des valeurs.
// On met une limite "safe" pour éviter les erreurs.
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

function guessType(filename) {
  const f = (filename || "").toLowerCase();
  if (f.endsWith(".pdf")) return "PDF";
  if (f.endsWith(".doc") || f.endsWith(".docx")) return "DOC";
  if (f.endsWith(".xls") || f.endsWith(".xlsx") || f.endsWith(".csv")) return "XLS/CSV";
  if (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".webp")) return "IMAGE";
  if (f.endsWith(".txt")) return "TEXT";
  return "FILE";
}

function safeName(s) {
  return String(s || "")
    .replace(/[^\w.\- ()]/g, "_")
    .slice(0, 200);
}

function arrayBufferToBase64(buffer) {
  // Convert ArrayBuffer -> base64
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000; // évite call stack issues
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function onRequestPost({ request, env }) {
  // ✅ Admin only (comme ton code)
  const a = await requireAuth(request, env, "admin");
  if (!a.ok) return a.res;

  const ct = request.headers.get("content-type") || "";
  if (!ct.includes("multipart/form-data")) {
    return json({ error: "expected_multipart_formdata" }, { status: 400 });
  }

  const form = await request.formData();
  const file = form.get("file");
  const title = (form.get("title") || "").toString().trim();
  const originalName = (form.get("originalName") || "").toString().trim();

  if (!(file instanceof File)) {
    return json({ error: "missing_file" }, { status: 400 });
  }

  // ✅ limite taille
  if (file.size > MAX_BYTES) {
    return json(
      { error: "file_too_large", maxBytes: MAX_BYTES, maxMB: 5 },
      { status: 413 }
    );
  }

  const realName = safeName(originalName || file.name || "document");
  const id = crypto.randomUUID();

  // ✅ Stockage KV (base64)
  const arrayBuffer = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(arrayBuffer);

  // On stocke le fichier dans KV
  // clé : doc:file:<id>
  await env.PHOENIX_KV.put(`doc:file:${id}`, base64);

  // ✅ Metadatas dans l'index KV (comme avant)
  const raw = await env.PHOENIX_KV.get(INDEX_KEY);
  let arr = [];
  try { arr = raw ? JSON.parse(raw) : []; } catch { arr = []; }
  if (!Array.isArray(arr)) arr = [];

  const doc = {
    id,
    // ❌ plus de doc.key R2
    // ✅ on met juste un indicateur stockage
    storage: "kv",
    title: safeName(title) || realName,
    originalName: realName,
    type: guessType(realName),
    size: file.size,
    mime: file.type || "application/octet-stream",
    uploadedAt: new Date().toISOString(),
  };

  arr.unshift(doc);
  await env.PHOENIX_KV.put(INDEX_KEY, JSON.stringify(arr));

  return json({ ok: true, doc });
}