-- ==============================================================================
-- FIX: TEAM MODULE PERMISSIONS & RECURSION
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS BOOLEAN AS c:\pos html\v3
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_super_admin = true
  );
END;
c:\pos html\v3 LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS "Super Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super Admins can update any profile" ON profiles;
DROP POLICY IF EXISTS "Team Members can view profiles" ON profiles;
DROP POLICY IF EXISTS "Team Context Visibility" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Super Admins can view all profiles" ON profiles
  FOR SELECT USING (check_is_super_admin() = true);

CREATE POLICY "Team Context Visibility" ON profiles
  FOR SELECT USING (
    id IN (SELECT user_id FROM team_members WHERE owner_id = auth.uid())
    OR
    id IN (SELECT owner_id FROM team_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "View team members" ON team_members;
DROP POLICY IF EXISTS "Manage team members" ON team_members;

CREATE POLICY "View team members" ON team_members
  FOR SELECT USING (
    owner_id = auth.uid() OR user_id = auth.uid() OR check_is_super_admin() = true
  );

CREATE POLICY "Manage team members" ON team_members
  FOR ALL USING (
    owner_id = auth.uid() OR check_is_super_admin() = true
  );

