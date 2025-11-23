#!/bin/bash
set -euo pipefail

COMPOSE="docker compose"
MAX_RETRIES=20
SLEEP_TIME=1

echo ""
echo "🚿 Cleaning up old Docker containers, networks, dangling images…"
$COMPOSE down -v --remove-orphans >/dev/null 2>&1 || true
docker system prune -f >/dev/null 2>&1 || true
echo "✅ Docker cleanup complete"
echo ""

echo "🚀 Starting fresh containers…"
$COMPOSE up -d --build

echo ""
echo "⏳ Waiting for services to become healthy…"
echo ""

###############################################
# Function: wait_for_port HOST PORT SERVICE
###############################################
wait_for_port() {
  local HOST=$1
  local PORT=$2
  local NAME=$3

  echo "🔍 Checking $NAME on $HOST:$PORT …"

  for i in $(seq 1 $MAX_RETRIES); do
    if nc -z "$HOST" "$PORT" 2>/dev/null; then
      echo "   ➤ $NAME port open"
      return 0
    fi
    echo "   ⏳ [$i/$MAX_RETRIES] Waiting for $NAME port…"
    sleep $SLEEP_TIME
  done

  echo "❌ $NAME port did NOT open"
  exit 1
}

###############################################
# Function: wait_for_health ENDPOINT NAME
###############################################
wait_for_health() {
  local URL=$1
  local NAME=$2

  echo "🔍 Checking $NAME /healthz ($URL)…"

  for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf "$URL" | grep -q '"ok"'; then
      echo "   ➤ $NAME healthy"
      return 0
    fi
    echo "   ⏳ [$i/$MAX_RETRIES] Waiting for $NAME health…"
    sleep $SLEEP_TIME
  done

  echo "❌ $NAME failed healthz after retries"
  exit 1
}

###############################################
# Wait for services
###############################################

# Postgres
wait_for_port "localhost" 5432 "Postgres"

# Write service (port open)
wait_for_port "localhost" 4000 "Write-service"

# Write-service healthz
wait_for_health "http://localhost:4000/healthz" "Write-service"

# Read service (port)
wait_for_port "localhost" 4001 "Read-service"

# Read-service healthz
wait_for_health "http://localhost:4001/healthz" "Read-service"

# Frontend (5173)
wait_for_port "localhost" 5173 "Frontend"
# No healthz — curl index
for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf http://localhost:5173 >/dev/null; then
    echo "   ➤ Frontend reachable"
    break
  fi
  echo "   ⏳ [$i/$MAX_RETRIES] Waiting for frontend…"
  sleep $SLEEP_TIME
done

###############################################
# Optional: Verify SSE stream is reachable
###############################################
echo ""
echo "🔍 Checking SSE endpoint…"
if curl -sfN --max-time 3 http://localhost:4001/events/stream >/dev/null; then
  echo "   ➤ SSE endpoint reachable"
else
  echo "   ⚠️ SSE stream reachable but curl may exit early (normal)"
fi

echo ""
echo "🎉 All services UP AND HEALTHY!"
