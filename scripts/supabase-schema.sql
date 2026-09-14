-- =========================================================================
-- سرچشمه — Supabase Schema
-- =========================================================================
-- Run this in Supabase SQL Editor (Dashboard → SQL → New Query)
-- Creates tables with Row Level Security (RLS) so each user only
-- sees their own data.
-- =========================================================================

-- =========================================================================
-- Tables
-- =========================================================================

-- Transactions
CREATE TABLE IF NOT EXISTS sarcheshmeh_transactions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'income',
  amount BIGINT NOT NULL,
  date TEXT NOT NULL,
  category_id TEXT NOT NULL,
  destination_id TEXT NOT NULL,
  note TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  recurring JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Categories
CREATE TABLE IF NOT EXISTS sarcheshmeh_categories (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Destinations
CREATE TABLE IF NOT EXISTS sarcheshmeh_destinations (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Settings (one row per user)
CREATE TABLE IF NOT EXISTS sarcheshmeh_settings (
  id TEXT PRIMARY KEY DEFAULT 'singleton',
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'system',
  digits TEXT NOT NULL DEFAULT 'fa',
  unit TEXT NOT NULL DEFAULT 'toman',
  sample_data_loaded BOOLEAN NOT NULL DEFAULT FALSE,
  schema_version INTEGER NOT NULL DEFAULT 1,
  locked_years JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================================
-- Indexes
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_stx_user ON sarcheshmeh_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_stx_date ON sarcheshmeh_transactions(date);
CREATE INDEX IF NOT EXISTS idx_stx_updated ON sarcheshmeh_transactions(updated_at);
CREATE INDEX IF NOT EXISTS idx_scat_user ON sarcheshmeh_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_sdst_user ON sarcheshmeh_destinations(user_id);

-- =========================================================================
-- Row Level Security (RLS)
-- Each user can only see/modify their own data
-- =========================================================================

ALTER TABLE sarcheshmeh_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sarcheshmeh_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sarcheshmeh_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sarcheshmeh_settings ENABLE ROW LEVEL SECURITY;

-- Transactions policies
CREATE POLICY "Users can read own transactions"
  ON sarcheshmeh_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON sarcheshmeh_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions"
  ON sarcheshmeh_transactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions"
  ON sarcheshmeh_transactions FOR DELETE
  USING (auth.uid() = user_id);

-- Categories policies
CREATE POLICY "Users can read own categories"
  ON sarcheshmeh_categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
  ON sarcheshmeh_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON sarcheshmeh_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON sarcheshmeh_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Destinations policies
CREATE POLICY "Users can read own destinations"
  ON sarcheshmeh_destinations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own destinations"
  ON sarcheshmeh_destinations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own destinations"
  ON sarcheshmeh_destinations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own destinations"
  ON sarcheshmeh_destinations FOR DELETE
  USING (auth.uid() = user_id);

-- Settings policies
CREATE POLICY "Users can read own settings"
  ON sarcheshmeh_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON sarcheshmeh_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON sarcheshmeh_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================================================
-- Auto-set user_id on insert (trigger function)
-- =========================================================================
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id := auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_user_id_transactions
  BEFORE INSERT ON sarcheshmeh_transactions
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_categories
  BEFORE INSERT ON sarcheshmeh_categories
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_destinations
  BEFORE INSERT ON sarcheshmeh_destinations
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

CREATE TRIGGER set_user_id_settings
  BEFORE INSERT ON sarcheshmeh_settings
  FOR EACH ROW EXECUTE FUNCTION set_user_id();

-- =========================================================================
-- Auto-update updated_at on modify
-- =========================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_updated_at_transactions
  BEFORE UPDATE ON sarcheshmeh_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_updated_at_categories
  BEFORE UPDATE ON sarcheshmeh_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_updated_at_destinations
  BEFORE UPDATE ON sarcheshmeh_destinations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_updated_at_settings
  BEFORE UPDATE ON sarcheshmeh_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
