# Capturadora de Semillas · Jardín de Gente

Sitio estático + funciones de Netlify.

- `index.html` — la web.
- `data/semillas.json` — las semillas. El buscador diario agrega las nuevas al principio de esta lista.
- `netlify/functions/aportes.mjs` — aportes de la comunidad (texto e imagen), guardados en Netlify Blobs.
- `netlify/functions/imagen.mjs` — sirve las imágenes subidas.

## Moderación
1. En Netlify: Site configuration → Environment variables → agregar `ADMIN_TOKEN` con una clave larga.
2. Entrar a la web con `#moderar` al final de la dirección, poner la clave y aparecen los botones Ocultar/Mostrar en cada aporte.

## Formato de cada semilla
`id, titulo, resumen, emerge, lugar, fuente, url, fecha_pub (AAAA-MM-DD), capturada (AAAA-MM-DD), brecha (ecologica | social | espiritual), origen`
