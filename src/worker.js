// Capturadora de Semillas — punto de entrada del Worker.
// Los archivos de public/ los sirve Cloudflare directamente; este código solo atiende /api/*.
import { onRequestGet as aportesGet, onRequestPost as aportesPost } from "../functions/api/aportes.js";
import { onRequestGet as imagenGet } from "../functions/api/imagen/[id].js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const base = { request, env, waitUntil: (p) => ctx.waitUntil(p) };

    if (url.pathname === "/api/aportes") {
      if (request.method === "GET") return aportesGet(base);
      if (request.method === "POST") return aportesPost(base);
      return new Response(JSON.stringify({ error: "Método no permitido." }), {
        status: 405,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const img = url.pathname.match(/^\/api\/imagen\/([^/]+)$/);
    if (img && request.method === "GET") return imagenGet({ ...base, params: { id: img[1] } });

    return env.ASSETS.fetch(request);
  },
};
