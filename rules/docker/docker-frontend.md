---
name: docker-frontend
description: Use when containerizing a frontend or SPA, to build in one stage and serve static assets from a small, non-dev server.
trigger: model_decision
tags: [docker, frontend, spa, vite]
---

# Docker: Frontend and SPA

- **Build stage + serve stage, never the dev server in production.** Build the assets in a Node stage (`npm ci && npm run build`), then serve the static output with nginx (or a static host) in a minimal runtime stage. `vite dev` / `react-scripts start` are development-only.
- **Keep the image small.** The runtime stage has only the built `dist/` and the web server — no `node_modules`, no source, no build toolchain.
- **SPA fallback routing.** Configure `try_files $uri $uri/ /index.html;` so client-side routes resolve instead of returning 404 on deep links.
- **Cache by content hash.** Hashed assets (`app.abc123.js`) get `Cache-Control: public, max-age=31536000, immutable`; the HTML entry (`index.html`) gets `no-cache` so a new deploy is picked up immediately.
- **Compress and serve efficiently.** Enable gzip/brotli and a sensible static file config; a SPA served uncompressed is slow on first paint.
- **Build-time vs runtime env.** Variables prefixed with `VITE_` (or injected by the bundler) are baked at build time. Anything that must vary per environment needs runtime injection (a config endpoint, templating, or env at serve time) — do not rebuild the image per environment.
- **A health check that probes the page.** `HEALTHCHECK` should fetch `/` or `/healthz`, not just confirm the server process exists.
