# ── HostelHub API ─────────────────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# Install production dependencies only (mongodb-memory-server is a devDep and
# is intentionally excluded — production must use a real MongoDB).
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
RUN mkdir -p src/uploads/receipts

EXPOSE 5000

# Lightweight health probe against the /api/health endpoint.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
