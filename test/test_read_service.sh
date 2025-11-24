#!/usr/bin/env bash
set -euo pipefail

READ_BASE="${READ_BASE:-http://localhost:4001}"
echo "=== Testing Read Service at $READ_BASE ==="

command -v jq >/dev/null 2>&1 || { echo "jq is required but not installed"; exit 1; }

echo "[1] GET /events..."
LIST_STATUS=$(curl -s -o /tmp/read_events_list.json -w "%{http_code}" \
  "$READ_BASE/events")

if [ "$LIST_STATUS" -ne 200 ]; then
  echo "❌ GET /events returned status $LIST_STATUS"
  cat /tmp/read_events_list.json
  exit 1
fi
echo "✅ GET /events OK (status 200)"

echo "    Number of events:"
jq 'length' /tmp/read_events_list.json || true

if [ "${EVENT_ID:-}" != "" ]; then
  echo "[2] GET /events/$EVENT_ID..."
  GET_ONE_STATUS=$(curl -s -o /tmp/read_event_one.json -w "%{http_code}" \
    "$READ_BASE/events/$EVENT_ID")

  if [ "$GET_ONE_STATUS" -ne 200 ]; then
    echo "❌ GET /events/$EVENT_ID returned status $GET_ONE_STATUS"
    cat /tmp/read_event_one.json
    exit 1
  fi
  echo "✅ GET /events/$EVENT_ID OK (status 200)"
  echo "   Event name:"
  jq -r '.name' /tmp/read_event_one.json || true
else
  echo "[2] Skipping GET /events/:id because EVENT_ID is not set."
  echo "    You can set EVENT_ID=<id> to test a specific event."
fi

echo "[3] SSE stability test (GET /events/stream)..."
echo "    Connecting for ~5 seconds to verify stream..."

SSE_STATUS=0
curl -sN --max-time 5 "$READ_BASE/events/stream" > /tmp/read_sse_sample.log || SSE_STATUS=$?

if [ "$SSE_STATUS" -ne 0 ] && [ "$SSE_STATUS" -ne 28 ]; then
  echo "❌ SSE stream /events/stream failed (curl exit code $SSE_STATUS)"
  cat /tmp/read_sse_sample.log
  exit 1
fi

echo "✅ SSE stream reachable; sample of data (if any):"
head -n 10 /tmp/read_sse_sample.log || true

echo "=== Read Service tests PASSED ==="
