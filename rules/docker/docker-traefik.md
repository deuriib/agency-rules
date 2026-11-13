---
name: docker-traefik
description: Use when configuring Traefik as an edge router or ingress, to define routers, middlewares, and TLS through labels or dynamic config.
trigger: model_decision
tags: [docker, traefik, reverse-proxy, ingress]
---

# Docker: Traefik

- **Traefik is the edge router.** Put it in front of the services as the single ingress: it handles TLS, routing, and load balancing, and discovers backends from the Docker/Kubernetes provider. Apps should not each terminate their own TLS.
- **Entrypoints define ports.** Declare `web` (80) and `websecure` (443) entrypoints, then attach routers to them. A router without an entrypoint is unreachable.
- **Routers, services, middlewares.** A router matches a request (host/path rule); it sends to a service; middlewares transform in between (auth, rate limit, headers, redirect). Keep those three roles distinct.
- **Let's Encrypt via ACME.** Configure a `certificatesResolvers` entry and a `tls.certResolver` on the router so Traefik provisions and renews certificates automatically. Do not hand-manage certs per service.
- **Force HTTPS with a redirect middleware.** Add a `redirectScheme` middleware (http → https) on the `web` entrypoint so plaintext traffic is upgraded instead of served.
- **Configure by Docker labels or dynamic config, not ad hoc.** Prefer `traefik.http.routers.<name>.rule=Host(...)` labels (or a versioned dynamic file) so routing lives with the service definition and is reviewable.
- **Health-check the backend.** Set a load-balancer health check so Traefik stops routing to an unhealthy replica.
- **Pin the image and the major version.** Traefik v3 is current; pin the image and keep the major stable, since label/behavior changes between majors.
