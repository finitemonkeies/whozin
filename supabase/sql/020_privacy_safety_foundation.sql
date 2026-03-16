begin;

alter table public.profiles
  add column if not exists attendance_visibility text,
  add column if not exists confirm_before_notify boolean,
  add column if not exists sms_notifications_enabled boolean;

update public.profiles
set
  attendance_visibility = coalesce(attendance_visibility, 'friends'),
  confirm_before_notify = coalesce(confirm_before_notify, true),
  sms_notifications_enabled = coalesce(sms_notifications_enabled, false)
where
  attendance_visibility is null
  or confirm_before_notify is null
  or sms_notifications_enabled is null;

alter table public.profiles
  alter column attendance_visibility set default 'friends',
  alter column confirm_before_notify set default true,
  alter column sms_notifications_enabled set default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_attendance_visibility_check'
  ) then
    alter table public.profiles
      add constraint profiles_attendance_visibility_check
      check (attendance_visibility in ('friends', 'public', 'private'));
  end if;
end $$;

create table if not exists public.user_blocks (
  blocker_user_id uuid not null references public.profiles(id) on delete cascade,
  blocked_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (blocker_user_id, blocked_user_id),
  constraint user_blocks_no_self_block check (blocker_user_id <> blocked_user_id)
);

create index if not exists user_blocks_blocked_user_id_idx
  on public.user_blocks (blocked_user_id, created_at desc);

alter table public.user_blocks enable row level security;

drop policy if exists "user_blocks_read_participants" on public.user_blocks;
create policy "user_blocks_read_participants"
on public.user_blocks
for select
to authenticated
using (
  blocker_user_id = auth.uid()
  or blocked_user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "user_blocks_insert_self_or_admin" on public.user_blocks;
create policy "user_blocks_insert_self_or_admin"
on public.user_blocks
for insert
to authenticated
with check (
  blocker_user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "user_blocks_delete_self_or_admin" on public.user_blocks;
create policy "user_blocks_delete_self_or_admin"
on public.user_blocks
for delete
to authenticated
using (
  blocker_user_id = auth.uid()
  or public.is_admin()
);

create table if not exists public.safety_reports (
  id bigint generated always as identity primary key,
  reporter_user_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null,
  target_user_id uuid references public.profiles(id) on delete cascade,
  target_event_id uuid references public.events(id) on delete cascade,
  reason text not null,
  details text,
  status text not null default 'open',
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  constraint safety_reports_target_type_check check (target_type in ('user', 'event')),
  constraint safety_reports_status_check check (status in ('open', 'reviewed', 'resolved', 'dismissed')),
  constraint safety_reports_target_presence_check check (
    (target_type = 'user' and target_user_id is not null and target_event_id is null)
    or
    (target_type = 'event' and target_event_id is not null and target_user_id is null)
  )
);

create index if not exists safety_reports_status_created_at_idx
  on public.safety_reports (status, created_at desc);

create index if not exists safety_reports_target_user_id_idx
  on public.safety_reports (target_user_id, created_at desc);

create index if not exists safety_reports_target_event_id_idx
  on public.safety_reports (target_event_id, created_at desc);

alter table public.safety_reports enable row level security;

drop policy if exists "safety_reports_read_own_or_admin" on public.safety_reports;
create policy "safety_reports_read_own_or_admin"
on public.safety_reports
for select
to authenticated
using (
  reporter_user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "safety_reports_insert_own_or_admin" on public.safety_reports;
create policy "safety_reports_insert_own_or_admin"
on public.safety_reports
for insert
to authenticated
with check (
  reporter_user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "safety_reports_update_admin_only" on public.safety_reports;
create policy "safety_reports_update_admin_only"
on public.safety_reports
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.users_are_friends(a uuid, b uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.user_id = a and f.friend_id = b)
        or
        (f.user_id = b and f.friend_id = a)
      )
  );
$$;

create or replace function public.users_are_blocked(a uuid, b uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.user_blocks ub
    where
      (ub.blocker_user_id = a and ub.blocked_user_id = b)
      or
      (ub.blocker_user_id = b and ub.blocked_user_id = a)
  );
$$;

create or replace function public.get_blocked_user_ids()
returns table(user_id uuid)
language sql
stable
security definer
set search_path = public
as $$
  select blocked_user_id as user_id
  from public.user_blocks
  where blocker_user_id = auth.uid()

  union

  select blocker_user_id as user_id
  from public.user_blocks
  where blocked_user_id = auth.uid();
$$;

revoke all on function public.get_blocked_user_ids() from public;
grant execute on function public.get_blocked_user_ids() to authenticated;

drop policy if exists "attendees_read_authenticated" on public.attendees;
drop policy if exists "attendees_read_visible" on public.attendees;
create policy "attendees_read_visible"
on public.attendees
for select
to authenticated
using (
  public.is_admin()
  or user_id = auth.uid()
  or (
    not public.users_are_blocked(auth.uid(), user_id)
    and (
      coalesce(
        (select p.attendance_visibility from public.profiles p where p.id = user_id),
        'friends'
      ) = 'public'
      or (
        coalesce(
          (select p.attendance_visibility from public.profiles p where p.id = user_id),
          'friends'
        ) = 'friends'
        and public.users_are_friends(auth.uid(), user_id)
      )
    )
  )
);

commit;
