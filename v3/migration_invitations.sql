-- ==============================================================================
-- MIGRATION: Team Invitations System
-- Purpose: Allow admins to invite users by email before they register.
--          When the user registers, they are automatically added to the team.
-- ==============================================================================

-- 1. Create Invitations Table
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) NOT NULL,
  role TEXT CHECK (role IN ('admin', 'cashier')) DEFAULT 'cashier',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(email, owner_id)
);

-- 2. Security (RLS)
ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their own sent invitations" ON team_invitations
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Admins can create invitations" ON team_invitations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Admins can delete invitations" ON team_invitations
  FOR DELETE USING (owner_id = auth.uid());

-- 3. Update User Creation Trigger to Process Invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_invite RECORD;
BEGIN
  -- A. Create default Profile
  INSERT INTO public.profiles (id, business_name)
  VALUES (new.id, new.raw_user_meta_data->>'business_name');

  -- B. Check for Pending Invitations
  FOR v_invite IN SELECT * FROM public.team_invitations WHERE email = new.email LOOP
    -- 1. Add to Team Members
    INSERT INTO public.team_members (user_id, owner_id, role, status)
    VALUES (new.id, v_invite.owner_id, v_invite.role, 'active')
    ON CONFLICT (user_id, owner_id) DO NOTHING;
    
    -- 2. Remove the used invitation
    DELETE FROM public.team_invitations WHERE id = v_invite.id;
  END LOOP;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
