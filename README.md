# KeyJourney

A private home-buying tracker for the Swedish market. Track savings, log viewings, compare listings, run mortgage calculations, and manage your buying checklist — all in one place.

---

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React + TypeScript + Vite + Tailwind |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Google OAuth |
| Hosting (frontend) | Vercel |
| Hosting (backend) | Render |

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
3. Under **Settings → API**, copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key
   - JWT Secret

### 2. Enable Google Auth in Supabase

1. Supabase dashboard → Authentication → Providers → Google → Enable
2. Add your Google OAuth credentials (from [console.cloud.google.com](https://console.cloud.google.com))
3. Add your site URL to **Redirect URLs**: `https://yoursite.vercel.app`

### 3. Configure environment variables

**Backend** (`.env` in project root):
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
SUPABASE_JWT_SECRET=...
ALLOWED_EMAILS=you@gmail.com,friend@gmail.com
FRONTEND_URL=https://keyjourney.vercel.app
```

**Frontend** (`frontend/.env.local`):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=         # blank for local dev; set to Render URL in production
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

## Deployment

### Frontend → Vercel

1. Push repo to GitHub
2. [vercel.com](https://vercel.com) → New Project → import repo → set **Root Directory** to `frontend`
3. Add environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` → your Render backend URL (e.g. `https://keyjourney-api.onrender.com`)
4. Deploy — you'll get a URL like `keyjourney.vercel.app`

### Backend → Render

1. [render.com](https://render.com) → New Web Service → connect repo
2. **Root directory**: `backend`
3. **Build command**: `pip install -r requirements.txt`
4. **Start command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables: all keys from `.env`
6. Free tier is fine (cold starts after 15 min idle — acceptable for personal use)

---

## Access Control

Set `ALLOWED_EMAILS` in the backend `.env` to a comma-separated list of Google account emails:
```
ALLOWED_EMAILS=you@gmail.com,partner@gmail.com,friend@gmail.com
```
Any other Google account will be blocked with a 403. Leave blank to allow any Google account.

---

## Data Storage

- **Supabase PostgreSQL** — all app data (settings, viewings, upcoming)
- **localStorage** — comparison boards and checklist (browser only)

---

## Project Structure

```
manifest-home/
├── backend/
│   ├── main.py              # FastAPI — all API endpoints
│   └── requirements.txt
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
│   ├── vercel.json          # SPA routing for Vercel
│   ├── package.json
│   └── vite.config.ts       # Proxies /api → localhost:8000 in dev
├── utils/
│   ├── data.py              # All Supabase read/write operations
│   ├── savings.py           # Projection calculations
│   └── supabase_client.py   # Supabase client init
├── supabase/
│   └── schema.sql           # Run once in Supabase SQL editor
├── .env                     # Backend secrets (git-ignored)
└── start.sh                 # One-command local launcher
```
