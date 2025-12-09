-- ==============================================================================
-- PATCH: Fix Tenant Priority
-- Issue: Enployees were seeing their own empty account instead of the Company's data.
-- Fix: Prioritize 'Team Membership' over 'Personal Profile' in get_my_company_id().
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID AS $$
DECLARE
  v_owner_id UUID;
BEGIN
  -- 1. FIRST check if user is a team member (Employee)
  -- If I am working for someone, successful lookup here returns THEM.
  SELECT owner_id INTO v_owner_id 
  FROM team_members 
  WHERE user_id = auth.uid() 
    AND status = 'active'
  LIMIT 1;
  
  IF v_owner_id IS NOT NULL THEN
    RETURN v_owner_id;
  END IF;

  -- 2. If not a team member, check if I am an owner (Profile exists)
  SELECT id INTO v_owner_id 
  FROM profiles 
  WHERE id = auth.uid();
  
  IF v_owner_id IS NOT NULL THEN
    RETURN v_owner_id;
  END IF;

  -- Fallback (should typically not happen if triggers work)
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
