---
name: docker-images
description: Use when writing or reviewing a Dockerfile, to build small, cached, reproducible images with a clean runtime surface.
globs:
  - "**/Dockerfile"
  - "**/Dockerfile.*"
  - "**/*.dockerfile"
tags: [docker, images, dockerfile]
---

# Docker Images

- **Multi-stage builds; ship only the runtime.** Build in a stage with the SDK/compiler, then copy just the artifact into a minimal runtime stage. The build toolchain is not a runtime dependency.
- **Order layers for the cache.** Put the least-changing steps first — base image, then dependency manifests (`package.json`, `requirements.txt`, `*.csproj`), install dependencies, then copy source last. A change to source should not invalidate the dependency layer.
- **Small, pinned base images.** Use `slim`/`alpine`/distroless variants and pin by tag **and** digest, never `latest`. A smaller image is a smaller attack surface and a faster pull.
- **Run as a non-root user.** Create a dedicated user and `USER` it before the entrypoint. A root container turns an app bug into a host compromise.
- **`HEALTHCHECK` in the image.** Declare a health check so the orchestrator can detect and restart a broken instance instead of routing to it.
- **A real `.dockerignore`.** Exclude `.git`, `node_modules`, `bin/`, `obj/`, `__pycache__`, and env/secret files from the build context — a bloated context slows every build and can leak secrets into a layer.
- **`ENTRYPOINT` for the binary, `CMD` for defaults.** Use `ENTRYPOINT` to pin the executable and `CMD` for the overridable arguments, so a user-supplied command cannot replace the entrypoint unexpectedly.
- **Never bake secrets into a layer.** `ARG` values and files `COPY`ed in persist in the layer history. Pass secrets at runtime via Docker secrets, a secret store, or build-time secret mounts (`--secret`).
