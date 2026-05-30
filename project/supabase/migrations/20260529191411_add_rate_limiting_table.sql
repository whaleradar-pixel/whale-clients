/*
  # Add Rate Limiting Table

  1. New Tables
    - `rate_limits`
      - `id` (uuid, primary key)
      - `key` (text, unique identifier: ip+function or user_id+function)
      - `function_name` (text)
      - `request_count` (int, number of requests in the window)
      - `window_start` (timestamptz, start of the current rate limit window)
      - `created_at` (timestamptz)

  2. Notes
    - Used by edge functions to enforce per-user/per-IP rate limits
    - window_start resets every minute (or configurable window)
    - RLS: service role only (edge functions use service role key)
*/

CREATE TABLE IF NOT EXISTS rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  function_name text NOT NULL,
  request_count int NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (key, function_name)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions use service role)
-- No authenticated user policies needed — purely server-side

CREATE INDEX IF NOT EXISTS idx_rate_limits_key_fn ON rate_limits(key, function_name);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
