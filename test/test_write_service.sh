#!/bin/bash
set -euo pipefail

BASE_URL="http://localhost:4000"
echo "=== Testing Write Service at $BASE_URL ==="

############################################
# 1. Create a valid event
############################################
echo "[1] Creating a valid event (POST /events)..."

CREATE_RESPONSE=$(curl -s -o /tmp/create_event_out.json -w "%{http_code}" \
  -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -d '{
        "name": "Event created from test suite",
        "description": "Test coverage improvements",
        "location": "NYC",
        "start": "2025-12-11T12:00:00Z",
        "end": "2025-12-11T13:00:00Z",
        "min_attendees": 5,
        "max_attendees": 10
      }')

if [[ "$CREATE_RESPONSE" != "201" ]]; then
  echo "❌ Event creation failed (status $CREATE_RESPONSE)"
  cat /tmp/create_event_out.json
  exit 1
fi

EVENT_ID=$(jq -r '.id' /tmp/create_event_out.json)
echo "✅ Event created"
echo "   -> New event ID: $EVENT_ID"


############################################
# 2. Create an invalid event (missing name)
############################################
echo "[2] Creating an invalid event (missing required name)..."

INVALID_RESPONSE=$(curl -s -o /tmp/invalid_event.json -w "%{http_code}" \
  -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -d '{
        "description": "missing name field",
        "location": "NYC",
        "start": "2025-12-11T12:00:00Z",
        "end": "2025-12-11T13:00:00Z"
      }')

if [[ "$INVALID_RESPONSE" == "400" ]]; then
  echo "✅ Invalid event correctly rejected"
else
  echo "❌ Invalid event unexpectedly accepted (status $INVALID_RESPONSE)"
  cat /tmp/invalid_event.json
  exit 1
fi


############################################
# 3. Update event — MUST send a full valid body
############################################
echo "[3] Updating event (PUT /events/$EVENT_ID)..."

UPDATE_STATUS=$(curl -s -o /tmp/update_event.json -w "%{http_code}" \
  -X PUT "$BASE_URL/events/$EVENT_ID" \
  -H "Content-Type: application/json" \
  -d "{
        \"name\": \"Updated Event Title\",
        \"description\": \"Updated description\",
        \"location\": \"Boston\",
        \"start\": \"2025-12-11T14:00:00Z\",
        \"end\": \"2025-12-11T15:00:00Z\",
        \"min_attendees\": 3,
        \"max_attendees\": 20
      }")

if [[ "$UPDATE_STATUS" == "200" ]]; then
  echo "✅ Event updated successfully"
else
  echo "❌ Failed to update event (status $UPDATE_STATUS)"
  cat /tmp/update_event.json
  exit 1
fi


###########################################
# 4. DELETE EVENT
###########################################
echo "[4] Deleting event (DELETE /events/$EVENT_ID)..."

DELETE_STATUS=$(curl -s -o /dev/null \
  -w "%{http_code}" \
  -X DELETE "$BASE_URL/events/$EVENT_ID")

case "$DELETE_STATUS" in
  204|200)
    echo "✅ Event deleted successfully (status $DELETE_STATUS)"
    ;;
  *)
    echo "❌ Failed to delete event (status $DELETE_STATUS)"
    exit 1
    ;;
esac
