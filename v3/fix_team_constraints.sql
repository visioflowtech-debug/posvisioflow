-- Add unique constraint to prevent duplicate team members
-- A user can only be in a specific owner's team once
alter table public.team_members
add constraint team_members_owner_user_unique unique (owner_id, user_id);
