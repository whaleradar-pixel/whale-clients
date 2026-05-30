/*
  # Whale Radar - Admin Panel & Leads Tables

  ## Summary
  Adds the infrastructure needed for:
  1. Admin client management dashboard
  2. Lead/join-request tracking from the marketing site
  3. Admin role system

  ## New Tables

  ### leads
  Stores join requests submitted from the marketing website.
  - full_name, phone, email, national_id
  - requested_plan (free/basic/pro/vip)
  - status: new | contacted | converted | rejected
  - source: website | whatsapp | referral | other
  - notes: admin notes

  ### admin_users
  Tracks which Supabase auth users have admin access.
  - user_id references auth.users
  - role: super_admin | admin | support

  ## Modified Tables
  - profiles: adds phone, national_id, notes columns for admin use

  ## Security
  - RLS enabled on all new tables
  - leads: only admins can read/write
  - admin_users: only super_admins can manage
  - profiles additions: users can read their own data
*/

-- Add admin columns to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE profiles ADD COLUMN phone text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'national_id') THEN
    ALTER TABLE profiles ADD COLUMN national_id text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'admin_notes') THEN
    ALTER TABLE profiles ADD COLUMN admin_notes text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_blocked') THEN
    ALTER TABLE profiles ADD COLUMN is_blocked boolean DEFAULT false;
  END IF;
END $$;

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'support')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admin list"
  ON admin_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

CREATE POLICY "Super admins can insert admins"
  ON admin_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid() AND au.role = 'super_admin')
  );

CREATE POLICY "Super admins can update admins"
  ON admin_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid() AND au.role = 'super_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid() AND au.role = 'super_admin')
  );

CREATE POLICY "Super admins can delete admins"
  ON admin_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid() AND au.role = 'super_admin')
  );

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text DEFAULT '',
  national_id text DEFAULT '',
  requested_plan text NOT NULL DEFAULT 'basic' CHECK (requested_plan IN ('free', 'basic', 'pro', 'vip')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'rejected')),
  source text NOT NULL DEFAULT 'website' CHECK (source IN ('website', 'whatsapp', 'referral', 'other')),
  notes text DEFAULT '',
  converted_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view leads"
  ON leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

CREATE POLICY "Admins can insert leads"
  ON leads FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

CREATE POLICY "Admins can update leads"
  ON leads FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

CREATE POLICY "Admins can delete leads"
  ON leads FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

-- Allow public insert for leads (from marketing site contact form - no auth)
CREATE POLICY "Anyone can submit a lead"
  ON leads FOR INSERT
  TO anon
  WITH CHECK (true);

-- Admin access to profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = id OR
    EXISTS (SELECT 1 FROM admin_users au WHERE au.user_id = auth.uid())
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);
