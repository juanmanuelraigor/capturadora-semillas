// Aportes de la comunidad: texto y/o imagen.
// GET  /api/aportes            -> lista pública (sin ocultos)
// GET  /api/aportes?admin=1    -> lista completa (requiere header x-admin-token)
// POST /api/aportes            -> nuevo aporte {texto, nombre, lugar, imagen (data URL jpeg/png/webp), web (honeypot)}
// POST /api/aportes {accion:"ocultar"|"mostrar", id} -> moderación (requiere x-admin-token)
import { getStore } from "@netlify/blobs";

const MAX_IMG = 4 * 1024 * 1024;
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n);
const isAdmin = (req) => {
  const t = process.env.ADMIN_TOKEN;
  return Boolean(t) && req.headers.get("x-admin-token") === t;
};

export default async (req) => {
  const store = getStore({ name: "aportes", consistency: "strong" });

  if (req.method === "GET") {
    const admin = new URL(req.url).searchParams.get("admin") === "1";
    if (admin && !isAdmin(req)) return json({ error: "Clave de administración incorrecta." }, 401);
    const { blobs } = await store.list();
    const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 300);
    const items = (await Promise.all(keys.map((k) => store.get(k, { type: "json" })))).filter(Boolean);
    return json(admin ? items : items.filter((a) => !a.oculto));
  }

  if (req.method !== "POST") return json({ error: "Método no permitido." }, 405);

  let body;
  try { body = await req.json(); } catch { return json({ error: "No se pudo leer el envío." }, 400); }

  // Moderación
  if (body.accion === "ocultar" || body.accion === "mostrar") {
    if (!isAdmin(req)) return json({ error: "Clave de administración incorrecta." }, 401);
    const id = clean(body.id, 80);
    const item = await store.get(id, { type: "json" });
    if (!item) return json({ error: "No existe ese aporte." }, 404);
    item.oculto = body.accion === "ocultar";
    await store.setJSON(id, item);
    return json({ ok: true });
  }

  // Honeypot anti-spam: los humanos no completan este campo
  if (clean(body.web, 200)) return json({ ok: true });

  const texto = clean(body.texto, 1200);
  const nombre = clean(body.nombre, 60);
  const lugar = clean(body.lugar, 80);
  let imagen = "";

  if (body.imagen) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.imagen));
    if (!m) return json({ error: "La imagen tiene un formato que no se puede usar. Probá con JPG o PNG." }, 400);
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > MAX_IMG) return json({ error: "La imagen pesa demasiado." }, 413);
    imagen = `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await getStore("imagenes").set(imagen, buf, { metadata: { contentType: m[1] } });
  }

  if (!texto && !imagen) return json({ error: "Escribí algo o sumá una imagen." }, 400);

  const ts = Date.now();
  const id = `${ts}-${Math.random().toString(36).slice(2, 8)}`;
  const item = { id, texto, nombre, lugar, imagen, creado: new Date(ts).toISOString().slice(0, 10), ts, oculto: false };
  await store.setJSON(id, item);
  return json({ ok: true, aporte: item }, 201);
};

export const config = { path: "/api/aportes" };
