#!/usr/bin/env bash
set -euo pipefail

# Wrapper to run arbitrary commands in the project's Python .venv if available
# Usage: ./scripts/run-in-venv.sh -- command args...

PROJECT_ROOT=$(cd "$(dirname "$0")/.." && pwd)
VENV_DIR="$PROJECT_ROOT/.venv"

activate_script=""
if [ -f "$VENV_DIR/bin/activate" ]; then
  activate_script="$VENV_DIR/bin/activate"
elif [ -f "$VENV_DIR/Scripts/activate" ]; then
  # On Windows the venv uses Scripts/activate
  activate_script="$VENV_DIR/Scripts/activate"
fi

if [ -n "$activate_script" ]; then
  # shellcheck source=/dev/null
  source "$activate_script"
  export LOGISTIX_VENV_ACTIVE=1
  # Execute the rest of the args as a single command
  if [ "$#" -eq 0 ]; then
    echo "[run-in-venv] No command specified" >&2
    exit 2
  fi
  exec "$@"
else
  echo "[run-in-venv] .venv not found at $VENV_DIR — running command without venv" >&2
  exec "$@"
fi
