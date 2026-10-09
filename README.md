# Colo-Colo · Resultados y calendario

Sitio estático (HTML + CSS + JavaScript) con los resultados de Colo-Colo desde 2020, estadísticas por temporada y calendario de próximos partidos.

- Datos: API pública de ESPN, descargados a `data/matches.json`.
- Actualizar datos: `node scripts/fetch-data.mjs` (Node 18+). Un workflow de GitHub Actions lo hace a diario y hace commit, lo que dispara un nuevo deploy en Vercel.
- Local: `npx serve .` o abrir con cualquier servidor estático (el `fetch` no funciona con `file://`).

Sitio no oficial.
