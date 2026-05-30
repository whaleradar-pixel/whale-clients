/*
  # Whale Radar - Core Schema

  ## Overview
  Full trading platform schema including:
  - Subscription plans (Free, Basic, Pro, VIP)
  - User profiles linked to auth.users
  - Session locking (one active session per user, prevents code sharing)
  - Email verification codes (6-digit OTP)
  - Market groups with access control by subscription tier
  - User watchlists for personalization

  ## Tables
  1. `subscription_plans` - Available plans with features and pricing
  2. `profiles` - Extended user info and active subscription
  3. `user_sessions` - Device/session locking, one active session per user
  4. `verification_codes` - 6-digit OTP codes for email verification
  5. `market_groups` - Stock categories (Tech, Energy, etc.) with required plan
  6. `user_watchlists` - Personalized stock watchlists per user

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Market groups restricted by subscription plan
*/

-- =============================================
-- SUBSCRIPTION PLANS
-- =============================================
CREATE TABLE IF NOT EXISTS subscription_plans (
  id text PRIMARY KEY,
  name_he text NOT NULL,
  description_he text NOT NULL DEFAULT '',
  price_monthly numeric NOT NULL DEFAULT 0,
  price_yearly numeric NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '[]',
  color text NOT NULL DEFAULT 'blue',
  badge_text text,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read subscription plans"
  ON subscription_plans FOR SELECT
  TO authenticated
  USING (true);

-- Seed plans
INSERT INTO subscription_plans (id, name_he, description_he, price_monthly, price_yearly, features, color, badge_text, sort_order)
VALUES
  ('free', 'חינמי', 'גישה בסיסית לשוק', 0, 0,
   '["קבוצת מניות אחת", "5 מניות במעקב", "גרפים בסיסיים", "ניתוח יומי"]',
   'gray', NULL, 1),
  ('basic', 'בסיסי', 'גישה מורחבת לשווקים', 49, 470,
   '["3 קבוצות מניות", "20 מניות במעקב", "גרפים מתקדמים", "התראות מחיר", "ניתוח שבועי"]',
   'blue', NULL, 2),
  ('pro', 'מקצועי', 'כלים מקצועיים לסוחרים', 99, 950,
   '["כל קבוצות המניות", "מניות ללא הגבלה", "ניתוח AI", "סיגנלים בזמן אמת", "גרפים TradingView מלאים", "תמיכה מועדפת"]',
   'emerald', 'הכי פופולרי', 3),
  ('vip', 'VIP', 'חבילה אקסקלוסיבית', 199, 1900,
   '["הכל בחבילת מקצועי", "קבוצות VIP בלעדיות", "ניתוח אישי שבועי", "גישה לפני כולם לסיגנלים", "שיחת ייעוץ חודשית", "קהילה VIP פרטית"]',
   'amber', 'VIP בלעדי', 4)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- USER PROFILES
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  subscription_plan text REFERENCES subscription_plans(id) DEFAULT 'free',
  subscription_started_at timestamptz,
  subscription_expires_at timestamptz,
  is_email_verified boolean DEFAULT false,
  preferred_language text DEFAULT 'he',
  notification_preferences jsonb DEFAULT '{"price_alerts": true, "market_news": true, "signal_alerts": true}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- USER SESSIONS (DEVICE/SESSION LOCKING)
-- =============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text UNIQUE NOT NULL,
  device_fingerprint text DEFAULT '',
  user_agent text DEFAULT '',
  ip_address text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now()
);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
  ON user_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- EMAIL VERIFICATION CODES (OTP)
-- =============================================
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'login',
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  attempts int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification codes"
  ON verification_codes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own verification codes"
  ON verification_codes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own verification codes"
  ON verification_codes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- MARKET GROUPS
-- =============================================
CREATE TABLE IF NOT EXISTS market_groups (
  id text PRIMARY KEY,
  name_he text NOT NULL,
  description_he text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT 'TrendingUp',
  required_plan text REFERENCES subscription_plans(id) DEFAULT 'free',
  symbols text[] NOT NULL DEFAULT '{}',
  color text NOT NULL DEFAULT 'blue',
  gradient_from text NOT NULL DEFAULT 'from-blue-500',
  gradient_to text NOT NULL DEFAULT 'to-blue-700',
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE market_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active market groups"
  ON market_groups FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Seed market groups
INSERT INTO market_groups (id, name_he, description_he, icon, required_plan, symbols, color, gradient_from, gradient_to, sort_order)
VALUES
  ('tech-giants', 'ענקיות הטכנולוגיה', 'FAANG ומניות הטכנולוגיה הגדולות', 'Monitor', 'free',
   ARRAY['AAPL','GOOGL','MSFT','META','AMZN','NVDA'], 'blue', 'from-blue-500', 'to-cyan-600', 1),

  ('energy', 'אנרגיה ונפט', 'חברות אנרגיה ונפט מובילות', 'Zap', 'basic',
   ARRAY['XOM','CVX','COP','SLB','BP','OXY'], 'orange', 'from-orange-500', 'to-amber-600', 2),

  ('financial', 'פיננסים ובנקאות', 'הבנקים וחברות הפיננסים הגדולות', 'DollarSign', 'basic',
   ARRAY['JPM','BAC','GS','MS','V','MA','WFC'], 'emerald', 'from-emerald-500', 'to-teal-600', 3),

  ('healthcare', 'בריאות ופארמה', 'מניות רפואה ותרופות מובילות', 'Heart', 'basic',
   ARRAY['JNJ','PFE','UNH','ABBV','MRK','LLY'], 'rose', 'from-rose-500', 'to-pink-600', 4),

  ('crypto-related', 'קריפטו ובלוקצ''יין', 'מניות הקשורות לעולם הקריפטו', 'Bitcoin', 'pro',
   ARRAY['COIN','MSTR','MARA','RIOT','CLSK'], 'yellow', 'from-yellow-500', 'to-orange-500', 5),

  ('consumer', 'צרכנות ואיכות חיים', 'מותגי צרכנות מובילים בעולם', 'ShoppingBag', 'pro',
   ARRAY['TSLA','NKE','SBUX','MCD','DIS','NFLX'], 'violet', 'from-violet-500', 'to-purple-600', 6),

  ('small-cap', 'מניות צמיחה', 'מניות קטנות עם פוטנציאל גבוה', 'Rocket', 'pro',
   ARRAY['PLTR','SOFI','AFRM','UPST','HOOD'], 'pink', 'from-pink-500', 'to-rose-600', 7),

  ('vip-signals', 'סיגנלים VIP', 'מניות עם אות מסחר חזק - בלעדי VIP', 'Crown', 'vip',
   ARRAY['SPY','QQQ','ARKK','IWM','SOXL'], 'amber', 'from-amber-400', 'to-yellow-500', 8)
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- USER WATCHLISTS
-- =============================================
CREATE TABLE IF NOT EXISTS user_watchlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol text NOT NULL,
  notes text DEFAULT '',
  added_at timestamptz DEFAULT now(),
  UNIQUE(user_id, symbol)
);

ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own watchlist"
  ON user_watchlists FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watchlist"
  ON user_watchlists FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watchlist"
  ON user_watchlists FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_verification_codes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user ON verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_watchlists_user ON user_watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_plan);
