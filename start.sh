#!/usr/bin/env bash
# start.sh — Start both backend and frontend in one command
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  🏡  KeyJourney — React + FastAPI"
echo "  ─────────────────────────────────────────────"
echo ""

# ── Clear ports ────────────────────────────────────────────────────────────
echo "  → Clearing ports 8000 and 5173..."
lsof -ti:8000,5173 | xargs kill -9 2>/dev/null || true

# ── Backend ────────────────────────────────────────────────────────────────
echo "  → Starting FastAPI backend on http://localhost:8000"

if [ ! -d "$ROOT/frontend/backend/venv" ]; then
  echo "  → Creating Python venv..."
  python3 -m venv "$ROOT/frontend/backend/venv"
fi

source "$ROOT/frontend/backend/venv/bin/activate"
pip install -q -r "$ROOT/frontend/backend/requirements.txt"

# Load .env from project root if it exists
if [ -f "$ROOT/.env" ]; then
  export $(grep -v '^#' "$ROOT/.env" | xargs)
fi

cd "$ROOT/frontend/backend"
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "  ✓ Backend PID: $BACKEND_PID"

# ── Frontend ───────────────────────────────────────────────────────────────
echo ""
echo "  → Starting React frontend on http://localhost:5173"

cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  echo "  → Installing npm packages (first run)..."
  npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "  ✓ Frontend PID: $FRONTEND_PID"

echo ""
echo "  ✅  App running at: http://localhost:5173"
echo "  📋  API docs at:    http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers."

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

wait
