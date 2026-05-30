/*
  # Update cron jobs with hardcoded Supabase URL

  Replaces the current_setting() placeholders with the real project URL and
  service-role key so pg_cron can actually reach the edge functions.
  Uses pg_net for async HTTP calls.
*/

-- Remove old jobs
SELECT cron.unschedule('generate-whale-activity');
SELECT cron.unschedule('process-price-alerts');

-- Whale activity: generate 5 activities + 1 signal every 15 minutes
SELECT cron.schedule(
  'generate-whale-activity',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://ayplszyqyzenjmloimst.supabase.co/functions/v1/generate-whale-activity',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cGxzenlxeXplbmptbG9pbXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NDY2MDAsImV4cCI6MjA5NTUyMjYwMH0.OQEXe9I0hgxIfHvZwM9iqwfzmXIlnU7lD1arWKSYh0s"}'::jsonb,
    body    := '{"activities":5,"signals":1}'::jsonb
  );
  $$
);

-- Price alerts: check and fire every 5 minutes
SELECT cron.schedule(
  'process-price-alerts',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://ayplszyqyzenjmloimst.supabase.co/functions/v1/process-alerts',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5cGxzenlxeXplbmptbG9pbXN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NDY2MDAsImV4cCI6MjA5NTUyMjYwMH0.OQEXe9I0hgxIfHvZwM9iqwfzmXIlnU7lD1arWKSYh0s"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
