-- KeyJourney — run this in the Supabase SQL editor to set up or reset the database
-- Each user gets their own isolated data via Row Level Security (RLS)
-- Last updated: March 2026
--
-- Tables:
--   settings          — savings plan, loan promise, buyer names
--   viewings          — viewed apartments with bid tracking (rounds, bids, outcome)
--                       archived viewings are flagged via notes containing "[archived]"
--   upcoming_viewings — scheduled viewing reminders (added from the Overview page)
--   target_areas      — areas of interest grouped by High / Medium / Low priority
--   user_blobs        — generic JSON storage: checklist, comparison boards, calculator snapshots, BRF checks
--
-- Blob keys used by the app:
--   checklist         — kanban tasks array
--   comparison_items  — active comparison board listings
--   saved_comparisons — named saved comparison snapshots
--   calc_snapshots    — calculator result snapshots
--   brf_checks        — BRF financial health checks

-- Drop existing tables and policies cleanly
DROP TABLE IF EXISTS user_blobs CASCADE;
DROP TABLE IF EXISTS target_areas CASCADE;
DROP TABLE IF EXISTS upcoming_viewings CASCADE;
DROP TABLE IF EXISTS viewings CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Settings: one row per user
CREATE TABLE settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  p1_name TEXT DEFAULT '',
  p2_name TEXT DEFAULT '',
  p1_current INTEGER DEFAULT 0,
  p2_current INTEGER DEFAULT 0,
  p1_monthly INTEGER DEFAULT 0,
  p2_monthly INTEGER DEFAULT 0,
  loan_amount INTEGER DEFAULT 0,
  loan_expiry TEXT DEFAULT '',
  loan_bank TEXT DEFAULT '',
  apartment_price INTEGER DEFAULT 0,
  down_pct FLOAT DEFAULT 10.0
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own settings" ON settings
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- Viewings
CREATE TABLE viewings (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT DEFAULT '',
  date TEXT DEFAULT '',
  outcome TEXT DEFAULT 'Viewed — no bid',
  num_bid_rounds INTEGER DEFAULT 0,
  final_price TEXT DEFAULT '',
  my_bid TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  hemnet_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE viewings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own viewings" ON viewings
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- Upcoming viewings
CREATE TABLE upcoming_viewings (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  address TEXT DEFAULT '',
  datetime TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE upcoming_viewings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own upcoming" ON upcoming_viewings
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- Target areas
CREATE TABLE target_areas (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT '',
  priority TEXT DEFAULT 'Medium',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE target_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own target areas" ON target_areas
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- User blobs: generic per-user JSON storage (checklist, comparison, calc snapshots, brf checks)
CREATE TABLE user_blobs (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  data JSONB DEFAULT '[]',
  PRIMARY KEY (user_id, key)
);

ALTER TABLE user_blobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own blobs" ON user_blobs
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
