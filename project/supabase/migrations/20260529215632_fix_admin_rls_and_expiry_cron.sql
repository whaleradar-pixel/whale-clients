/*
  # Fix Admin RLS + Subscription Expiry Cron Job

  1. Admin Users RLS
     - Allow authenticated users to check their own admin record (needed for AdminLogin flow)
     - Keep super_admin management as before

  2. Subscription Expiry Cron
     - Schedule daily job to downgrade users whose subscription has expired
     - Updates subscription_plan to 'free' for expired non-free users

  3. Expiry Notification Cron
     - Schedule daily job to call process-alerts edge function for expiry emails
*/

-- Allow authenticated users to select their own admin_users record
-- (needed so AdminLogin can verify admin status after sign-in)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'admin_users' AND policyname = 'Admins can view own record'
  ) THEN
    CREATE POLICY "Admins can view own record"
      ON admin_users FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Schedule daily subscription expiry downgrade at 00:05 UTC
SELECT cron.schedule(
  'downgrade-expired-subscriptions',
  '5 0 * * *',
  $$
    UPDATE profiles
    SET
      subscription_plan = 'free',
      updated_at = now()
    WHERE
      subscription_plan != 'free'
      AND subscription_expires_at IS NOT NULL
      AND subscription_expires_at < now()
      AND deleted_at IS NULL;
  $$
);

-- Schedule daily expiry notification check at 09:00 UTC (11:00 Israel time)
SELECT cron.schedule(
  'notify-expiring-subscriptions',
  '0 9 * * *',
  format(
    $$
      SELECT net.http_post(
        url := '%s/functions/v1/send-expiry-notifications',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer %s"}'::jsonb,
        body := '{}'::jsonb
      );
    $$,
    current_setting('app.settings.supabase_url', true),
    current_setting('app.settings.service_role_key', true)
  )
);
