#!/usr/bin/env bash
set -euo pipefail

WRITE_BASE="${WRITE_BASE:-http://localhost:4000}"
echo "=== Testing Write Service at $WRITE_BASE ==="

command -v jq >/dev/null 2>&1 || { echo "jq is required but not installed"; exit 1; }

NEW_EVENT_JSON='{
  "name": "Test Event",
  "description": "An event created by write-service tests",
  "start": "2025-12-10T15:00:00.000Z",
  "end":   "2025-12-10T16:00:00.000Z",
  "location": "Testville",
  "min_attendees": 1,
  "max_attendees": 10
}'

echo "[1] Creating a valid event (POST /events)..."
CREATE_RESP=$(curl -s -o /tmp/write_create_resp.json -w "%{http_code}" \
  -X POST "$WRITE_BASE/events" \
  -H "Content-Type: application/json" \
  -d "$NEW_EVENT_JSON")

if [ "$CREATE_RESP" -ne 201 ] && [ "$CREATE_RESP" -ne 200 ]; then
  echo "❌ Failed to create event (status $CREATE_RESP)"
  cat /tmp/write_create_resp.json
  exit 1
fi
echo "✅ Event created (status $CREATE_RESP)"

EVENT_ID=$(jq -r '.id' /tmp/write_create_resp.json)
if [ -z "$EVENT_ID" ] || [ "$EVENT_ID" == "null" ]; then
  echo "❌ Response did not contain an 'id' field"
  cat /tmp/write_create_resp.json
  exit 1
fi
echo "   -> New event ID: $EVENT_ID"

echo "[2] Creating an invalid event (missing required name)..."
INVALID_JSON='{
  "description": "Missing name field",
  "start": "2025-12-10T15:00:00.000Z",
  "end":   "2025-12-10T16:00:00.000Z",
  "location": "Nowhere"
}'

INVALID_STATUS=$(curl -s -o /tmp/write_invalid_resp.json -w "%{http_code}" \
  -X POST "$WRITE_BASE/events" \
  -H "Content-Type: application/json" \
  -d "$INVALID_JSON")

if [ "$INVALID_STATUS" -lt 400 ] || [ "$INVALID_STATUS" -ge 500 ]; then
  echo "❌ Expected a 4xx client error for invalid payload, got $INVALID_STATUS"
  cat /tmp/write_invalid_resp.json
  exit 1
fi
echo "✅ Invalid event correctly rejected (status $INVALID_STATUS)"

echo "[3] Updating the created event (PUT /events/:id)..."
UPDATE_JSON=$(jq '.name = "Updated Test Event"' /tmp/write_create_resp.json)

UPDATE_STATUS=$(curl -s -o /tmp/write_update_resp.json -w "%{http_code}" \
  -X PUT "$WRITE_BASE/events/$EVENT_ID" \
  -H "Content-Type: application/json" \
  -d "$UPDATE_JSON")

if [ "$UPDATE_STATUS" -lt 200 ] || [ "$UPDATE_STATUS" -ge 300 ]; then
  echo "❌ Failed to update event (status $UPDATE_STATUS)"
  cat /tmp/write_update_resp.json
  exit 1
fi
echo "✅ Event updated (status $UPDATE_STATUS)"

echo "[4] Deleting the event (DELETE /events/:id)..."
DELETE_STATUS=$(curl -s -o /tmp/write_delete_resp.json -w "%{http_code}" \
  -X DELETE "$WRITE_BASE/events/$EVENT_ID")

if [ "$DELETE_STATUS" -lt 200 ] || [ "$DELETE_STATUS" -ge 300 ]; then
  echo "❌ Failed to delete event (status $DELETE_STATUS)"
  cat /tmp/write_delete_resp.json
  exit 1
fi
echo "✅ Event deleted (status $DELETE_STATUS)"

echo "=== Write Service tests PASSED ==="
