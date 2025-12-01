# --------------------------
# Stage 1 — Build
# --------------------------
FROM node:20-slim AS builder
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl netcat-openbsd && \
    apt-get clean

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# --------------------------
# Stage 2 — Runtime
# --------------------------
FROM node:20-slim
WORKDIR /app

# Required: openssl (Prisma), netcat-openbsd (entrypoint postgres wait)
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl netcat-openbsd && \
    apt-get clean

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY entrypoint.sh .

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

ENTRYPOINT ["sh", "./entrypoint.sh"]
