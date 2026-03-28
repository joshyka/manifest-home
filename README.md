# KeyJourney

A home-buying tracker tool to track savings, log viewings, compare listings, run mortgage calculations, and manage your buying checklist — all in one place.

---

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React + TypeScript + Vite + Tailwind |
| Backend | FastAPI (Python) — serverless via Vercel |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase email/password (PIN login) |
| Hosting | Vercel (frontend + backend) |

---

## Pages

| Page | Purpose |
| --- | --- |
| Dashboard | Savings overview, KPIs, upcoming viewings |
| Savings | Track savings targets and monthly contributions |
| Checklist | Kanban board (To Do / In Progress / Done) with custom categories |
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
3. Under **Authentication → Providers → Email** — ensure email/password is enabled
4. Under **Project Settings → API**, copy your keys into `.env`

### 2. Create the app user

In the Supabase dashboard → **Authentication → Users → Add user**:
- Email: any dummy email (e.g. `home@yourapp.app`)
- Password: your PIN (letters + numbers, min 8 chars)

### 3. Configure environment variables

Fill in `.env`:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...     # service_role key — backend only
ALLOWED_EMAILS=                        # comma-separated emails, or blank to allow all
FRONTEND_URL=https://yourapp.vercel.app

VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...  # anon/publishable key — frontend safe
VITE_APP_EMAIL=home@yourapp.app            # the email you created above
```

---

## Local Development

```bash
./start.sh
```

Then open **http://localhost:5173**

---

## Deployment (Vercel + Supabase)

Both frontend and backend deploy together from the same repo.

1. Push repo to GitHub
2. [vercel.com](https://vercel.com) → New Project → import repo
3. Set **Root Directory** to `frontend`
4. Add all environment variables in Vercel project settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `ALLOWED_EMAILS`
   - `FRONTEND_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_EMAIL`
5. Deploy — frontend and `/api/*` routes are handled automatically

---

## Data Storage

- **Supabase PostgreSQL** — all app data (settings, viewings, upcoming), isolated per user
- **localStorage** — comparison boards and checklist (browser only)
