-- ==============================================================================
-- MIGRATION: Super Admin System
-- Purpose: Add ability to ban/suspend companies and designate a Super Admin.
-- ==============================================================================

-- 1. Add Columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'suspended')) DEFAULT 'active';

-- 2. RLS Policies for Super Admin
-- Allow Super Admin to View ALL profiles
CREATE POLICY "Super Admins can view all profiles" ON profiles
  FOR SELECT USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- Allow Super Admin to Update ALL profiles (to change status)
CREATE POLICY "Super Admins can update any profile" ON profiles
  FOR UPDATE USING (
    (SELECT is_super_admin FROM profiles WHERE id = auth.uid()) = true
  );

-- 3. Safety: Enforce Suspension
-- This is tricky with RLS completely blocking access without breaking queries.
-- For now, we relies on the App's 'useCompanyProfile' hook checking the status.
-- But strictly speaking, we could add a check:
-- CREATE POLICY "Suspended users cannot access" ...
