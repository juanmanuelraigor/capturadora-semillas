// Cloudflare Pages Function — aportes de la comunidad (texto y/o imagen), guardados en D1.
// Necesita: un binding D1 llamado DB y una variable de entorno ADMIN_TOKEN.
// GET  /api/aportes            -> lista pública (sin ocultos)
// GET  /api/aportes?admin=1    -> lista completa (header x-admin-token)
// POST /api/aportes            -> nuevo aporte {texto, nombre, lugar, imagen (data URL), web (honeypot)}
// POST /api/aportes {accion:"ocultar"|"mostrar", id} -> moderación (header x-admin-token)

const MAX_IMG = 1.5 * 1024 * 1024; // D1 admite hasta 2 MB por valor

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, n);
const isAdmin = (req, env) => Boolean(env.ADMIN_TOKEN) && req.headers.get("x-admin-token") === env.ADMIN_TOKEN;

let ready = false;
async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS aportes (
      id TEXT PRIMARY KEY, texto TEXT, nombre TEXT, lugar TEXT, imagen TEXT,
      creado TEXT, ts INTEGER, oculto INTEGER DEFAULT 0)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS imagenes (id TEXT PRIMARY KEY, tipo TEXT, datos BLOB)`),
  ]);
  ready = true;
}
const row = (r) => ({ ...r, oculto: Boolean(r.oculto) });

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json({ error: "Falta conectar la base de datos (D1) con el nombre DB." }, 500);
  await setup(env.DB);
  const admin = new URL(request.url).searchParams.get("admin") === "1";
  if (admin && !isAdmin(request, env)) return json({ error: "Clave de administración incorrecta." }, 401);
  const sql = admin
    ? "SELECT id, texto, nombre, lugar, imagen, creado, ts, oculto FROM aportes ORDER BY ts DESC LIMIT 300"
    : "SELECT id, texto, nombre, lugar, imagen, creado, ts, oculto FROM aportes WHERE oculto = 0 ORDER BY ts DESC LIMIT 300";
  const { results } = await env.DB.prepare(sql).all();
  return json(results.map(row));
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "Falta conectar la base de datos (D1) con el nombre DB." }, 500);
  await setup(env.DB);

  let body;
  try { body = await request.json(); } catch { return json({ error: "No se pudo leer el envío." }, 400); }

  // Moderación
  if (body.accion === "ocultar" || body.accion === "mostrar") {
    if (!isAdmin(request, env)) return json({ error: "Clave de administración incorrecta." }, 401);
    const r = await env.DB.prepare("UPDATE aportes SET oculto = ? WHERE id = ?")
      .bind(body.accion === "ocultar" ? 1 : 0, clean(body.id, 80)).run();
    if (!r.meta.changes) return json({ error: "No existe ese aporte." }, 404);
    return json({ ok: true });
  }

  // Honeypot anti-spam: los humanos no completan este campo
  if (clean(body.web, 200)) return json({ ok: true });

  const texto = clean(body.texto, 1200);
  const nombre = clean(body.nombre, 60);
  const lugar = clean(body.lugar, 80);
  const stmts = [];
  let imagen = "";

  if (body.imagen) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(body.imagen));
    if (!m) return json({ error: "La imagen tiene un formato que no se puede usar. Probá con JPG o PNG." }, 400);
    const bin = atob(m[2]);
    if (bin.length > MAX_IMG) return json({ error: "La imagen pesa demasiado. Probá con una más chica." }, 413);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    imagen = `img-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
    stmts.push(env.DB.prepare("INSERT INTO imagenes (id, tipo, datos) VALUES (?, ?, ?)").bind(imagen, m[1], bytes));
  }

  if (!texto && !imagen) return json({ error: "Escribí algo o sumá una imagen." }, 400);

  const ts = Date.now();
  const item = {
    id: `${ts}-${crypto.randomUUID().slice(0, 8)}`,
    texto, nombre, lugar, imagen,
    creado: new Date(ts).toISOString().slice(0, 10),
    ts, oculto: false,
  };
  stmts.push(
    env.DB.prepare("INSERT INTO aportes (id, texto, nombre, lugar, imagen, creado, ts, oculto) VALUES (?, ?, ?, ?, ?, ?, ?, 0)")
      .bind(item.id, texto, nombre, lugar, imagen, item.creado, ts),
  );
  await env.DB.batch(stmts);
  return json({ ok: true, aporte: item }, 201);
}

export const onRequest = () => json({ error: "Método no permitido." }, 405);
