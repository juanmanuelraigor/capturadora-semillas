// Sirve las imágenes subidas por la comunidad: GET /api/imagen/<id>
import { getStore } from "@netlify/blobs";

export default async (req, context) => {
  const id = String(context.params?.id || "");
  if (!/^img-[a-z0-9-]+$/i.test(id)) return new Response("No encontrada", { status: 404 });
  const res = await getStore("imagenes").getWithMetadata(id, { type: "arrayBuffer" });
  if (!res) return new Response("No encontrada", { status: 404 });
  return new Response(res.data, {
    headers: {
      "content-type": res.metadata?.contentType || "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
};

export const config = { path: "/api/imagen/:id" };
