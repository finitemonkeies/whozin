-- Whozin baseline production hardening
-- Run this in Supabase SQL Editor after backing up.

begin;

-- 1) Admin helper based on auth email claim.
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt()->>'email') in ('hello@whozin.app', 'jvincenthallahan@gmail.com'), false);
$$;

-- 2) Enable RLS on app tables.
alter table if exists public.events enable row level security;
alter table if exists public.attendees enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.friendships enable row level security;

-- 3) Events policies.
drop policy if exists "events_read_authenticated" on public.events;
create policy "events_read_authenticated"
on public.events
for select
to authenticated
using (true);

drop policy if exists "events_write_admin_only" on public.events;
create policy "events_write_admin_only"
on public.events
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 4) Attendees policies.
drop policy if exists "attendees_read_authenticated" on public.attendees;
create policy "attendees_read_authenticated"
on public.attendees
for select
to authenticated
using (true);

drop policy if exists "attendees_insert_self_or_admin" on public.attendees;
create policy "attendees_insert_self_or_admin"
on public.attendees
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "attendees_delete_self_or_admin" on public.attendees;
create policy "attendees_delete_self_or_admin"
on public.attendees
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

-- 5) Profiles policies.
drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_self_or_admin" on public.profiles;
create policy "profiles_insert_self_or_admin"
on public.profiles
for insert
to authenticated
with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin"
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- 6) Friendships policies.
drop policy if exists "friendships_read_participants" on public.friendships;
create policy "friendships_read_participants"
on public.friendships
for select
to authenticated
using (user_id = auth.uid() or friend_id = auth.uid() or public.is_admin());

drop policy if exists "friendships_insert_self_or_admin" on public.friendships;
create policy "friendships_insert_self_or_admin"
on public.friendships
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "friendships_delete_participants_or_admin" on public.friendships;
create policy "friendships_delete_participants_or_admin"
on public.friendships
for delete
to authenticated
using (user_id = auth.uid() or friend_id = auth.uid() or public.is_admin());

commit;
