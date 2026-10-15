FROM node:24.12.0-bookworm-slim AS web
WORKDIR /build
RUN npm install --global pnpm@11.22.0
COPY apps/web/package.json apps/web/pnpm-lock.yaml apps/web/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY apps/web/ ./
RUN pnpm build

FROM python:3.13.15-slim-bookworm AS python-build
COPY --from=ghcr.io/astral-sh/uv:0.12.6 /uv /usr/local/bin/uv
WORKDIR /build
ENV UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never
COPY pyproject.toml uv.lock ./
COPY apps/server/ apps/server/
RUN uv sync --frozen --no-dev --no-editable

FROM python:3.13.15-slim-bookworm AS runtime
RUN groupadd --gid 10001 mtools && useradd --uid 10001 --gid mtools --no-create-home mtools \
    && mkdir -p /data && chown mtools:mtools /data
WORKDIR /app
COPY --from=python-build /build/.venv /app/.venv
COPY --from=web /build/dist /app/web
ENV PATH="/app/.venv/bin:$PATH" MTOOLS_HOST=0.0.0.0 MTOOLS_MODE=docker-web \
    MTOOLS_DATA_DIR=/data MTOOLS_WEB_DIR=/app/web PYTHONUNBUFFERED=1
USER 10001:10001
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health/ready', timeout=3)"]
CMD ["python", "-m", "mtools", "serve"]
