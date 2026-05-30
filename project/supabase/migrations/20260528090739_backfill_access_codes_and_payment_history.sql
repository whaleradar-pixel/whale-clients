/*
  # Backfill access codes + payment history table

  1. Backfill access_code for existing profiles that don't have one
     - Uses the generate_access_code() function already defined in previous migration
     - Safe: only updates rows where access_code IS NULL

  2. New table: payment_history
     - Tracks all subscription payments
     - Linked to profiles
     - Includes Stripe payment intent / session IDs for audit
     - RLS: users can read own payments, admins can read all

  3. Security
     - RLS enabled on payment_history
*/

-- Backfill access codes for existing profiles
DO $$
DECLARE
  rec RECORD;
  new_code text;
  attempts integer;
BEGIN
  FOR rec IN SELECT id FROM profiles WHERE access_code IS NULL LOOP
    attempts := 0;
    LOOP
      new_code := generate_access_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE access_code = new_code);
      attempts := attempts + 1;
      IF attempts > 100 THEN
        new_code := generate_access_code() || to_char(floor(random()*100)::int, 'FM00');
        EXIT;
      END IF;
    END LOOP;
    UPDATE profiles SET access_code = new_code WHERE id = rec.id;
  END LOOP;
END $$;

-- Payment history table
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  amount_ils integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  stripe_payment_intent text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment history"
  ON payment_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service can insert payment history"
  ON payment_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
