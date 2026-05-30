/*
  # Price Alerts & AI Analysis Cache

  1. New Tables
    - `price_alerts`
      - `id` (uuid, PK)
      - `user_id` (uuid, FK to auth.users)
      - `symbol` (text) — ticker symbol
      - `target_price` (numeric) — alert trigger price
      - `condition` (text) — 'above' or 'below'
      - `is_active` (boolean) — whether alert is still live
      - `triggered_at` (timestamptz) — when it fired, null if not yet
      - `created_at` (timestamptz)
    - `ai_analysis_cache`
      - `id` (uuid, PK)
      - `symbol` (text) — ticker symbol
      - `price` (numeric) — price at time of analysis
      - `change_percent` (numeric)
      - `analysis_he` (text) — Hebrew AI analysis text
      - `signal` (text) — 'bullish' | 'bearish' | 'neutral'
      - `momentum` (text)
      - `volume_note` (text)
      - `trend` (text)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - price_alerts: users can only manage their own alerts
    - ai_analysis_cache: readable by authenticated users, writable only by service role

  3. Indexes
    - price_alerts: user_id, symbol, is_active
    - ai_analysis_cache: symbol + created_at (for freshness check)
*/

-- Price Alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL DEFAULT '',
  target_price numeric NOT NULL DEFAULT 0,
  condition text NOT NULL DEFAULT 'above' CHECK (condition IN ('above', 'below')),
  is_active boolean NOT NULL DEFAULT true,
  triggered_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS price_alerts_user_id_idx ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS price_alerts_symbol_active_idx ON price_alerts(symbol, is_active);

ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON price_alerts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own alerts"
  ON price_alerts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON price_alerts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON price_alerts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- AI Analysis Cache table
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  change_percent numeric NOT NULL DEFAULT 0,
  analysis_he text NOT NULL DEFAULT '',
  signal text NOT NULL DEFAULT 'neutral' CHECK (signal IN ('bullish', 'bearish', 'neutral')),
  momentum text NOT NULL DEFAULT '',
  volume_note text NOT NULL DEFAULT '',
  trend text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_analysis_cache_symbol_idx ON ai_analysis_cache(symbol, created_at DESC);

ALTER TABLE ai_analysis_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read AI cache"
  ON ai_analysis_cache FOR SELECT
  TO authenticated
  USING (true);
