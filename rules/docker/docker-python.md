---
name: docker-python
description: Use when containerizing a Python application, to pin dependencies, avoid the cache, and serve with a real WSGI/ASGI server.
trigger: model_decision
tags: [docker, python]
---

# Docker: Python

- **Pin dependencies exactly.** Freeze `requirements.txt` (or use a lockfile via Poetry/uv) with hashes or exact versions. A floating `>=` installs whatever is newest at build time.
- **`pip install --no-cache-dir`.** Drop the pip cache from the image — it adds size and serves no runtime purpose. Install in a venv or the system path deliberately.
- **Copy `requirements.txt` first, then the app.** `COPY requirements.txt` → install → `COPY . .` so a source change does not re-download the world.
- **Use a `slim` base, not `python:latest` or a full image.** `python:3.12-slim` (pinned) is smaller and drops build tools you do not need at runtime.
- **Serve with gunicorn/uvicorn, not the dev server.** `python manage.py runserver` and `flask run` are development servers. In production run gunicorn (sync/async) or uvicorn with workers and a proper entrypoint.
- **Non-root user.** Create and `USER` a dedicated user; do not run the app as root.
- **Set `PYTHONUNBUFFERED=1` and `PYTHONDONTWRITEBYTECODE=1`.** Unbuffered output reaches the logs immediately, and skipping bytecode keeps the image and volume clean.
- **Health check against the app.** Point `HEALTHCHECK` at a `/healthz` endpoint rather than `pgrep python`.
