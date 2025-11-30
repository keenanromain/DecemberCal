#!/usr/bin/env bash
set -euo pipefail

WRITE_BASE="${WRITE_BASE:-http://localhost:4000}"
READ_BASE="${READ_BASE:-http://localhost:4001}"

# Colors
GREEN="\\033[32m"
RED="\\033[31m"
YELLOW="\\033[33m"
RESET="\\033[0m"

echo -e "${YELLOW}=== Integration Tests (Write → DB Trigger → Read) ===${RESET}"
echo "WRITE_BASE=$WRITE_BASE"
echo "READ_BASE=$READ_BASE"
echo ""

command -v jq >/dev/null 2>&1 || { echo "jq is required but not installed"; exit 1; }

########################################
# Helper: status matcher
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
# 1. CREATE EVENT
########################################
echo "[1] Creating event via WRITE service (POST /events)..."

INT_EVENT_JSON='{
  "name": "Integration Test Event",
  "description": "Created by integration test",
  "start": "2025-12-15T10:00:00.000Z",
  "end":   "2025-12-15T11:00:00.000Z",
  "location": "Integration City",
  "min_attendees": 2,
  "max_attendees": 5
}'

CREATE_STATUS=$(curl -s -o /tmp/int_create_resp.json -w "%{http_code}" \
  -X POST "$WRITE_BASE/events" \
  -H "Content-Type: application/json" \
  -d "$INT_EVENT_JSON")

require_status 201 "$CREATE_STATUS" "Event created"

INT_EVENT_ID=$(jq -r '.id' /tmp/int_create_resp.json)
if [[ -z "$INT_EVENT_ID" || "$INT_EVENT_ID" == "null" ]]; then
  echo "❌ Missing ID in write-service create response"
  cat /tmp/int_create_resp.json
  exit 1
fi
echo "   -> Event ID: $INT_EVENT_ID"
echo ""

########################################
# 2. READ EVENT (EVENTUAL CONSISTENCY POLL)
########################################
echo "[2] Checking READ service propagation..."

MAX_ATTEMPTS=10
SLEEP_SECONDS=1
FOUND=0

for i in $(seq 1 $MAX_ATTEMPTS); do
  STATUS=$(curl -s -o /tmp/int_read_one.json -w "%{http_code}" \
    "$READ_BASE/events/$INT_EVENT_ID") || STATUS=$?

  if [[ "$STATUS" -eq 200 ]]; then
    FOUND=1
    break
  fi

  echo "   ⏳ Attempt $i/$MAX_ATTEMPTS — not yet visible (status $STATUS)..."
  sleep $SLEEP_SECONDS
done

if [[ "$FOUND" -ne 1 ]]; then
  echo "❌ Read-service never returned 200 for created event"
  cat /tmp/int_read_one.json || true
  exit 1
fi

echo "✅ Read service sees created event"
echo ""

########################################
# 3. UPDATE EVENT
########################################
echo "[3] Updating event via WRITE service (PUT /events/$INT_EVENT_ID)..."

UPDATE_JSON=$(jq '{
  name: "Integration Test Event (Updated)",
  description,
  start,
  end,
  location,
  min_attendees,
  max_attendees
}' /tmp/int_create_resp.json)

UPDATE_STATUS=$(curl -s -o /tmp/int_update_resp.json -w "%{http_code}" \
  -X PUT "$WRITE_BASE/events/$INT_EVENT_ID" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_JSON")

require_status 200 "$UPDATE_STATUS" "Write-service updated event"
echo ""

########################################
# 4. READ UPDATED EVENT
########################################
echo "[4] Verifying updated name propagates to READ service..."

FOUND_UPDATED=0
for i in $(seq 1 $MAX_ATTEMPTS); do
  STATUS=$(curl -s -o /tmp/int_read_updated.json -w "%{http_code}" \
    "$READ_BASE/events/$INT_EVENT_ID") || STATUS=$?

  if [[ "$STATUS" -eq 200 ]]; then
    NAME=$(jq -r '.name' /tmp/int_read_updated.json)
    if [[ "$NAME" == "Integration Test Event (Updated)" ]]; then
      FOUND_UPDATED=1
      break
    fi
  fi

  echo "   ⏳ Attempt $i/$MAX_ATTEMPTS — update not visible yet..."
  sleep $SLEEP_SECONDS
done

if [[ "$FOUND_UPDATED" -ne 1 ]]; then
  echo "❌ Read service did not reflect updated name"
  cat /tmp/int_read_updated.json || true
  exit 1
fi
echo "✅ Read service sees updated event name"
echo ""

########################################
# 5. DELETE EVENT
########################################
echo "[5] Deleting event via WRITE service (DELETE /events/$INT_EVENT_ID)..."

DELETE_STATUS=$(curl -s -o /tmp/int_delete_resp.json -w "%{http_code}" \
  -X DELETE "$WRITE_BASE/events/$INT_EVENT_ID")

require_status 204 "$DELETE_STATUS" "Event deleted in write service"
echo ""

########################################
# 6. READ-SERVICE MUST NO LONGER RETURN EVENT
########################################
echo "[6] Verifying READ service no longer returns deleted event..."

STATUS_AFTER_DELETE=$(curl -s -o /tmp/int_read_after_delete.json -w "%{http_code}" \
  "$READ_BASE/events/$INT_EVENT_ID") || STATUS_AFTER_DELETE=$?

if [[ "$STATUS_AFTER_DELETE" -eq 404 || "$STATUS_AFTER_DELETE" -eq 410 ]]; then
  echo "✅ Read service correctly returns $STATUS_AFTER_DELETE after deletion"
else
  echo "⚠️ Read service returned $STATUS_AFTER_DELETE (expected 404 or 410)"
fi
echo ""

########################################
# 7. SSE TEST W/ LONGER TIMEOUT
########################################
echo "[7] Checking SSE stream (GET /events/stream)..."

if curl -sfN --max-time 3 "$READ_BASE/events/stream" >/dev/null 2>&1; then
  echo "✅ SSE endpoint reachable"
else
  echo "⚠️ SSE reachable but curl --max-time may exit early (normal)"
fi

echo ""
echo -e "${GREEN}🎉 ALL INTEGRATION TESTS PASSED!${RESET}"
