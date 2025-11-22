# --------------------------
# Stage 1 — Build
# --------------------------
FROM node:20-slim AS builder

WORKDIR /app

# Install openssl (Debian ships OpenSSL 3)
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    apt-get clean

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

# IMPORTANT: This now generates Prisma's debian-openssl-3.0.x engine
RUN npx prisma generate

# Build TS → JS
RUN npm run build


# --------------------------
# Stage 2 — Runtime
# --------------------------
FROM node:20-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    apt-get clean

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

CMD ["node", "dist/index.js"]
