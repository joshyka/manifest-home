# KeyJourney

Your personal home-buying command centre — track savings progress, log viewings, compare listings, calculate mortgage costs, check BRF financial health, and stay on top of every step in your journey.

---

## Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI (Python) — serverless via Vercel |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase — PIN login or Google OAuth |
| Hosting | Vercel (frontend + API) |

---

## Pages

| Page | Purpose |
| --- | --- |
| Overview | KPIs, savings progress, loan status, upcoming viewings |
| Savings | Monthly contributions, loan promise status, savings target tracker |
| Checklist | Drag-to-reorder kanban board with custom categories |
| Viewings | Log viewings with asking price, track bid auctions, edit address/date/URL inline, tap row to expand bid escalation chart |
| Comparison | Compare up to 4 listings side by side with adjustable interest rate |
| Calculator | Swedish mortgage calculator with stress test and net household cash flow |
| BRF Checker | Evaluate a BRF's financial health — debt/sqm, fee/sqm, land ownership |
| Maps | Side-by-side map and target areas — explore neighbourhoods, filter nearby amenities, manage priority areas |
| Settings | Export/import data as Excel, household sharing, delete all data |

---

## Technical Highlights

- Per-user data isolation via Supabase RLS — nothing in localStorage
- GDPR consent on first use, email allowlist, PIN or Google OAuth
- Live Riksbank mortgage bond rate (SE MB 5Y) auto-fills Calculator and Comparison
- Swedish mortgage rules: amortisation tiers, 7% stress test, ränteavdrag
- Self-hosted fonts — no external tracking
- Household sharing — owner generates a single-use invite code (48h expiry), partner joins via their own Google login and transparently accesses shared data

---

## Project Structure

```text
manifest-home/
├── api/              # Vercel serverless entry point (index.py)
├── backend/          # FastAPI app (main.py, routes, models)
├── frontend/         # React + Vite app
│   └── src/
│       ├── pages/    # One file per page
│       ├── components/
│       └── lib/      # API client, Supabase client
├── supabase/         # schema.sql
├── utils/            # Shared Python utilities
├── requirements.txt  # Python dependencies
├── vercel.json       # Vercel build + rewrite config
└── start.sh          # Local dev startup script
```

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
2. In the SQL editor, paste and run `supabase/schema.sql`
3. Under **Authentication → Providers → Email** — ensure email/password is enabled
4. Under **Authentication → Users → Add user** → enter a dummy email (e.g. `home@yourapp.app`) and your PIN as password
5. Under **Project Settings → API**, copy your keys into `.env`

### Google Auth (optional)

1. Go to [console.cloud.google.com](https://console.cloud.google.com) → Google Auth Platform → Get started → External audience
2. Clients → Create Client → Web application → add Supabase callback URL as Authorised redirect URI:
   `https://xxxx.supabase.co/auth/v1/callback`
3. Copy **Client ID** and **Client Secret** → Supabase → Authentication → Providers → Google → enable → paste → save

> The Google sign-in screen will show `xxxx.supabase.co` as the redirect domain — this is normal for a private app.

---

## Deployment (Vercel)

1. Push repo to GitHub
2. [vercel.com](https://vercel.com) → New Project → import repo
3. Leave **Root Directory** blank (repo root) — `vercel.json` handles the rest
4. Add environment variables in Vercel project settings (see below)
5. Deploy — frontend and `/api/*` routes are handled automatically

### Environment Variables

Create an .env file with the keys and add t it to **Vercel → Settings → Environment Variables**.

> **TODO:** Add `CRON_SECRET=<random-string>` to Vercel environment variables — this authenticates the daily cleanup cron job (`/api/cleanup`). Generate any long random string and set it in Vercel before deploying.

---

## Data Storage

All data is stored in **Supabase PostgreSQL**, isolated per user via Row Level Security:

| Table | Data |
| --- | --- |
| `settings` | Savings targets, loan details, buyer names |
| `viewings` | Viewed apartments, asking price, bid rounds, highest bid, my bid, listing URL |
| `upcoming_viewings` | Scheduled viewings |
| `target_areas` | Areas of interest with priority |
| `user_blobs` | Checklist, comparison boards, calculator snapshots, BRF checks |
| `households` | Household membership — owner, partner, invite code, expiry |

---

## License

Licensed under the [Apache License 2.0](LICENSE).
