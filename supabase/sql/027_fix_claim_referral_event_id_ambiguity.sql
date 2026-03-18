begin;

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
  update public.referrals as ref
  set
    invite_open_count = ref.invite_open_count + 1,
    opened_anonymous_count = ref.opened_anonymous_count + case when v_uid is null then 1 else 0 end,
    opened_authenticated_count = ref.opened_authenticated_count + case when v_uid is null then 0 else 1 end,
    first_opened_at = coalesce(ref.first_opened_at, now()),
    last_opened_at = now(),
    source = coalesce(nullif(trim(p_source), ''), ref.source),
    event_id = coalesce(ref.event_id, p_event_id)
  where ref.token = p_token;

  if v_uid is not null then
    update public.referrals as ref
    set
      invitee_user_id = v_uid,
      claimed_at = coalesce(ref.claimed_at, now()),
      event_id = coalesce(ref.event_id, p_event_id)
    where ref.token = p_token
      and ref.invitee_user_id is null
      and ref.inviter_user_id <> v_uid;

    get diagnostics v_claimed_count = row_count;
  end if;

  return query
  select
    (v_claimed_count > 0),
    ref.inviter_user_id,
    ref.event_id
  from public.referrals as ref
  where ref.token = p_token;
end;
$$;

revoke all on function public.claim_referral(text, uuid, text) from public;
grant execute on function public.claim_referral(text, uuid, text) to anon, authenticated;

commit;
