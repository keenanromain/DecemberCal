#!/usr/bin/env bash
set -euo pipefail

WRITE_BASE="${WRITE_BASE:-http://localhost:4000}"
READ_BASE="${READ_BASE:-http://localhost:4001}"

echo "=== Integration Tests (Write <-> DB <-> Read) ==="
echo "Using WRITE_BASE=$WRITE_BASE"
echo "Using READ_BASE=$READ_BASE"

command -v jq >/dev/null 2>&1 || { echo "jq is required but not installed"; exit 1; }

INT_EVENT_JSON='{
  "name": "Integration Test Event",
  "description": "Created by integration test",
  "start": "2025-12-15T10:00:00.000Z",
  "end":   "2025-12-15T11:00:00.000Z",
  "location": "Integration City",
  "min_attendees": 2,
  "max_attendees": 5
}'

echo "[1] Creating event via WRITE service (POST /events)..."
CREATE_STATUS=$(curl -s -o /tmp/int_create_resp.json -w "%{http_code}" \
  -X POST "$WRITE_BASE/events" \
  -H "Content-Type: application/json" \
  -d "$INT_EVENT_JSON")

if [ "$CREATE_STATUS" -lt 200 ] || [ "$CREATE_STATUS" -ge 300 ]; then
  echo "❌ Write service failed to create event (status $CREATE_STATUS)"
  cat /tmp/int_create_resp.json
  exit 1
fi

INT_EVENT_ID=$(jq -r '.id' /tmp/int_create_resp.json)
if [ -z "$INT_EVENT_ID" ] || [ "$INT_EVENT_ID" == "null" ]; then
  echo "❌ Integration: response did not contain 'id'"
  cat /tmp/int_create_resp.json
  exit 1
fi
echo "✅ Event created with id: $INT_EVENT_ID"

echo "[2] Polling READ service for GET /events/$INT_EVENT_ID..."
MAX_ATTEMPTS=10
SLEEP_SECONDS=1
FOUND=0

for i in $(seq 1 $MAX_ATTEMPTS); do
  STATUS=$(curl -s -o /tmp/int_read_one.json -w "%{http_code}" \
    "$READ_BASE/events/$INT_EVENT_ID") || STATUS=$?
  if [ "$STATUS" -eq 200 ]; then
    FOUND=1
    break
  fi
  echo "   Attempt $i/$MAX_ATTEMPTS: not yet present (status $STATUS), sleeping..."
  sleep $SLEEP_SECONDS
done

if [ "$FOUND" -ne 1 ]; then
  echo "❌ Integration: event not visible in read service after $MAX_ATTEMPTS attempts"
  cat /tmp/int_read_one.json || true
  exit 1
fi
echo "✅ Read service can see event $INT_EVENT_ID"

echo "[3] Updating event via WRITE service..."
UPDATE_JSON=$(jq '.name = "Integration Test Event (Updated)"' /tmp/int_create_resp.json)

UPDATE_STATUS=$(curl -s -o /tmp/int_update_resp.json -w "%{http_code}" \
  -X PUT "$WRITE_BASE/events/$INT_EVENT_ID" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_JSON")

if [ "$UPDATE_STATUS" -lt 200 ] || [ "$UPDATE_STATUS" -ge 300 ]; then
  echo "❌ Integration: failed to update event in write service (status $UPDATE_STATUS)"
  cat /tmp/int_update_resp.json
  exit 1
fi
echo "✅ Write service updated event"

echo "[4] Polling READ service for updated name..."
FOUND_UPDATED=0
for i in $(seq 1 $MAX_ATTEMPTS); do
  STATUS=$(curl -s -o /tmp/int_read_updated.json -w "%{http_code}" \
    "$READ_BASE/events/$INT_EVENT_ID") || STATUS=$?

  if [ "$STATUS" -eq 200 ]; then
    NAME=$(jq -r '.name' /tmp/int_read_updated.json)
    if [ "$NAME" = "Integration Test Event (Updated)" ]; then
      FOUND_UPDATED=1
      break
    fi
  fi
  echo "   Attempt $i/$MAX_ATTEMPTS: name not yet updated, sleeping..."
  sleep $SLEEP_SECONDS
done

if [ "$FOUND_UPDATED" -ne 1 ]; then
  echo "❌ Integration: updated name not visible in read service"
  cat /tmp/int_read_updated.json || true
  exit 1
fi
echo "✅ Read service sees updated event name"

echo "[5] Deleting event via WRITE service..."
DELETE_STATUS=$(curl -s -o /tmp/int_delete_resp.json -w "%{http_code}" \
  -X DELETE "$WRITE_BASE/events/$INT_EVENT_ID")

if [ "$DELETE_STATUS" -lt 200 ] || [ "$DELETE_STATUS" -ge 300 ]; then
  echo "❌ Integration: failed to delete event (status $DELETE_STATUS)"
  cat /tmp/int_delete_resp.json
  exit 1
fi
echo "✅ Event deleted in write service"

echo "[6] Verifying READ service no longer returns the event..."
STATUS_AFTER_DELETE=$(curl -s -o /tmp/int_read_after_delete.json -w "%{http_code}" \
  "$READ_BASE/events/$INT_EVENT_ID") || STATUS_AFTER_DELETE=$?

if [ "$STATUS_AFTER_DELETE" -eq 404 ] || [ "$STATUS_AFTER_DELETE" -eq 410 ]; then
  echo "✅ Read service returns $STATUS_AFTER_DELETE after deletion (expected)"
else
  echo "⚠️ Read service returned status $STATUS_AFTER_DELETE after deletion"
  echo "   (You may need to adjust the expected status code.)"
fi

echo "=== Integration tests COMPLETED ==="
