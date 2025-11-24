#!/usr/bin/env bash
set -euo pipefail

echo "=== Running all service + integration tests ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$SCRIPT_DIR/test_write_service.sh"
bash "$SCRIPT_DIR/test_read_service.sh"
bash "$SCRIPT_DIR/test_integration.sh"

echo "=== All tests finished ==="
