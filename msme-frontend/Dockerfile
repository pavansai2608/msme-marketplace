# ── Stage 1: build the static bundle ─────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
# Dev dependencies ARE needed here: vite and the react plugin do the building.
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime

# Only the built assets cross the stage boundary, so node, the sources and the
# 300 MB of node_modules never reach the runtime image.
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
COPY nginx-templates/default.conf.template /etc/nginx/templates/default.conf.template

# Where the backend lives when nginx proxies /api itself (docker compose).
ENV BACKEND_URL=http://msme-backend:5000

# The entrypoint renders templates into conf.d and nginx caches into
# /var/cache/nginx, so both must belong to the unprivileged user.
RUN chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/conf.d /var/cache/nginx \
    && touch /tmp/nginx.pid && chown nginx:nginx /tmp/nginx.pid

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
