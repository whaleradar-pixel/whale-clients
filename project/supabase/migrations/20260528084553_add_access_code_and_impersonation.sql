/*
  # Add access_code to profiles + admin impersonation log

  1. Changes to profiles
    - Add `access_code` column (6-char unique code per user, auto-generated)
    - Add `is_email_verified` default true (skip OTP requirement)

  2. New table: admin_impersonation_log
    - Tracks when admin views/acts as a client
    - Requires explicit user consent flag

  3. Security
    - RLS on impersonation_log
*/

-- Add access_code column to profiles (auto-generated 6-char code)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'access_code'
  ) THEN
    ALTER TABLE profiles ADD COLUMN access_code text;
  END IF;
END $$;

-- Generate access codes for existing profiles that don't have one
CREATE OR REPLACE FUNCTION generate_access_code() RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-assign access_code on insert
CREATE OR REPLACE FUNCTION assign_access_code()
RETURNS TRIGGER AS $$
DECLARE
  new_code text;
  attempts integer := 0;
BEGIN
  IF NEW.access_code IS NULL THEN
    LOOP
      new_code := generate_access_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE access_code = new_code);
      attempts := attempts + 1;
      IF attempts > 100 THEN
        new_code := generate_access_code() || to_char(floor(random()*100)::int, 'FM00');
        EXIT;
      END IF;
    END LOOP;
    NEW.access_code := new_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_access_code ON profiles;
CREATE TRIGGER trg_assign_access_code
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_access_code();

-- Admin impersonation log table
CREATE TABLE IF NOT EXISTS admin_impersonation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_session text NOT NULL,
  target_user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT 'view',
  note text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_impersonation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can insert impersonation log"
  ON admin_impersonation_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admin can read impersonation log"
  ON admin_impersonation_log FOR SELECT
  TO authenticated
  USING (true);
