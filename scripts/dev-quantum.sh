#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend/quantum_api"
REQUIREMENTS="$BACKEND_DIR/requirements.txt"
VENV_DIR="$BACKEND_DIR/.venv"
REQ_HASH_FILE="$VENV_DIR/.requirements.sha256"
BACKEND_PID=""

cd "$ROOT_DIR"

echo "CloudPilot AI — local frontend + Hybrid-Quantum API"
echo "Repository: $ROOT_DIR"

# Set up the frontend dependencies on first use.
if [[ ! -d "$ROOT_DIR/node_modules" ]]; then
  echo "[1/4] Installing frontend dependencies..."
  npm install
else
  echo "[1/4] Frontend dependencies already installed."
fi

# Prefer Python 3.11; use 3.12 if that is what is installed on macOS.
if [[ -n "${QUANTUM_PYTHON:-}" ]]; then
  PYTHON_BIN="$QUANTUM_PYTHON"
elif command -v python3.11 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3.11)"
elif command -v python3.12 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3.12)"
else
  echo "ERROR: Python 3.11 or 3.12 is required. Install one, or set QUANTUM_PYTHON to its executable." >&2
  exit 1
fi

PYTHON_VERSION="$("$PYTHON_BIN" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
if [[ "$PYTHON_VERSION" != "3.11" && "$PYTHON_VERSION" != "3.12" ]]; then
  echo "ERROR: Selected Python is $PYTHON_VERSION. Use Python 3.11 or 3.12 (or set QUANTUM_PYTHON)." >&2
  exit 1
fi

# Create the backend environment once. It lives under the ignored .venv directory.
if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  echo "[2/4] Creating quantum API virtual environment with Python $PYTHON_VERSION..."
  "$PYTHON_BIN" -m venv "$VENV_DIR"
else
  echo "[2/4] Quantum API virtual environment already exists."
fi

# Install/update backend packages only when requirements.txt changes.
CURRENT_REQ_HASH="$(shasum -a 256 "$REQUIREMENTS" | awk '{print $1}')"
SAVED_REQ_HASH=""
if [[ -f "$REQ_HASH_FILE" ]]; then
  SAVED_REQ_HASH="$(cat "$REQ_HASH_FILE")"
fi
if [[ "$CURRENT_REQ_HASH" != "$SAVED_REQ_HASH" ]]; then
  echo "[3/4] Installing quantum API dependencies. The first install may take several minutes..."
  "$VENV_DIR/bin/python" -m pip install --upgrade pip
  "$VENV_DIR/bin/python" -m pip install -r "$REQUIREMENTS"
  printf '%s' "$CURRENT_REQ_HASH" > "$REQ_HASH_FILE"
else
  echo "[3/4] Quantum API dependencies are up to date."
fi

# If a working API already runs on port 8000, reuse it; otherwise launch one.
if curl -fsS http://127.0.0.1:8000/health 2>/dev/null | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"'; then
  echo "FastAPI is already healthy at http://127.0.0.1:8000; reusing it."
else
  echo "Starting FastAPI at http://127.0.0.1:8000 ..."
  (
    cd "$BACKEND_DIR"
    exec "$VENV_DIR/bin/uvicorn" main:app --host 127.0.0.1 --port 8000
  ) &
  BACKEND_PID=$!

  cleanup() {
    if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
      echo
      echo "Stopping the FastAPI process started by this script..."
      kill "$BACKEND_PID" 2>/dev/null || true
      wait "$BACKEND_PID" 2>/dev/null || true
    fi
  }
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

  READY=0
  for ((attempt=1; attempt<=90; attempt++)); do
    if curl -fsS http://127.0.0.1:8000/health 2>/dev/null | grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"'; then
      READY=1
      break
    fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      echo "ERROR: FastAPI exited before becoming healthy. Check whether port 8000 is already in use." >&2
      exit 1
    fi
    sleep 1
  done
  if [[ "$READY" != "1" ]]; then
    echo "ERROR: FastAPI did not become healthy within 90 seconds. See the backend output above." >&2
    exit 1
  fi
fi

echo "[4/4] FastAPI is healthy. Starting Vite at http://localhost:3000 ..."
echo "Leave this terminal open. Press Ctrl+C to stop Vite and the FastAPI process started here."
npm run dev
