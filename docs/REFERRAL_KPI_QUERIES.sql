-- Referral Flywheel KPI query pack
-- Timezone: America/Chicago

-- 1) Baseline (last 7 days)
with w as (
  select ((now() at time zone 'America/Chicago')::date - interval '7 day')::timestamp at time zone 'America/Chicago' as start_utc
),
rsvps as (
  select count(*)::bigint as rsvps
  from public.attendees a
  cross join w
  where a.created_at >= w.start_utc
),
events as (
  select
    count(*) filter (where pe.event_name = 'invite_sent')::bigint as invite_sent,
    count(*) filter (where pe.event_name = 'invite_link_opened')::bigint as invite_opened,
    count(*) filter (where pe.event_name = 'invite_signup_completed')::bigint as invite_signup_completed,
    count(*) filter (where pe.event_name = 'invite_rsvp_completed')::bigint as invite_rsvp_completed
  from public.product_events pe
  cross join w
  where pe.created_at >= w.start_utc
)
select
  r.rsvps,
  e.invite_sent,
  e.invite_opened,
  e.invite_signup_completed,
  e.invite_rsvp_completed,
  round(case when r.rsvps = 0 then 0 else (e.invite_opened::numeric / r.rsvps::numeric) * 100 end, 2) as pct_rsvps_with_invite_click,
  round(case when e.invite_opened = 0 then 0 else (e.invite_signup_completed::numeric / e.invite_opened::numeric) * 100 end, 2) as signup_from_invite_pct,
  round(case when e.invite_signup_completed = 0 then 0 else (e.invite_rsvp_completed::numeric / e.invite_signup_completed::numeric) * 100 end, 2) as rsvp_from_invite_72h_pct
from rsvps r
cross join events e;

-- 2) Invite funnel by day (last 14 local days)
with bounds as (
  select
    'America/Chicago'::text as tz,
    (now() at time zone 'America/Chicago')::date as local_today
),
days as (
  select gs::date as day_local
  from bounds b
  cross join generate_series(
    b.local_today - interval '14 day',
    b.local_today - interval '1 day',
    interval '1 day'
  ) as gs
),
windows as (
  select
    d.day_local,
    (d.day_local::timestamp at time zone b.tz) as start_utc,
    ((d.day_local + 1)::timestamp at time zone b.tz) as end_utc
  from days d
  cross join bounds b
),
funnel as (
  select
    w.day_local,
    count(*) filter (where pe.event_name = 'invite_sent')::bigint as invite_sent,
    count(*) filter (where pe.event_name = 'invite_link_opened')::bigint as invite_opened,
    count(*) filter (where pe.event_name = 'invite_signup_completed')::bigint as invite_signup_completed,
    count(*) filter (where pe.event_name = 'invite_rsvp_completed')::bigint as invite_rsvp_completed
  from windows w
  left join public.product_events pe
    on pe.created_at >= w.start_utc
   and pe.created_at < w.end_utc
   and pe.event_name in ('invite_sent', 'invite_link_opened', 'invite_signup_completed', 'invite_rsvp_completed')
  group by w.day_local
)
select *
from funnel
order by day_local;

-- 3) Conversion by source (last 14 local days)
with w as (
  select ((now() at time zone 'America/Chicago')::date - interval '14 day')::timestamp at time zone 'America/Chicago' as start_utc
),
x as (
  select
    coalesce(nullif(trim(pe.source), ''), 'unknown') as source,
    count(*) filter (where pe.event_name = 'invite_sent')::bigint as invite_sent,
    count(*) filter (where pe.event_name = 'invite_link_opened')::bigint as invite_opened,
    count(*) filter (where pe.event_name = 'invite_signup_completed')::bigint as invite_signup_completed,
    count(*) filter (where pe.event_name = 'invite_rsvp_completed')::bigint as invite_rsvp_completed
  from public.product_events pe
  cross join w
  where pe.created_at >= w.start_utc
    and pe.event_name in ('invite_sent', 'invite_link_opened', 'invite_signup_completed', 'invite_rsvp_completed')
  group by 1
)
select
  source,
  invite_sent,
  invite_opened,
  invite_signup_completed,
  invite_rsvp_completed,
  round(case when invite_opened = 0 then 0 else (invite_signup_completed::numeric / invite_opened::numeric) * 100 end, 2) as signup_from_invite_pct,
  round(case when invite_signup_completed = 0 then 0 else (invite_rsvp_completed::numeric / invite_signup_completed::numeric) * 100 end, 2) as rsvp_from_invite_72h_pct
from x
order by invite_opened desc, source;

-- 4) Top inviters by qualified conversions (last 30 days)
with w as (
  select now() - interval '30 day' as start_utc
)
select
  r.inviter_user_id,
  p.username as inviter_username,
  count(*)::bigint as invites_created,
  count(*) filter (where r.invite_open_count > 0)::bigint as invites_opened,
  count(*) filter (where r.invitee_user_id is not null)::bigint as invites_claimed
from public.referrals r
left join public.profiles p on p.id = r.inviter_user_id
cross join w
where r.created_at >= w.start_utc
group by r.inviter_user_id, p.username
order by invites_claimed desc, invites_opened desc, invites_created desc
limit 25;

-- 5) Open quality split (last 30 days): anonymous vs authenticated opens
with w as (
  select now() - interval '30 day' as start_utc
)
select
  count(*)::bigint as invites_created,
  coalesce(sum(r.opened_anonymous_count), 0)::bigint as opened_anonymous,
  coalesce(sum(r.opened_authenticated_count), 0)::bigint as opened_authenticated,
  count(*) filter (where r.invitee_user_id is not null)::bigint as claimed_invites,
  round(
    case
      when coalesce(sum(r.opened_anonymous_count), 0) = 0 then 0
      else (
        count(*) filter (where r.invitee_user_id is not null)::numeric
        / coalesce(sum(r.opened_anonymous_count), 0)::numeric
      ) * 100
    end,
    2
  ) as claimed_per_anon_open_pct
from public.referrals r
cross join w
where r.created_at >= w.start_utc;
