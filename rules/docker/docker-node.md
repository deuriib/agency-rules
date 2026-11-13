---
name: docker-node
description: Use when containerizing a Node.js application, to install with a lockfile, prune dev dependencies, and run a small non-root image.
trigger: model_decision
tags: [docker, nodejs, node]
---

# Docker: Node.js

- **`npm ci` from a lockfile, not `npm install`.** `npm ci` is deterministic — it installs exactly what `package-lock.json` pins. `npm install` can drift and re-resolve.
- **Copy the manifest first, install, then copy source.** `COPY package*.json ./` → `npm ci` → `COPY . .` so a source change does not invalidate the dependency layer.
- **Prune dev dependencies for the runtime.** In a multi-stage build, install with dev deps in the build stage and `npm ci --omit=dev` (or `--production`) in the runtime stage. A production image does not carry the test toolchain.
- **Set `NODE_ENV=production`.** Frameworks cache templates and suppress verbose errors under it. Do not set it in the build stage when you need dev tooling.
- **Small, non-root runtime.** Use `node:22-slim` (or `alpine`) and the built-in `node` user. Node version should come from `.nvmrc` or `package.json` `engines.node`.
- **Handle termination signals.** Listen for `SIGTERM`/`SIGINT` and shut down gracefully (close the server, drain connections). A process that ignores the signal gets force-killed mid-request.
- **Log to stdout, not files.** The orchestrator collects stdout; a log file inside a container is invisible and grows the image.
- **A health check that is cheap.** A `HEALTHCHECK` that hits a `/healthz` endpoint (or a tiny fetch) proves the app is serving, not just alive.
