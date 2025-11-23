# --------------------------
# Stage 1 — Build
# --------------------------
FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    apt-get clean

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# --------------------------
# Stage 2 — Runtime
# --------------------------
FROM node:20-slim

WORKDIR /app

# Install openssl + netcat (nc)
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl netcat-openbsd && \
    apt-get clean

# Copy app files
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY entrypoint.sh .

# Make entrypoint executable
RUN chmod +x entrypoint.sh

ENV NODE_ENV=production
ENV PORT=4000

EXPOSE 4000

ENTRYPOINT ["./entrypoint.sh"]

