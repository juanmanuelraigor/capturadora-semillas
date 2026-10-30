// Cloudflare Pages Function — sirve las imágenes subidas: GET /api/imagen/<id>
export async function onRequestGet({ request, params, env, waitUntil }) {
  const id = String(params.id || "");
  if (!/^img-[a-z0-9-]+$/i.test(id) || !env.DB) return new Response("No encontrada", { status: 404 });

  // Primero, la copia en caché del borde (evita leer la base en cada visita)
  const cache = caches.default;
  const hit = await cache.match(request);
  if (hit) return hit;

  let r;
  try {
    r = await env.DB.prepare("SELECT tipo, datos FROM imagenes WHERE id = ?").bind(id).first();
  } catch {
    r = null;
  }
  if (!r) return new Response("No encontrada", { status: 404 });

  const res = new Response(new Uint8Array(r.datos), {
    headers: {
      "content-type": r.tipo || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
  waitUntil(cache.put(request, res.clone()));
  return res;
}
