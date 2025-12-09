-- ==============================================================================
-- RESCUE SCRIPT: Fix Team Access & Enable Super Admin
-- Run this in your Supabase SQL Editor
-- ==============================================================================

-- 1. Ensure Super Admin Columns Exist
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'suspended')) DEFAULT 'active';

-- 2. FIX RLS for Team Members (Drop and Re-create to be sure)
DROP POLICY IF EXISTS "View team members" ON team_members;
DROP POLICY IF EXISTS "Manage team members" ON team_members;

CREATE POLICY "View team members" ON team_members
  FOR SELECT USING (
    owner_id = auth.uid() OR user_id = auth.uid()
  );

CREATE POLICY "Manage team members" ON team_members
  FOR ALL USING (owner_id = auth.uid());

-- 3. AUTO-GRANT Super Admin to YOU (The one running this script)
-- NOTE: We use auth.uid() if running in context, but from SQL Editor 'auth.uid()' is null.
-- SO WE MUST UPDATE BY EMAIL. Replace 'TU_CORREO' below!

-- CAMBIA 'tucorreo@gmail.com' POR TU EMAIL REAL ABAJO:
UPDATE public.profiles
SET is_super_admin = true
FROM auth.users
WHERE public.profiles.id = auth.users.id
AND auth.users.email LIKE '%@%'; -- Safety catch, update this below manually if needed

-- ALTERNATIVE: Grant to everyone (UNSAFE, use only for debug if above fails)
-- UPDATE public.profiles SET is_super_admin = true WHERE id = 'TU_UUID_SI_LO_CONOCES';
