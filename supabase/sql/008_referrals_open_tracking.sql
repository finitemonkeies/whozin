begin;

alter table public.referrals
  add column if not exists opened_anonymous_count integer not null default 0,
  add column if not exists opened_authenticated_count integer not null default 0;

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
    opened_anonymous_count = opened_anonymous_count + case when v_uid is null then 1 else 0 end,
    opened_authenticated_count = opened_authenticated_count + case when v_uid is null then 0 else 1 end,
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
