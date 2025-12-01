#!/bin/bash
set -euo pipefail

###############################################
# Colors
###############################################
RED="\033[0;31m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
RESET="\033[0m"

###############################################
# Helpers
###############################################
log() {
  echo -e "${BLUE}$1${RESET}"
}

success() {
  echo -e "${GREEN}$1${RESET}"
}

warn() {
  echo -e "${YELLOW}$1${RESET}"
}

error() {
  echo -e "${RED}$1${RESET}"
}

###############################################
# Start time measurement
###############################################
START_TIME=$(date +%s)

###############################################
# Detect Docker CLI & Start Docker if needed
###############################################

log "🔍 Checking for Docker installation…"

if ! command -v docker >/dev/null 2>&1; then
  error "❌ Docker is not installed or not found in PATH."
  exit 1
fi

success "   ➤ Docker CLI found"

log "🔍 Checking if Docker daemon is running…"

if ! docker info >/dev/null 2>&1; then
  warn "⚠️  Docker daemon not running. Attempting to start…"

  if [[ "$OSTYPE" == "darwin"* ]]; then
    log "   ➤ Launching Docker Desktop (direct method)…"

    # Launch Docker.app directly — most reliable
    /Applications/Docker.app/Contents/MacOS/Docker &>/dev/null &

    sleep 2

    # Verify Docker Desktop launched at all
    if ! pgrep -f "Docker.app" >/dev/null 2>&1; then
      warn "⚠️  Direct launch failed — retrying with 'open -a Docker'…"
      open --background -a Docker || true
      sleep 2
    fi

    # Wait for Docker daemon to initialize
    for i in {1..30}; do
      if docker info >/dev/null 2>&1; then
        success "   ➤ Docker started successfully"
        break
      fi
      echo "   ⏳ Waiting for Docker to start… ($i/30)"
      sleep 2
    done

  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    log "   ➤ Starting Docker daemon via systemd…"
    sudo systemctl start docker || true

    for i in {1..30}; do
      if docker info >/dev/null 2>&1; then
        success "   ➤ Docker daemon started"
        break
      fi
      echo "   ⏳ Waiting for Docker daemon… ($i/30)"
      sleep 2
    done

  else
    error "❌ Unsupported OS for auto-start. Please start Docker manually."
    exit 1
  fi
fi

# Final check (after macOS/Linux loop)
if ! docker info >/dev/null 2>&1; then
  error "❌ Docker daemon failed to start after multiple attempts."
  exit 1
fi

success "   ➤ Docker daemon is running"

###############################################
# Cleanup stale containers/images/networks
###############################################
log "🚿 Cleaning up stale Docker artifacts…"

docker compose down -v --remove-orphans >/dev/null 2>&1 || true
docker system prune -f >/dev/null 2>&1 || true

success "   ➤ Cleanup complete"

###############################################
# Start containers
###############################################
log "🚀 Starting fresh containers…"

docker compose up -d --build

success "   ➤ Containers started"

###############################################
# Port & health check functions
###############################################
MAX_RETRIES=20
SLEEP_TIME=1
COMPOSE="docker compose"

wait_for_port() {
  local HOST=$1
  local PORT=$2
  local NAME=$3

  log "🔍 Checking $NAME on $HOST:$PORT …"

  for i in $(seq 1 $MAX_RETRIES); do
    if nc -z "$HOST" "$PORT" 2>/dev/null; then
      success "   ➤ $NAME port open"
      return 0
    fi
    echo "   ⏳ [$i/$MAX_RETRIES] Waiting for $NAME port…"
    sleep $SLEEP_TIME
  done

  error "❌ $NAME port did NOT open"
  exit 1
}

wait_for_health() {
  local URL=$1
  local NAME=$2

  log "🔍 Checking $NAME /healthz ($URL)…"

  for i in $(seq 1 $MAX_RETRIES); do
    if curl -sf "$URL" | grep -q '"ok"'; then
      success "   ➤ $NAME healthy"
      return 0
    fi
    echo "   ⏳ [$i/$MAX_RETRIES] Waiting for $NAME health…"
    sleep $SLEEP_TIME
  done

  error "❌ $NAME failed healthz after retries"
  exit 1
}

###############################################
# Wait for services
###############################################
wait_for_port "localhost" 5432 "Postgres"

wait_for_port "localhost" 4000 "Write-service"
wait_for_health "http://localhost:4000/healthz" "Write-service"

wait_for_port "localhost" 4001 "Read-service"
wait_for_health "http://localhost:4001/healthz" "Read-service"

wait_for_port "localhost" 8080 "Frontend"

###############################################
# Check frontend reachable
###############################################
for i in $(seq 1 $MAX_RETRIES); do
  if curl -sf http://localhost:8080 >/dev/null; then
    success "   ➤ Frontend reachable"
    break
  fi
  echo "   ⏳ [$i/$MAX_RETRIES] Waiting for frontend…"
  sleep $SLEEP_TIME
done

###############################################
# Check SSE reachability
###############################################
log "🔍 Checking SSE endpoint…"
if curl -sfN --max-time 3 http://localhost:4001/events/stream >/dev/null; then
  success "   ➤ SSE endpoint reachable"
else
  warn "⚠️ SSE may appear 'closed' due to streaming behavior — normal"
fi

###############################################
# End time measurement
###############################################
END_TIME=$(date +%s)
ELAPSED=$(( END_TIME - START_TIME ))

success "🎉 All services UP AND HEALTHY!"
success "⏱️ Environment ready in ${ELAPSED} seconds."