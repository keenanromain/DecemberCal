#!/bin/sh
set -e

echo "🔧 Waiting for Postgres to be ready..."
until nc -z postgres 5432; do
  echo "⏳ Postgres not ready yet..."
  sleep 1
done

echo "🚀 Postgres is ready. Running migrations..."
npx prisma migrate deploy

echo "✅ Migrations applied. Starting write service…"
node dist/index.js
