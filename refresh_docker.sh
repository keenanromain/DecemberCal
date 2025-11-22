#!/usr/bin/env bash

set -e

PROJECT="decembercal"
COMPOSE="docker compose"

echo "---------------------------------------------"
echo "🚧 Stopping Docker Compose project ($PROJECT)"
echo "---------------------------------------------"
$COMPOSE down || true

echo "---------------------------------------------"
echo "🧹 Pruning unused Docker resources (safe prune)"
echo "---------------------------------------------"
docker system prune -f

echo "---------------------------------------------"
echo "🐳 Checking Docker daemon health"
echo "---------------------------------------------"
docker info >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Docker daemon is not healthy. Restart Docker Desktop."
  exit 1
fi
echo "✅ Docker daemon is healthy."

echo "---------------------------------------------"
echo "🚀 Starting Docker Compose (fresh boot)"
echo "---------------------------------------------"
$COMPOSE up -d --build

echo "---------------------------------------------"
echo "🩺 Running container health checks"
echo "---------------------------------------------"

# Check Postgres
POSTGRES_ID="$($COMPOSE ps -q postgres)"
if [ -z "$POSTGRES_ID" ]; then
  echo "❌ Postgres container not found"
else
  HEALTH=$(docker inspect "$POSTGRES_ID" --format='{{json .State.Health}}' 2>/dev/null)
  echo "🐘 Postgres health: $HEALTH"
fi

# Check Read Service
READ_ID="$($COMPOSE ps -q read-service)"
if [ -n "$READ_ID" ]; then
  echo "🔍 Checking read-service /healthz ..."
  curl -sf http://localhost:4001/healthz >/dev/null &&
    echo "✅ Read-service healthy" ||
    echo "❌ Read-service FAILED healthz"
else
  echo "❌ Read-service container not found"
fi

# Check Write Service
WRITE_ID="$($COMPOSE ps -q write-service)"
if [ -n "$WRITE_ID" ]; then
  echo "🔍 Checking write-service /healthz ..."
  curl -sf http://localhost:4000/healthz >/dev/null &&
    echo "✅ Write-service healthy" ||
    echo "❌ Write-service FAILED healthz"
else
  echo "❌ Write-service container not found"
fi

# Check Frontend
FRONTEND_ID="$($COMPOSE ps -q frontend)"
if [ -n "$FRONTEND_ID" ]; then
  echo "🔍 Checking frontend (/)..."
  curl -sf http://localhost:5173 >/dev/null &&
    echo "✅ Frontend healthy" ||
    echo "❌ Frontend FAILED"
else
  echo "❌ Frontend container not found"
fi

echo "---------------------------------------------"
echo "🎉 All services restarted & health checked!"
echo "---------------------------------------------"
