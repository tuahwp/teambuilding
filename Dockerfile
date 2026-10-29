# Stage 1: Base
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Stage 2: Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 3: Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client & Next.js standalone build
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# Stage 4: Runner
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/app/data/app.db"

# Create data directory and non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    mkdir -p /app/data && \
    chown -R nextjs:nodejs /app/data

# Copy built standalone and static assets
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema, migrations, seed, and CLI tools for migration on start
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=deps /app/node_modules/.bin /app/node_modules/.bin
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/@prisma /app/node_modules/@prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/prisma /app/node_modules/prisma
COPY --from=deps /app/node_modules/@types /app/node_modules/@types

# Copy entrypoint script
COPY --chown=nextjs:nodejs entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

USER nextjs

EXPOSE 3000

VOLUME ["/app/data"]

ENTRYPOINT ["./entrypoint.sh"]

