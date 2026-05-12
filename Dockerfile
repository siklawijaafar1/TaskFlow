# ============================================================
# Dockerfile — TaskFlow mono-container multi-stage build (R37)
# Architecture: nginx (port 8080) → serves React static files
#               nginx proxy /api/* → Node.js Express (port 4000)
# Optimised for Koyeb free tier (1 service = 1 container).
# ============================================================

# ── Stage 1: Build React frontend ─────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build
# Output: /app/frontend/dist


# ── Stage 2: Install backend production deps ───────────────────
FROM node:20-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm ci --omit=dev
# Output: /app/backend/node_modules


# ── Stage 3: Runtime image ─────────────────────────────────────
FROM nginx:alpine AS runtime

# Install Node.js 20 + supervisord
RUN apk add --no-cache nodejs npm supervisor

# --- Frontend static files ---
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# --- Backend app ---
WORKDIR /opt/api
COPY --from=backend-builder /app/backend/node_modules ./node_modules
COPY backend/src ./src
COPY backend/package.json ./
COPY backend/knexfile.js ./

# --- Config files ---
COPY nginx.conf       /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisord.conf

# Run as non-root (R38) — nginx needs root for port binding, but our
# node process runs as user 1000. supervisord manages both.
RUN adduser -D -u 1000 appuser && chown -R appuser /opt/api

EXPOSE 8080

# Healthcheck hits the Express healthz endpoint via nginx proxy (R39)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/healthz || exit 1

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
