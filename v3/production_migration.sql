-- PRODUCTION MIGRATION SCRIPT
-- Consolidates fixes for:
-- 1. Infinite Recursion in RLS (Profiles)
-- 2. Transactions View Security Definer error
-- 3. Function Security (Search Path Mutable) warning

-- ==============================================================================
-- PART 1: FIX RLS RECURSION
-- ==============================================================================

-- 1. Create a Secure Function to check Admin Status
CREATE OR REPLACE FUNCTION public.check_is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- This runs with owner privileges, bypassing RLS for this specific check
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND is_super_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Drop the buggy policy
DROP POLICY IF EXISTS "Super Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Super Admins can update any profile" ON profiles;

-- 3. Re-create Policy using the Function
CREATE POLICY "Super Admins can view all profiles" ON profiles
  FOR SELECT USING (
    check_is_super_admin() = true
  );

CREATE POLICY "Super Admins can update any profile" ON profiles
  FOR UPDATE USING (
    check_is_super_admin() = true
  );

-- 4. Re-Apply Team Policies (Best practice refresh)
DROP POLICY IF EXISTS "View team members" ON team_members;
DROP POLICY IF EXISTS "Manage team members" ON team_members;

CREATE POLICY "View team members" ON team_members
  FOR SELECT USING (
    owner_id = auth.uid() OR user_id = auth.uid()
  );

CREATE POLICY "Manage team members" ON team_members
  FOR ALL USING (owner_id = auth.uid());


-- ==============================================================================
-- PART 2: FIX TRANSACTIONS VIEW
-- ==============================================================================

-- Robustly drop transactions (whether table or view)
DO $$ 
BEGIN 
    DROP TABLE IF EXISTS public.transactions CASCADE; 
EXCEPTION 
    WHEN wrong_object_type THEN 
        DROP VIEW IF EXISTS public.transactions CASCADE; 
END $$;

CREATE OR REPLACE VIEW public.transactions WITH (security_invoker = on) AS
SELECT
    id::text as id,
    'income' as type,
    total as amount,
    'Venta #' || id as description,
    created_at as date,
    'sale' as reference_type
FROM public.sales
UNION ALL
SELECT
    id::text as id,
    'expense' as type,
    amount,
    description,
    date,
    'expense' as reference_type
FROM public.expenses;


-- ==============================================================================
-- PART 3: FIX SECURITY WARNINGS (Mutable Search Path)
-- ==============================================================================

ALTER FUNCTION public.sync_super_admin_from_profile() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.process_purchase(text, numeric, jsonb) SET search_path = public;
