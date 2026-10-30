# Capturadora de Semillas · Jardín de Gente

Sitio estático + API. Se publica como **Cloudflare Worker** (`wrangler.jsonc`, se despliega solo con cada push a main) y, mientras dure la mudanza, también en Netlify.

- `public/index.html` — la web.
- `public/data/semillas.json` — las semillas. El buscador diario agrega las nuevas al principio de esta lista.
- `src/worker.js` — punto de entrada del Worker: atiende `/api/*` y deja el resto a los archivos de `public/`.
- `functions/api/aportes.js` — aportes de la comunidad (texto e imagen), guardados en Cloudflare D1.
- `functions/api/imagen/[id].js` — sirve las imágenes subidas.
- `netlify/`, `netlify.toml`, `package.json` — versión anterior para Netlify; se pueden borrar cuando se cierre ese sitio.

## Configuración en Cloudflare
- La base D1 (`capturadora`) ya está conectada en `wrangler.jsonc` con el nombre `DB`.
- En el Worker: Settings → Variables and Secrets → Secret `ADMIN_TOKEN` (la clave de moderación).

## Moderación
Entrar a la web con `#moderar` al final de la dirección, poner la clave y aparecen los botones Ocultar/Mostrar en cada aporte.

## Formato de cada semilla
`id, titulo, resumen, emerge, lugar, fuente, url, fecha_pub (AAAA-MM-DD), capturada (AAAA-MM-DD), brecha (ecologica | social | espiritual), origen`
