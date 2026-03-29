# KeyJourney

Your personal home-buying command centre — track savings progress, log viewings, compare listings, calculate mortgage costs, and stay on top of every step in your journey.

---

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React + TypeScript + Vite + Tailwind |
| Backend | FastAPI (Python) — serverless via Vercel |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase — PIN login or Google OAuth |
| Hosting | Vercel (frontend + backend) |

---

## Pages

| Page | Purpose |
| --- | --- |
| Overview | KPIs, savings progress, loan status, upcoming viewings |
| Savings | Monthly contributions and projection chart |
| Checklist | Kanban board with custom categories |
| Viewings | Log viewed apartments and upcoming reminders |
| Bid Tracker | Bidding history — rounds, highest bid, your bid |
| Comparison | Compare up to 4 listings side by side |
| Calculator | Swedish mortgage calculator with stress test |
| Areas | Target areas grouped by priority |
| Maps | Directions and nearby amenities |

## Features

- Onboarding wizard on first login — collects buyer names, savings, and target
- Welcome greeting shown on every page after setup
- Per-user data isolation via Supabase RLS — each user sees only their own data
- PIN login or Google OAuth with email allowlist
- All data stored in Supabase — synced across devices, nothing in localStorage
- Export / import full backup as Excel (settings, viewings, checklist, comparisons, snapshots, target areas)
- Drag-and-drop kanban checklist with cross-column support
- Swedish mortgage rules applied: 10% minimum down payment, amortisation tiers, stress test at 7%
- Delete confirmations on all destructive actions

---

## Local Development

```bash
./start.sh
```

Then open [http://localhost:5173](http://localhost:5173)

---

## One-time Setup

### Supabase

1. Go to [supabase.com](https://supabase.com) → New project (free tier)
2. In the SQL editor, paste and run **`supabase/schema.sql`**
3. Under **Authentication → Providers → Email** — ensure email/password is enabled
4. Under **Authentication → Users → Add user** → enter a dummy email (e.g. `home@yourapp.app`) and your PIN as password
5. Under **Project Settings → API**, copy your keys into `.env`

### Google Auth

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → Google Auth Platform → Get started → fill in app name → External audience
2. Clients → Create Client → Web application → add Supabase callback URL as Authorised redirect URI:
   `https://xxxx.supabase.co/auth/v1/callback`
3. Copy **Client ID** and **Client Secret** → Supabase → Authentication → Providers → Google → enable → paste → save

> **Note:** The Google sign-in screen will show `xxxx.supabase.co` as the redirect domain — this is normal and safe. Custom branding requires a custom domain and can be skipped for a private app.

---

## Deployment

### Vercel

1. Push repo to GitHub
2. [vercel.com](https://vercel.com) → New Project → import repo
3. Set **Root Directory** to `frontend`
4. Add all environment variables in Vercel project settings:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `FRONTEND_URL`
   - `ALLOWED_EMAILS`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_APP_EMAIL`
5. Deploy — frontend and `/api/*` routes are handled automatically

### Environment Variables

Fill in `.env`:

```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=sb_secret_...     # service_role key — backend only
FRONTEND_URL=https://yourapp.vercel.app
ALLOWED_EMAILS=you@gmail.com,friend@gmail.com,home@yourapp.app  # include PIN account email too; leave blank to allow all

VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_...  # anon/publishable key — frontend safe
VITE_APP_EMAIL=home@yourapp.app            # dummy email for PIN login
```

---

## License

Licensed under the [Apache License 2.0](LICENSE).

---

## Data Storage

All data is stored in **Supabase PostgreSQL**, isolated per user via Row Level Security:

| Table | Data |
| --- | --- |
| `settings` | Savings targets, loan details, buyer names |
| `viewings` | Viewed apartments and bid history |
| `upcoming_viewings` | Scheduled viewings |
| `target_areas` | Areas of interest with priority |
| `user_blobs` | Checklist, comparison boards, calculator snapshots |
