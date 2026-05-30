/*
  # Add Trading Platform Links

  ## Summary
  Adds a table for users to store their personal quick-launch links to trading platforms.

  ## New Tables
  - `trading_platform_links`
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to auth.users)
    - `platform_name` (text) - e.g. "Interactive Brokers", "Plus500"
    - `url` (text) - the URL to open
    - `icon_key` (text) - identifier for choosing a display icon/color
    - `sort_order` (int) - display order
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled: users can only see and manage their own links
*/

CREATE TABLE IF NOT EXISTS trading_platform_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform_name text NOT NULL DEFAULT '',
  url text NOT NULL DEFAULT '',
  icon_key text NOT NULL DEFAULT 'default',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trading_platform_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own platform links"
  ON trading_platform_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own platform links"
  ON trading_platform_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own platform links"
  ON trading_platform_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own platform links"
  ON trading_platform_links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS trading_platform_links_user_id_idx ON trading_platform_links(user_id);
