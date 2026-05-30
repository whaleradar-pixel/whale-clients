/*
  # Whale Activity Feature

  ## Summary
  Creates tables to store institutional/whale trading activity data
  that admins can input manually or via future API integrations.

  ## New Tables

  ### whale_activities
  - Stores individual large-trade / institutional activity events
  - Fields: symbol, activity_type (buy/sell/options/block), value_usd,
    institution (optional), notes_he (Hebrew description), plan_required,
    is_active, occurred_at

  ### whale_market_signals
  - High-level market-wide signals about institutional money flow
  - Fields: title_he, body_he, signal_type (bullish/bearish/neutral),
    plan_required, is_active, created_at

  ## Security
  - RLS enabled on both tables
  - Authenticated users can SELECT based on their plan (enforced at app level)
  - Only service role can INSERT/UPDATE/DELETE (admin manages via SQL or admin panel)
*/

CREATE TABLE IF NOT EXISTS whale_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL DEFAULT '',
  activity_type text NOT NULL DEFAULT 'buy',
  value_usd bigint NOT NULL DEFAULT 0,
  institution text DEFAULT NULL,
  notes_he text NOT NULL DEFAULT '',
  plan_required text NOT NULL DEFAULT 'basic',
  is_active boolean NOT NULL DEFAULT true,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE whale_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active whale activities"
  ON whale_activities FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE TABLE IF NOT EXISTS whale_market_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_he text NOT NULL DEFAULT '',
  body_he text NOT NULL DEFAULT '',
  signal_type text NOT NULL DEFAULT 'neutral',
  plan_required text NOT NULL DEFAULT 'pro',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE whale_market_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active market signals"
  ON whale_market_signals FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS whale_activities_occurred_at_idx ON whale_activities(occurred_at DESC);
CREATE INDEX IF NOT EXISTS whale_activities_symbol_idx ON whale_activities(symbol);
CREATE INDEX IF NOT EXISTS whale_market_signals_created_at_idx ON whale_market_signals(created_at DESC);

-- Seed with demo whale activity data
INSERT INTO whale_activities (symbol, activity_type, value_usd, institution, notes_he, plan_required, occurred_at) VALUES
  ('AAPL', 'buy', 450000000, 'Berkshire Hathaway', 'רכישה מסיבית של מניות אפל ע"י ברקשייר האת''ווי — אות חיובי חזק', 'basic', now() - interval '2 hours'),
  ('NVDA', 'options', 280000000, 'Citadel', 'רכישת אופציות CALL על NVDA בסכום עצום — ציפייה לעלייה חדה', 'basic', now() - interval '4 hours'),
  ('SPY', 'buy', 920000000, 'Vanguard', 'זרימת כסף מוסדי ל-SPY — הגנה על תיקים לקראת עונת דוחות', 'basic', now() - interval '6 hours'),
  ('TSLA', 'sell', 180000000, NULL, 'מכירת בלוק גדול של TSLA — יתכן גידור סיכונים', 'pro', now() - interval '8 hours'),
  ('AMZN', 'block', 340000000, 'BlackRock', 'עסקת בלוק ענקית — BlackRock מגדילה חשיפה לאמזון', 'pro', now() - interval '12 hours'),
  ('META', 'buy', 210000000, 'Fidelity', 'צבירה שקטה של מטא — מוסדיים מהמרים על צמיחת AI', 'basic', now() - interval '1 day'),
  ('MSFT', 'options', 160000000, 'Goldman Sachs', 'פעילות אופציות חריגה במיקרוסופט לפני הכרזת רווחים', 'pro', now() - interval '1 day 3 hours'),
  ('GOOGL', 'buy', 390000000, 'State Street', 'הגדלת החזקות ב-Alphabet — ביטחון ביכולות ה-AI של גוגל', 'basic', now() - interval '2 days');

-- Seed market signals
INSERT INTO whale_market_signals (title_he, body_he, signal_type, plan_required) VALUES
  ('זרימת כסף מוסדי חיובית', 'בשבוע האחרון נרשמה זרימת כסף חיובית נטו של מעל $3.2 מיליארד לקרנות מניות טכנולוגיה. רמות כניסה של מוסדיים מצביעות על ביטחון לטווח הבינוני.', 'bullish', 'pro'),
  ('פעילות OPTIONS חריגה', 'נרשמה עלייה של 340% בנפח האופציות על מניות ה-AI לעומת הממוצע של 30 יום. מרבית הפעילות — אופציות CALL לחודשים הקרובים.', 'bullish', 'pro'),
  ('זהירות: מכירות בסקטור הבנקאות', 'מוסדיים גדולים מצמצמים חשיפה לסקטור הפיננסים לאחר עליית הריבית. סנטימנט שלילי לטווח הקצר.', 'bearish', 'vip');
