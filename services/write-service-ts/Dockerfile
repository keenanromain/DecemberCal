# --------------------------
# Stage 1 — Build
# --------------------------
FROM node:20-slim AS builder

WORKDIR /app

# Install openssl + nc (netcat)
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl netcat-openbsd && \
    apt-get clean

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Generate Prisma client (Linux ARM64 openssl 3.0)
RUN npx prisma generate

# Build TS → JS
RUN npm run build


# --------------------------
# Stage 2 — Runtime
# --------------------------
FROM node:20-slim

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl netcat-openbsd && \
    apt-get clean

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY entrypoint.sh ./entrypoint.sh

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

ENTRYPOINT ["sh", "./entrypoint.sh"]
