/*
  # Fix RLS Security Policies

  ## Problem
  Several tables had overly permissive policies using `USING (true)` or `WITH CHECK (true)`
  that allowed any anonymous user to read, insert, update or delete sensitive data.

  ## Changes
  1. `admin_impersonation_log` - Remove anon INSERT/SELECT policies, keep only service-role access
  2. `leads` - Remove anon full-access policies, keep only: public INSERT (for lead forms) + admin access
  3. `profiles` - Remove anon read-all and anon update-all policies

  ## Security improvements
  - Admin impersonation log: only accessible via service role (edge functions)
  - Leads: public can submit a lead, only admins can read/update/delete
  - Profiles: users see own data, admins see all - no anonymous access
*/

-- ─── admin_impersonation_log ───────────────────────────────────────────────

-- Remove the overly permissive anon policies
DROP POLICY IF EXISTS "Admin anon can log impersonation" ON admin_impersonation_log;
DROP POLICY IF EXISTS "Admin can insert impersonation log" ON admin_impersonation_log;
DROP POLICY IF EXISTS "Admin can read impersonation log" ON admin_impersonation_log;

-- Only service role (via Edge Functions) can access this table
-- No new policies needed - service_role bypasses RLS by default

-- ─── leads ────────────────────────────────────────────────────────────────

-- Remove the overly permissive anon policies
DROP POLICY IF EXISTS "Admin anon can delete leads" ON leads;
DROP POLICY IF EXISTS "Admin anon can insert leads" ON leads;
DROP POLICY IF EXISTS "Admin anon can read all leads" ON leads;
DROP POLICY IF EXISTS "Admin anon can update leads" ON leads;

-- Keep: "Anyone can submit a lead" (public INSERT for landing page form) - already exists
-- Keep: Admins can view/insert/update/delete leads - already exist

-- ─── profiles ─────────────────────────────────────────────────────────────

-- Remove overly permissive anon policies
DROP POLICY IF EXISTS "Admin anon can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin anon can update profiles" ON profiles;

-- The proper policies already exist:
-- "Admins can view all profiles" - checks admin_users membership
-- "Admins can update all profiles" - checks admin_users membership
-- "Users can view own profile" - checks auth.uid() = id
-- "Users can update own profile" - checks auth.uid() = id
-- "Users can insert own profile" - checks auth.uid() = id
