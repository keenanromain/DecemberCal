# ------------------------------
# 1. Build Stage
# ------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY .env.production .env.production
COPY . .
RUN npm run build

# ------------------------------
# 2. Production Stage
# ------------------------------
FROM nginx:1.25-alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Add your config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from Builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80
