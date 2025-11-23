#!/usr/bin/env bash
set -euo pipefail

# ===============================
#  Pretty Console Output
# ===============================

GREEN="\033[1;32m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
BLUE="\033[1;34m"
RESET="\033[0m"

function info()  { echo -e "${BLUE}ℹ️  $1${RESET}"; }
function warn()  { echo -e "${YELLOW}⚠️  $1${RESET}"; }
function error() { echo -e "${RED}❌ $1${RESET}"; }
function ok()    { echo -e "${GREEN}✅ $1${RESET}"; }


# ===============================
# 1. Docker Prune (safe)
# ===============================

info "Cleaning unused Docker resources…"
docker system prune -f >/dev/null
docker volume prune -f >/dev/null
ok "Docker cleanup complete."


# ===============================
# 2. Restart full stack
# ===============================

info "Restarting Docker Compose stack…"
docker compose down -v --remove-orphans >/dev/null 2>&1 || true
docker compose up -d --build
ok "Stack started."


# ===============================
# 3. Function: wait for container health
# ===============================

wait_for_health() {
  local name="$1"
  local container_id
  container_id="$(docker compose ps -q "$name")"

  if [[ -z "$container_id" ]]; then
    error "Container '$name' not found!"
    return 1
  fi

  info "Waiting for ${name} container health…"

  # loop until healthy or timeout
  for i in {1..40}; do
    status="$(docker inspect -f '{{.State.Health.Status}}' "$container_id" 2>/dev/null || echo "starting")"

    if [[ "$status" == "healthy" ]]; then
      ok "$name is healthy."
      return 0
    fi

    if [[ "$status" == "unhealthy" ]]; then
      error "$name became UNHEALTHY!"
      return 1
    fi

    sleep 1
  done

  error "Timed out waiting for $name health."
  return 1
}


# ===============================
# 4. Wait for ALL services
# ===============================

wait_for_health postgres
wait_for_health write-service
wait_for_health read-service
wait_for_health frontend


# ===============================
# Done
# ===============================

ok "All services are healthy. Environment fully refreshed!"
echo ""
info "You can now visit the app at: http://localhost:5173"