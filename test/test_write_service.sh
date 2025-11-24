#!/bin/bash
set -euo pipefail

BASE_URL="http://localhost:4000"

# Colors
GREEN="\\033[32m"
RED="\\033[31m"
YELLOW="\\033[33m"
BOLD="\\033[1m"
RESET="\\033[0m"

# Pretty Headers
section() {
  echo -e "\n${BOLD}$1${RESET}"
}

# Status Helpers
ok()   { echo -e "${GREEN}✓${RESET} $1"; }
fail() { echo -e "${RED}✗ $1${RESET}"; exit 1; }

echo "=== Testing Write Service at $BASE_URL ==="

################################################################################
# 1. CREATE VALID EVENT
################################################################################
section "[1] Creating a valid event (POST /events)"

CREATE_STATUS=$(curl -s -o /tmp/create_event_out.json -w "%{http_code}" \
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

if [[ "$CREATE_STATUS" != "201" ]]; then
  fail "Event creation failed (status $CREATE_STATUS)"
fi

EVENT_ID=$(jq -r '.id' /tmp/create_event_out.json)
ok "Event created"
echo "   → Event ID: $EVENT_ID"


################################################################################
# 2. CREATE INVALID EVENT (MISSING NAME)
################################################################################
section "[2] Creating an invalid event (missing required name)"

INVALID_STATUS=$(curl -s -o /tmp/invalid_event.json -w "%{http_code}" \
  -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -d '{
        "description": "missing name field",
        "location": "NYC",
        "start": "2025-12-11T12:00:00Z",
        "end": "2025-12-11T13:00:00Z"
      }')

if [[ "$INVALID_STATUS" == "400" ]]; then
  ok "Invalid event correctly rejected"
else
  echo "Response:"
  cat /tmp/invalid_event.json
  fail "Invalid event unexpectedly accepted (status $INVALID_STATUS)"
fi


################################################################################
# 3. UPDATE EVENT (PUT)
################################################################################
section "[3] Updating event (PUT /events/$EVENT_ID)"

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
  ok "Event updated successfully"
else
  echo "Response:"
  cat /tmp/update_event.json
  fail "Failed to update event (status $UPDATE_STATUS)"
fi


################################################################################
# 4. DELETE EVENT
################################################################################
section "[4] Deleting event (DELETE /events/$EVENT_ID)"

DELETE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X DELETE "$BASE_URL/events/$EVENT_ID")

case "$DELETE_STATUS" in
  204|200)
    ok "Event deleted successfully (status $DELETE_STATUS)"
    ;;
  *)
    fail "Failed to delete event (status $DELETE_STATUS)"
    ;;
esac

echo -e "\n${GREEN}${BOLD}🎉 All Write-Service Tests Passed!${RESET}"
