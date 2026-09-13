# ── Stage 1: dependencies ────────────────────────────────────────────────────
# Installed in their own stage so that changing application source does not
# invalidate the (slow) npm layer.
FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
# --omit=dev: jest, supertest and mongodb-memory-server have no business in a
# runtime image (mongodb-memory-server alone downloads a mongod binary).
RUN npm ci --omit=dev && npm cache clean --force

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# wget backs the HEALTHCHECK below; tini reaps zombies and forwards signals so
# the container stops promptly instead of waiting out the kill timeout.
RUN apk add --no-cache tini wget

ENV NODE_ENV=production \
    PORT=5000

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

# The `node` user (uid 1000) ships with the official image. Running as root
# here would mean a container escape starts with root on the host namespace.
USER node

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:5000/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
