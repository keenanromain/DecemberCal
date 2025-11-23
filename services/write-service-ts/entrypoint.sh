#!/bin/sh
set -e

echo "🔧 Waiting for Postgres to be ready..."
until nc -z postgres 5432; do
  echo "⏳ Postgres not ready yet..."
  sleep 1
done

echo "🚀 Postgres is ready. Skipping migrations for now..."
# npx prisma migrate deploy

echo "✅ Starting write service…"
npm run dev