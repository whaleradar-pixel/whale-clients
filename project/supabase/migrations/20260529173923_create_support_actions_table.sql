/*
  # Support Actions Audit Log

  Records every admin action taken on behalf of a client from the Support Center.

  1. New Table
    - `support_actions`
      - `id` (uuid, pk)
      - `admin_note` (text) — free text describing what was done and why
      - `target_user_id` (uuid) — which client was affected
      - `target_email` (text) — denormalized for quick lookup
      - `action_type` (text) — enum-like: reset_session | unblock | extend_subscription |
          resend_otp | resend_welcome | change_plan | add_note
      - `action_data` (jsonb) — arbitrary data relevant to the action (e.g. new expiry date)
      - `created_at`

  2. Security
    - RLS enabled
    - Only service_role can insert / update
    - No client-facing reads
*/

CREATE TABLE IF NOT EXISTS support_actions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_email     text NOT NULL DEFAULT '',
  action_type      text NOT NULL,
  action_data      jsonb DEFAULT '{}',
  admin_note       text DEFAULT '',
  created_at       timestamptz DEFAULT now()
);

ALTER TABLE support_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert support actions"
  ON support_actions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can select support actions"
  ON support_actions FOR SELECT
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS support_actions_target_user_idx ON support_actions(target_user_id);
CREATE INDEX IF NOT EXISTS support_actions_created_at_idx  ON support_actions(created_at DESC);