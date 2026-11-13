---
name: docker-nginx
description: Use when running nginx as a reverse proxy or static server in a container, to forward headers, terminate TLS, and serve assets correctly.
trigger: model_decision
tags: [docker, nginx, reverse-proxy]
---

# Docker: nginx

- **Reverse proxy in front, apps behind.** Put nginx in front of backend services to terminate TLS, serve static assets, and route by path. The app should not terminate TLS or serve its own static files.
- **Forward the real client.** Set `proxy_set_header X-Forwarded-For`, `X-Forwarded-Host`, and `X-Forwarded-Proto` so the backend sees the original client, host, and scheme — not the proxy.
- **Ship config deliberately.** Bake a tested `nginx.conf` into the image (`COPY`) or mount it as a read-only config volume. Do not rely on a mutable container for your routing.
- **Hide the version.** `server_tokens off;` so the response does not advertise the nginx version to attackers.
- **Cache and compress.** Enable `gzip` (or brotli) and long cache headers for hashed static assets. A static file served uncompressed is wasted bandwidth.
- **SPA fallback routing.** For a single-page app, `try_files $uri $uri/ /index.html;` so deep links load the app instead of 404ing.
- **Reload, do not restart.** Apply config changes with `nginx -s reload` (send the `SIGHUP` signal) so in-flight connections drain instead of being dropped.
- **Health check the upstream, not just nginx.** Configure an upstream health check (or a `HEALTHCHECK` that probes the backends) so a dead backend is detected, not proxied to.
