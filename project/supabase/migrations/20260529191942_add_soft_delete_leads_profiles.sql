/*
  # Add Soft Delete for Leads and Clients (Profiles)

  1. Changes
    - `leads` table: add `deleted_at` (timestamptz, nullable) column
    - `profiles` table: add `deleted_at` (timestamptz, nullable) column

  2. Notes
    - NULL means not deleted (active record)
    - Non-NULL means soft-deleted at that timestamp
    - Existing RLS policies already check ownership — soft-deleted rows remain
      visible to admins (service role) but should be filtered in app queries
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE leads ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN deleted_at timestamptz DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_deleted_at ON leads(deleted_at);
CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON profiles(deleted_at);
