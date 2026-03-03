import { json } from "../_utils/json.js";
import { requireAuth } from "../_utils/auth.js";

const INDEX_KEY = "docs:index";

function guessType(filename) {
  const f = (filename || "").toLowerCase();
  if (f.endsWith(".pdf")) return "PDF";
  if (f.endsWith(".doc") || f.endsWith(".docx")) return "DOC";
  if (f.endsWith(".xls") || f.endsWith(".xlsx") || f.endsWith(".csv")) return "XLS/CSV";
  if (f.endsWith(".png") || f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".webp")) return "IMAGE";
  if (f.endsWith(".txt")) return "TEXT";
  return "FILE";
}

export async function onRequestPost({ request, env }) {
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

  const realName = originalName || file.name || "document";
  const id = crypto.randomUUID();
  const key = `docs/${id}/${realName}`;

  const arrayBuffer = await file.arrayBuffer();
  await env.PHOENIX_R2.put(key, arrayBuffer, {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
    customMetadata: {
      originalName: realName,
      title: title || realName,
    },
  });

  const raw = await env.PHOENIX_KV.get(INDEX_KEY);
  let arr = [];
  try { arr = raw ? JSON.parse(raw) : []; } catch { arr = []; }
  if (!Array.isArray(arr)) arr = [];

  const doc = {
    id,
    key,
    title: title || realName,
    originalName: realName,
    type: guessType(realName),
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };

  arr.unshift(doc);
  await env.PHOENIX_KV.put(INDEX_KEY, JSON.stringify(arr));

  return json({ ok: true, doc });
}