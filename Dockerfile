# ====================================================================
# TCT DeployForge Next.js All-in-One Full Stack Dockerfile
# Optimized with Bun Runtime & Multi-Stage Production Build
# ====================================================================

# Stage 1: Dependencies & Build
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

# Copy dependency specifications & scripts
COPY package.json bun.lock ./
COPY prisma ./prisma/
COPY scripts ./scripts/

RUN bun install --frozen-lockfile

# Copy application sources
COPY . .

# Generate Prisma Client and build Next.js App
ENV NODE_ENV=production
ENV DB_TYPE=postgresql
RUN bun run db:prepare && bun run build

# Stage 2: Production Runtime
FROM oven/bun:1.2-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy runtime assets from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/bun.lock ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/db/health || exit 1

CMD ["bun", "run", "start"]
