---
name: docker-compose
description: Use when writing or reviewing a Docker Compose file, to model services, networks, volumes, and dependencies cleanly.
globs:
  - "**/docker-compose*.yml"
  - "**/docker-compose*.yaml"
  - "**/compose*.yml"
  - "**/compose*.yaml"
tags: [docker, compose, orchestration]
---

# Docker Compose

- **Omit the `version:` key.** Compose v2 ignores it and the spec marks it obsolete. A `version:` line is legacy noise.
- **One service per concern, named for what it does.** `api`, `worker`, `db`, `web` — a service that runs two processes is a container doing two jobs. Split them.
- **Named volumes, never anonymous.** `db-data:` under `volumes:` and reference it by name, so data survives recreation and is visible to operators. An anonymous volume is a leak you cannot find.
- **Networks for isolation.** Put services on the networks they actually need, not one flat `default` network. A frontend that can reach the database is a wider blast radius.
- **`depends_on` does not wait for readiness.** It only orders startup. Use `depends_on: condition: service_healthy` (with a `healthcheck` on the dependency) for a real wait, and let the app still retry its connections.
- **Health checks on every service.** A service without a health check can be "up" but broken. Compose and the orchestrator can only react to what the check reports.
- **Secrets and env via `.env` / secrets, never committed.** Reference `${VAR}` from a `.env` file (gitignored) or Docker secrets. A secret in `docker-compose.yml` is a committed secret.
- **Restart policies and profiles.** Set `restart: unless-stopped` for long-lived services and mark optional/development services with `profiles:` so they do not start by default.
