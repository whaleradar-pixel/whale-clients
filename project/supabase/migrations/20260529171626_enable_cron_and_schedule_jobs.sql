/*
  # Enable pg_cron and schedule automated jobs

  1. Enable pg_cron extension
  2. Schedule: generate-whale-activity every 15 minutes
  3. Schedule: process-alerts every 5 minutes

  Uses pg_net (already available) to call edge functions via HTTP.
  All jobs run in the cron schema.
*/

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule whale activity generation every 15 minutes
SELECT cron.schedule(
  'generate-whale-activity',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/generate-whale-activity',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{"activities":5,"signals":1}'::jsonb
  );
  $$
);

-- Schedule alert processing every 5 minutes
SELECT cron.schedule(
  'process-price-alerts',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/process-alerts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
