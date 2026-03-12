begin;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid null references auth.users(id) on delete set null,
  event_id uuid null references public.events(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  cta_path text null,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  dedupe_key text null
);

create unique index if not exists notifications_dedupe_key_idx
  on public.notifications (dedupe_key);

create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

create index if not exists notifications_user_id_read_at_idx
  on public.notifications (user_id, read_at, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own"
on public.notifications
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
on public.notifications
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "notifications_no_client_insert" on public.notifications;
create policy "notifications_no_client_insert"
on public.notifications
for insert
to authenticated
with check (false);

drop policy if exists "notifications_no_client_delete" on public.notifications;
create policy "notifications_no_client_delete"
on public.notifications
for delete
to authenticated
using (false);

create or replace function public.create_notification_if_absent(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_cta_path text default null,
  p_actor_user_id uuid default null,
  p_event_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_dedupe_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null or coalesce(trim(p_type), '') = '' then
    return;
  end if;

  insert into public.notifications (
    user_id,
    actor_user_id,
    event_id,
    type,
    title,
    body,
    cta_path,
    metadata,
    dedupe_key
  )
  values (
    p_user_id,
    p_actor_user_id,
    p_event_id,
    p_type,
    p_title,
    p_body,
    p_cta_path,
    coalesce(p_metadata, '{}'::jsonb),
    p_dedupe_key
  )
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.tg_create_rsvp_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_location text;
  v_actor_name text;
  v_friend_id uuid;
begin
  select e.title, e.location
    into v_title, v_location
  from public.events e
  where e.id = new.event_id;

  select coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'A friend')
    into v_actor_name
  from public.profiles p
  where p.id = new.user_id;

  perform public.create_notification_if_absent(
    new.user_id,
    'post_rsvp_invite_nudge',
    'Invite a few friends and make it the move',
    case
      when coalesce(v_title, '') <> '' then concat('You''re in for ', v_title, '. Send one invite while the energy is fresh.')
      else 'You''re in. Send one invite while the energy is fresh.'
    end,
    case
      when new.event_id is not null then concat('/event/', new.event_id, '?src=notification')
      else '/profile'
    end,
    new.user_id,
    new.event_id,
    jsonb_build_object('rsvp_source', new.rsvp_source),
    concat('post_rsvp_invite_nudge:', new.user_id, ':', new.event_id, ':', to_char(now(), 'YYYYMMDD'))
  );

  for v_friend_id in
    select f.user_id
    from public.friendships f
    where f.friend_id = new.user_id
      and f.user_id <> new.user_id
      and coalesce(f.status, 'accepted') = 'accepted'
  loop
    perform public.create_notification_if_absent(
      v_friend_id,
      'friend_joined_event',
      concat(v_actor_name, ' is going out'),
      case
        when coalesce(v_title, '') <> '' and coalesce(v_location, '') <> '' then concat(v_actor_name, ' is going to ', v_title, ' at ', v_location, '.')
        when coalesce(v_title, '') <> '' then concat(v_actor_name, ' is going to ', v_title, '.')
        else concat(v_actor_name, ' just RSVPed to an event.')
      end,
      case
        when new.event_id is not null then concat('/event/', new.event_id, '?src=notification')
        else '/activity'
      end,
      new.user_id,
      new.event_id,
      jsonb_build_object('rsvp_source', new.rsvp_source),
      concat('friend_joined_event:', v_friend_id, ':', new.user_id, ':', new.event_id, ':', to_char(now(), 'YYYYMMDD'))
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists attendees_create_notifications on public.attendees;
create trigger attendees_create_notifications
after insert on public.attendees
for each row
execute function public.tg_create_rsvp_notifications();

create or replace function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = auth.uid()
    and read_at is null;
$$;

revoke all on function public.create_notification_if_absent(uuid, text, text, text, text, uuid, uuid, jsonb, text) from public;
grant execute on function public.create_notification_if_absent(uuid, text, text, text, text, uuid, uuid, jsonb, text) to authenticated;

revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_all_notifications_read() to authenticated;

with momentum_candidates as (
  select
    a.user_id,
    a.event_id,
    e.move_status,
    e.title,
    e.move_secondary,
    e.move_explainer
  from public.attendees a
  join public.events e on e.id = a.event_id
  where e.move_status in ('the_move', 'building_fast')
)
insert into public.notifications (
  user_id,
  event_id,
  type,
  title,
  body,
  cta_path,
  metadata,
  dedupe_key
)
select
  mc.user_id,
  mc.event_id,
  'event_momentum',
  case
    when mc.move_status = 'the_move' then 'Your event is becoming the move'
    else 'Your event is picking up'
  end,
  coalesce(mc.move_explainer, mc.move_secondary, 'Momentum is rising on this event.'),
  concat('/event/', mc.event_id, '?src=notification'),
  jsonb_build_object('move_status', mc.move_status),
  concat('event_momentum:', mc.user_id, ':', mc.event_id, ':', mc.move_status, ':', to_char(now(), 'YYYYMMDD'))
from momentum_candidates mc
on conflict (dedupe_key) do nothing;

commit;
