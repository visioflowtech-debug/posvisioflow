-- FIX PRODUCTION DATA (Missing Profiles)
-- This script backfills profiles for any existing user that is missing one.

-- 1. Insert missing profiles from auth.users
INSERT INTO public.profiles (id, email, full_name, business_name, status)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email), -- Fallback to email if name missing
    'Mi Negocio', -- Default business name
    'active'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 2. Ensure at least one Super Admin exists (Safety Net)
-- If check_is_super_admin() is strict, we might need to manually set it for the first user if none exist.
-- Ideally, you manually update the specific user you want to be admin:
-- UPDATE public.profiles SET is_super_admin = true WHERE email = 'your_email@example.com';
