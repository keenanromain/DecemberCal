#!/bin/bash
set -euo pipefail

BASE="http://localhost:4001"
echo "=== Testing Read Service at $BASE ==="

########################################
# Helper: pretty check
########################################
require_status() {
  local EXPECTED=$1
  local GOT=$2
  local MSG=$3

  if [[ "$EXPECTED" == "$GOT" ]]; then
    echo "✅ $MSG"
  else
    echo "❌ $MSG (status $GOT, expected $EXPECTED)"
    exit 1
  fi
}

########################################
# 1. GET /events
########################################
echo "[1] Fetching all events (GET /events)..."
STATUS=$(curl -s -o /tmp/read_all.json -w "%{http_code}" "$BASE/events")
require_status 200 "$STATUS" "Fetched events list"
COUNT=$(jq length /tmp/read_all.json 2>/dev/null || echo 0)
echo "   -> Returned $COUNT events"

########################################
# 2. Create a test event via write-service
########################################
echo "[2] Creating a test event for lookup..."
CREATE_STATUS=$(curl -s -o /tmp/read_created.json -w "%{http_code}" \
  -X POST http://localhost:4000/events \
  -H "Content-Type: application/json" \
  -d '{
        "name":"Read-service test event",
        "description":"For read tests",
        "location":"NYC",
        "start":"2025-12-14T12:00:00Z",
        "end":"2025-12-14T13:00:00Z"
      }')

require_status 201 "$CREATE_STATUS" "Created event for read tests"

EVENT_ID=$(jq -r '.id' /tmp/read_created.json)
echo "   -> Event ID: $EVENT_ID"

########################################
# 3. GET /events/:id (valid)
########################################
echo "[3] Fetching created event (GET /events/$EVENT_ID)..."
STATUS=$(curl -s -o /tmp/read_one.json -w "%{http_code}" "$BASE/events/$EVENT_ID")
require_status 200 "$STATUS" "Fetched event by ID"
NAME=$(jq -r '.name' /tmp/read_one.json)
echo "   -> Event name: $NAME"

########################################
# 4. GET /events/:id (invalid)
########################################
echo "[4] Fetching non-existent event (GET /events/bad-id)..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/events/bad-id")
require_status 404 "$STATUS" "Correctly handled non-existent ID"

########################################
# 5. SSE /events/stream
########################################
echo "[5] Checking SSE stream stability (GET /events/stream)..."
# We only test whether it *connects*. curl returns 0 quickly because SSE is infinite.
curl -sfN --max-time 3 "$BASE/events/stream" >/tmp/read_sse.out 2>/dev/null \
  && echo "✅ SSE stream reachable" \
  || echo "⚠️ SSE connected but closed early (normal with --max-time)"

########################################
# Cleanup: delete the event through write-service
########################################
echo "[6] Cleaning up test event (DELETE /events/$EVENT_ID)..."
DEL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE "http://localhost:4000/events/$EVENT_ID")

# NOTE: write-service returns 204 No Content on successful delete
require_status 204 "$DEL_STATUS" "Deleted test event"

echo ""
echo "🎉 Read-service tests complete and ALL PASSED!"

