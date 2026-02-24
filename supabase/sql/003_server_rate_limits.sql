-- Server-side abuse guardrails for pre-alpha:
-- - friend add attempts (writes to friendships)
-- - RSVP writes (writes to attendees)
--
-- This is authoritative DB enforcement (cannot be bypassed by client edits).

begin;

create table if not exists public.action_rate_limits (
  actor_id uuid not null,
  scope text not null,
  window_started_at timestamptz not null default now(),
  hit_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (actor_id, scope)
);

alter table public.action_rate_limits enable row level security;

drop policy if exists "action_rate_limits_admin_read" on public.action_rate_limits;
create policy "action_rate_limits_admin_read"
on public.action_rate_limits
for select
to authenticated
using (public.is_admin());

drop policy if exists "action_rate_limits_no_client_write" on public.action_rate_limits;
create policy "action_rate_limits_no_client_write"
on public.action_rate_limits
for all
to authenticated
using (false)
with check (false);

create or replace function public.enforce_action_rate_limit(
  p_actor_id uuid,
  p_scope text,
  p_window interval,
  p_max_hits integer default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hit_count integer;
begin
  if p_actor_id is null or p_scope is null or p_scope = '' then
    return;
  end if;

  insert into public.action_rate_limits (actor_id, scope, window_started_at, hit_count, updated_at)
  values (p_actor_id, p_scope, now(), 1, now())
  on conflict (actor_id, scope)
  do update
  set
    hit_count = case
      when public.action_rate_limits.window_started_at >= now() - p_window
        then public.action_rate_limits.hit_count + 1
      else 1
    end,
    window_started_at = case
      when public.action_rate_limits.window_started_at >= now() - p_window
        then public.action_rate_limits.window_started_at
      else now()
    end,
    updated_at = now()
  returning hit_count into v_hit_count;

  if v_hit_count > greatest(1, p_max_hits) then
    raise exception 'Rate limit exceeded. Please wait before retrying.'
      using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.tg_rate_limit_friendships_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Do not rate limit admin/service writes.
  if public.is_admin() then
    return new;
  end if;

  if coalesce(auth.jwt()->>'role', '') = 'service_role' then
    return new;
  end if;

  perform public.enforce_action_rate_limit(new.user_id, 'friend_add_insert', interval '5 seconds', 1);
  return new;
end;
$$;

drop trigger if exists friendships_rate_limit_insert on public.friendships;
create trigger friendships_rate_limit_insert
before insert on public.friendships
for each row
execute function public.tg_rate_limit_friendships_insert();

create or replace function public.tg_rate_limit_attendees_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Do not rate limit admin/service writes.
  if public.is_admin() then
    return new;
  end if;

  if coalesce(auth.jwt()->>'role', '') = 'service_role' then
    return new;
  end if;

  perform public.enforce_action_rate_limit(new.user_id, 'rsvp_insert', interval '2 seconds', 1);
  return new;
end;
$$;

drop trigger if exists attendees_rate_limit_insert on public.attendees;
create trigger attendees_rate_limit_insert
before insert on public.attendees
for each row
execute function public.tg_rate_limit_attendees_insert();

commit;
