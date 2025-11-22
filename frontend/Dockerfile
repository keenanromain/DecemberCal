FROM node:20-slim

WORKDIR /app

# Copy config files FIRST
COPY package.json package-lock.json* ./
COPY postcss.config.cjs tailwind.config.js vite.config.js ./
COPY src ./src
COPY index.html ./

RUN npm install

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
