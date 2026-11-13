---
name: docker-security
description: Use when hardening a container image or deployment, to run non-root, drop privileges, and keep secrets out of layers.
trigger: model_decision
tags: [docker, security, hardening]
---

# Docker Security

- **Non-root, always.** Build with a dedicated user and never run as root. A root container plus a host mount is a host compromise waiting for one bug.
- **No secrets in image layers.** `ARG`, `COPY .env`, and inline `RUN` values all persist in layer history. Pass secrets at runtime (Docker secrets, a vault, env injected by the orchestrator) or use build-time secret mounts (`--secret`).
- **Minimal base image.** Use slim/distroless images with no shell, package manager, or extra tools. The less that is present, the less an attacker can use.
- **Scan images in CI.** Run a scanner (Trivy, Grype, Snyk) on every build and fail on known critical CVEs. An unscanned image is an unaudited dependency.
- **Drop capabilities and never `--privileged`.** Start with `--cap-drop=ALL` and add back only what is needed. A privileged container is root with fewer steps.
- **Read-only root filesystem where possible.** Mount the root FS `:ro` and write only to mounted volumes. A container that cannot write cannot be backdoored as easily.
- **Pin by digest, not `latest`.** A pinned digest makes the image immutable; `latest` moves under you and can ship a compromised build.
- **Limit resources at runtime.** Set CPU/memory limits and (where supported) a user namespace so a runaway or compromised container cannot exhaust the host.
