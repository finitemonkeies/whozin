begin;

create extension if not exists pgcrypto;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  inviter_user_id uuid not null references auth.users(id) on delete cascade,
  invitee_user_id uuid null references auth.users(id) on delete set null,
  event_id uuid null references public.events(id) on delete set null,
  source text not null default 'unknown',
  invite_open_count integer not null default 0,
  first_opened_at timestamptz null,
  last_opened_at timestamptz null,
  claimed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists referrals_inviter_user_id_idx
  on public.referrals (inviter_user_id);

create index if not exists referrals_event_id_idx
  on public.referrals (event_id);

create index if not exists referrals_created_at_idx
  on public.referrals (created_at);

alter table public.referrals enable row level security;

drop policy if exists "referrals_select_own" on public.referrals;
create policy "referrals_select_own"
on public.referrals
for select
to authenticated
using (
  inviter_user_id = auth.uid()
  or invitee_user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "referrals_insert_own" on public.referrals;
create policy "referrals_insert_own"
on public.referrals
for insert
to authenticated
with check (inviter_user_id = auth.uid());

create or replace function public.claim_referral(
  p_token text,
  p_event_id uuid default null,
  p_source text default 'share_link'
)
returns table (
  claimed boolean,
  inviter_user_id uuid,
  event_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_claimed_count integer := 0;
begin
  update public.referrals
  set
    invite_open_count = invite_open_count + 1,
    first_opened_at = coalesce(first_opened_at, now()),
    last_opened_at = now(),
    source = coalesce(nullif(trim(p_source), ''), source),
    event_id = coalesce(event_id, p_event_id)
  where token = p_token;

  if v_uid is not null then
    update public.referrals r
    set
      invitee_user_id = v_uid,
      claimed_at = coalesce(r.claimed_at, now()),
      event_id = coalesce(r.event_id, p_event_id)
    where r.token = p_token
      and r.invitee_user_id is null
      and r.inviter_user_id <> v_uid;

    get diagnostics v_claimed_count = ROW_COUNT;
  end if;

  return query
  select
    (v_claimed_count > 0),
    r.inviter_user_id,
    r.event_id
  from public.referrals r
  where r.token = p_token;
end;
$$;

revoke all on function public.claim_referral(text, uuid, text) from public;
grant execute on function public.claim_referral(text, uuid, text) to anon, authenticated;

commit;
