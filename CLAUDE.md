# CLAUDE.md — manifest-home (KeyJourney)

Swedish home-buying app. Track savings, log apartment viewings, calculate mortgages, manage households.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, React Query, React Router 6 |
| Backend | Python / FastAPI, Uvicorn |
| Database / Auth | Supabase (Postgres + Auth) |
| Deployment | Vercel (frontend static + Python serverless) |

## Project Structure

```
api/            # Vercel serverless entry (index.py)
backend/
  main.py       # FastAPI routes (650+ lines)
utils/
  data.py       # All Supabase CRUD operations
  savings.py    # Projection & loan calculations
  supabase_client.py  # Singleton service-role client
frontend/src/
  App.tsx       # Auth state, routing, onboarding
  lib/
    api.ts      # Typed API client (all endpoints + types)
    supabase.ts # Anon client (browser auth)
    useBlob.ts  # Hook for blob storage w/ local cache
  components/   # Shared UI (Layout, Alert, MetricCard, etc.)
  pages/        # One file per page (Overview, Viewings, Calculator, etc.)
supabase/
  schema.sql    # Full DB schema
```

## Key Conventions

### Frontend API calls
All go through `frontend/src/lib/api.ts`. The `request()` helper auto-injects the Supabase JWT, handles 401 (signs out) and 403 (blocks). Add new endpoints here, typed.

### Blob storage
Generic JSON blobs stored in `user_blobs` table, keyed by string (`checklist`, `comparison_items`, `saved_comparisons`, `calc_snapshots`, `brf_checks`). Use the `useBlob<T>(key, fallback)` hook — handles React Query caching + localStorage cache.

`comparison_items` shape: `{ id, name, price, sqm, rooms, avgift, notes, rating }[]` — all fields editable in-place on the card. `image` and `site` fields were removed; do not re-add them.

### Checklist

Tasks shape: `{ id, label, status, category, categoryColor, custom, dueDate?, assignee? }[]` stored in the `checklist` blob. `dueDate` is an optional ISO date string (`YYYY-MM-DD`). `assignee` is an optional `'p1' | 'p2' | 'both'` — reads `p1_name`/`p2_name` from settings for display, falls back to "You"/"Partner" if unset.

Due date badge colours (computed client-side, no backend involvement):

- Overdue → red (`text-red-500 bg-red-50`)
- Today → amber (`text-amber-600 bg-amber-50`)
- ≤3 days → amber (`text-amber-500 bg-amber-50`)
- Future → muted gray

Edit mode uses a wrapper `<div onBlur>` that checks `relatedTarget` so clicking the date input doesn't close the edit — do not move `onBlur` back onto the label input.

`saved_comparisons` shape: `{ id, name, date, items: CompItem[] }[]`

### Auth flow
- Frontend: Supabase Auth (anon key, browser) → JWT passed as `Authorization: Bearer` on every API call
- Backend: `require_auth()` validates JWT, resolves household partnerships (partner → owner's data transparently)
- Optional email allowlist via `ALLOWED_EMAILS` env var

### Household sharing
Partners access the owner's data. Backend resolves this in `require_auth()` — no special handling needed in route logic.

The Settings UI has three household states for a user with `role: 'none'`:

- Initial (`hhMode === 'none'`): shows "Share House" and "Join House" buttons
- Clicking "Share House" immediately calls `handleCreateHousehold()` — no intermediate confirmation screen
- Clicking "Join House" sets `hhMode === 'join'` and shows a code input

Once a household is created (owner with invite code), a "Cancel" button deletes the household and returns to `hhMode === 'none'`. There is no `hhMode === 'share'` state.

### Household name
Owners can set the household name at any time — including before a partner has joined. The name is edited inline in the "Household" section heading (`Settings.tsx`); clicking it activates an inline input. Saved on Enter or blur, cancelled on Esc. The backend (`PUT /api/household/name`) has no partner-presence restriction. Partners see the name in the teal badge in their household view.

### Comparison page

- Best value badge is computed as the item with the lowest `price / sqm` across all items — independent of the current sort order. Only shown when ≥2 items have both values set.
- Loading a saved snapshot when active items exist shows a "Replace active?" confirmation — do not skip it.
- Sort option labelled "Monthly" sorts by full estimated monthly cost (mortgage + avgift + 3 000 kr drift), not avgift alone.

### Viewings archive

Archived viewings are flagged by prepending `[archived]` to the notes field — not a separate column.

### Calculations (backend)
All projection and loan logic lives in `utils/savings.py`. Uses pandas for 12-month savings projection.

## Database Tables

| Table | Purpose |
|-------|---------|
| `settings` | User's savings plan (prices, contributions, loan info) |
| `viewings` | Apartment viewings log |
| `upcoming_viewings` | Scheduled viewing reminders |
| `target_areas` | Areas of interest with priority |
| `user_blobs` | Generic JSON blobs (checklist, comparison, etc.) |
| `households` | Owner/partner relationships + invite codes |

## Environment Variables

See `.env.example`. Backend: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_URL`, `ALLOWED_EMAILS`, `CRON_SECRET`. Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

## UI Conventions

Tailwind: teal primary, gold accent, `shadow-card`/`shadow-card-hover`, `rounded-3xl`. Locale: `sv-SE`. Icons: lucide-react only. Animations: `count-up`, `fade-in`, `slide-up`. Blobs are plain JSON.
