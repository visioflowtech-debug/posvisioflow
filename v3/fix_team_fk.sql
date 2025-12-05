-- Drop existing foreign keys
alter table public.team_members
drop constraint if exists team_members_user_id_fkey,
drop constraint if exists team_members_owner_id_fkey;

-- Add new foreign keys referencing public.profiles
alter table public.team_members
add constraint team_members_user_id_fkey
foreign key (user_id) references public.profiles(id) on delete cascade,
add constraint team_members_owner_id_fkey
foreign key (owner_id) references public.profiles(id) on delete cascade;
