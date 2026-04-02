# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only manifest files to leverage Docker layer cache
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && npm cache clean --force


# ─── Stage 2: Production Image ────────────────────────────────────────────────
FROM node:20-alpine AS production

LABEL maintainer="EventFlow Team"
LABEL service="eventflow-notification-service"

# Create a non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy installed node_modules from the deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/
COPY package.json ./

# Create log directory and set ownership
RUN mkdir -p logs && chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose service port
EXPOSE 3004

# Healthcheck so Docker/orchestrators can detect unhealthy containers
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3004/api/health || exit 1

ENV NODE_ENV=production

CMD ["node", "src/app.js"]
