begin;

create or replace view public.user_acquisition_attribution_report as
with base as (
  select
    uaa.user_id,
    uaa.captured_at,
    uaa.landing_path,
    uaa.landing_url,
    uaa.referrer,
    coalesce(nullif(trim(uaa.utm_source), ''), 'direct') as utm_source,
    coalesce(nullif(trim(uaa.utm_medium), ''), 'unknown') as utm_medium,
    coalesce(nullif(trim(uaa.utm_campaign), ''), 'unlabeled') as utm_campaign,
    coalesce(nullif(trim(uaa.utm_term), ''), '') as utm_term,
    coalesce(nullif(trim(uaa.utm_content), ''), '') as utm_content,
    uaa.fbclid,
    uaa.gclid,
    uaa.ttclid,
    uaa.metadata,
    p.created_at as profile_created_at,
    coalesce(p.onboarding_complete, false) as onboarding_complete
  from public.user_acquisition_attribution uaa
  join public.profiles p on p.id = uaa.user_id
)
select
  b.*,
  (
    select min(a.created_at)
    from public.attendees a
    where a.user_id = b.user_id
  ) as first_rsvp_at,
  (
    select min(f.created_at)
    from public.friendships f
    where f.user_id = b.user_id or f.friend_id = b.user_id
  ) as first_friend_add_at,
  (
    select min(pe.created_at)
    from public.product_events pe
    where pe.user_id = b.user_id
      and pe.event_name = 'invite_sent'
  ) as first_invite_at,
  (
    select min(pe.created_at)
    from public.product_events pe
    where pe.user_id = b.user_id
      and pe.event_name = 'explore_buy_ticket_click'
  ) as first_ticket_click_at,
  exists(
    select 1
    from public.attendees a
    where a.user_id = b.user_id
      and a.created_at >= b.profile_created_at
      and a.created_at < b.profile_created_at + interval '7 days'
  ) as activated_rsvp_7d,
  exists(
    select 1
    from public.friendships f
    where (f.user_id = b.user_id or f.friend_id = b.user_id)
      and f.created_at >= b.profile_created_at
      and f.created_at < b.profile_created_at + interval '7 days'
  ) as added_friend_7d,
  exists(
    select 1
    from public.product_events pe
    where pe.user_id = b.user_id
      and pe.event_name = 'invite_sent'
      and pe.created_at >= b.profile_created_at
      and pe.created_at < b.profile_created_at + interval '7 days'
  ) as invited_7d,
  exists(
    select 1
    from public.product_events pe
    where pe.user_id = b.user_id
      and pe.event_name = 'explore_buy_ticket_click'
      and pe.created_at >= b.profile_created_at
      and pe.created_at < b.profile_created_at + interval '7 days'
  ) as ticket_click_7d,
  exists(
    select 1
    from public.attendees a
    where a.user_id = b.user_id
      and a.created_at >= b.profile_created_at + interval '1 day'
      and a.created_at < b.profile_created_at + interval '8 days'
  ) or exists(
    select 1
    from public.friendships f
    where (f.user_id = b.user_id or f.friend_id = b.user_id)
      and f.created_at >= b.profile_created_at + interval '1 day'
      and f.created_at < b.profile_created_at + interval '8 days'
  ) as retained_d7
from base b;

commit;
