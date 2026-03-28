-- KeyJourney — run this in the Supabase SQL editor
-- Each user gets their own isolated data via Row Level Security

-- Drop existing tables and policies cleanly
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
  area TEXT DEFAULT '',
  listed_price TEXT DEFAULT '',
  size_sqm TEXT DEFAULT '',
  avgift TEXT DEFAULT '',
  outcome TEXT DEFAULT 'Viewed — no bid',
  num_bid_rounds INTEGER DEFAULT 0,
  final_price TEXT DEFAULT '',
  my_bid TEXT DEFAULT '',
  rating TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  hemnet_url TEXT DEFAULT '',
  booli_url TEXT DEFAULT '',
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
  area TEXT DEFAULT '',
  asking_price TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE upcoming_viewings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own upcoming" ON upcoming_viewings
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
