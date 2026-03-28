# KeyJourney

A private home-buying tracker for the Swedish market. Track savings, log viewings, compare listings, run mortgage calculations, and manage your buying checklist — all in one place.

---

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React + TypeScript + Vite + Tailwind |
| Backend | FastAPI (Python) — serverless via Vercel |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Google OAuth |
| Hosting | Vercel (frontend + backend) |

---

## Pages

| Page | Purpose |
| --- | --- |
| Dashboard | Savings overview, KPIs, upcoming viewings |
| Savings | Track savings targets and monthly contributions |
| Checklist | Kanban board (To Do / In Progress / Done) for the buying journey |
| Viewings | Log apartments viewed, upcoming reminders, bidding history |
| Bid Tracker | All bidding attempts in a table — rounds, highest bid, your bid |
| Comparison | Compare listings from Hemnet, Booli, etc. side by side |
| Calculator | Swedish mortgage calculator (ränteavdrag, amortering, stress test) |
| Maps | Directions and nearby amenities (transit, gym, grocery, etc.) |

---

## One-time Setup

### 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier)
2. In the SQL editor, paste and run **`supabase/schema.sql`**
3. Under **Authentication → Providers → Google** — enable Google login and add your OAuth credentials from [console.cloud.google.com](https://console.cloud.google.com)
4. Under **Authentication → URL Configuration** — add `http://localhost:5173` and your Vercel URL to Redirect URLs
5. Under **Project Settings → API**, copy your keys into `.env`

### 2. Configure environment variables

Copy `.env` and fill in all values:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...          # service_role key — backend only
SUPABASE_JWT_SECRET=...              # Settings → API → JWT Secret
ALLOWED_EMAILS=you@gmail.com         # comma-separated, or blank to allow all
FRONTEND_URL=https://yourapp.vercel.app

VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...        # publishable/anon key — frontend safe
```

---

## Local Development

```bash
./start.sh
```

Then open **http://localhost:5173**

### Manual

```bash
# Backend
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

---

## Deployment (Vercel + Supabase)

Both frontend and backend deploy together from the same repo — no separate backend hosting needed.

1. Push repo to GitHub
2. [vercel.com](https://vercel.com) → New Project → import repo → leave root directory as `/`
3. Add all environment variables in Vercel project settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — frontend and `/api/*` routes are handled automatically via `vercel.json`

---

## Access Control

Each user signs in with Google and only sees their own data (enforced by Supabase Row Level Security).

Optionally restrict to specific accounts via `ALLOWED_EMAILS`:

```env
ALLOWED_EMAILS=you@gmail.com,partner@gmail.com
```

Leave blank to allow any Google account.

---

## Data Storage

- **Supabase PostgreSQL** — all app data (settings, viewings, upcoming), isolated per user
- **localStorage** — comparison boards and checklist (browser only)

---

## Project Structure

```
manifest-home/
├── api/
│   └── index.py             # Vercel Python serverless entry point
├── backend/
│   ├── main.py              # FastAPI — all API endpoints
│   └── requirements.txt     # Python deps for local dev
├── frontend/
│   ├── src/
│   │   ├── pages/           # Dashboard, Savings, Checklist, Viewings,
│   │   │                    # BidTracker, Comparison, Calculator, Maps, Login
│   │   ├── components/      # Layout, MetricCard, Alert, SavingsChart
│   │   ├── lib/
│   │   │   ├── api.ts       # Typed fetch wrappers for all endpoints
│   │   │   └── supabase.ts  # Supabase client (auth)
│   │   ├── App.tsx          # Router + auth gate
│   │   └── main.tsx
│   ├── vercel.json          # SPA routing fallback
│   ├── package.json
│   └── vite.config.ts       # Proxies /api → localhost:8000 in dev
├── utils/
│   ├── data.py              # All Supabase read/write operations (per user)
│   ├── savings.py           # Projection calculations
│   └── supabase_client.py   # Supabase client init
├── supabase/
│   └── schema.sql           # Run once in Supabase SQL editor
├── requirements.txt         # Python deps for Vercel
├── vercel.json              # Vercel monorepo config (frontend + API)
├── .env                     # All secrets (git-ignored)
└── start.sh                 # One-command local launcher
```
