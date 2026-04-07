#!/usr/bin/env bash
# start.sh — Start both backend and frontend in one command
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "  KeyJourney — React + FastAPI"
echo ""

# ── Clear ports ────────────────────────────────────────────────────────────
echo "  → Clearing ports 8000 and 5173..."
lsof -ti:8000,5173 | xargs kill -9 2>/dev/null || true

# ── Backend ────────────────────────────────────────────────────────────────
echo "  → Starting FastAPI backend on http://localhost:8000"

if [ ! -d "$ROOT/backend/venv" ]; then
  echo "  → Creating Python venv..."
  python3 -m venv "$ROOT/backend/venv"
fi

source "$ROOT/backend/venv/bin/activate"
python -m pip install -q -r "$ROOT/requirements.txt"

# Load .env from project root if it exists
if [ -f "$ROOT/.env" ]; then
  set -a; source "$ROOT/.env"; set +a
else
  echo "  WARNING: .env not found — app will not connect to Supabase"
fi

cd "$ROOT"
uvicorn backend.main:app --reload --port 8000 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID"

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
echo "  Frontend PID: $FRONTEND_PID"

echo ""
echo "  App running at: http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop both servers."

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

wait
