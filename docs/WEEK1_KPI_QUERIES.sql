-- Week 1 KPI query pack
-- Timezone convention: America/Chicago
-- All windows are full local days ending yesterday.

-- 1) 7-day trend (daily) over full local days ending yesterday:
--    new_users, active_users, rsvps, friend_adds, events_happening,
--    activated_new_users + activation_rate_pct,
--    d1_retained_users + d1_eligible_users + d1_retention_pct
with bounds as (
  select
    'America/Chicago'::text as tz,
    (now() at time zone 'America/Chicago')::date as local_today
),
days as (
  select
    gs::date as day_local
  from bounds b
  cross join generate_series(
    b.local_today - interval '7 day',
    b.local_today - interval '1 day',
    interval '1 day'
  ) as gs
),
day_windows as (
  select
    d.day_local,
    (d.day_local::timestamp at time zone b.tz) as day_start_utc,
    ((d.day_local + 1)::timestamp at time zone b.tz) as day_end_utc,
    ((d.day_local + 2)::timestamp at time zone b.tz) as day_plus2_utc,
    (b.local_today - interval '1 day')::date as last_full_day_local
  from days d
  cross join bounds b
),
new_users as (
  select
    w.day_local,
    count(*)::bigint as new_users
  from day_windows w
  join public.profiles p
    on p.created_at >= w.day_start_utc
   and p.created_at < w.day_end_utc
  group by w.day_local
),
active_users as (
  select
    x.day_local,
    count(distinct x.user_id)::bigint as active_users
  from (
    select w.day_local, a.user_id
    from day_windows w
    join public.attendees a
      on a.created_at >= w.day_start_utc
     and a.created_at < w.day_end_utc
    union all
    select w.day_local, f.user_id
    from day_windows w
    join public.friendships f
      on f.created_at >= w.day_start_utc
     and f.created_at < w.day_end_utc
  ) x
  group by x.day_local
),
rsvps as (
  select
    w.day_local,
    count(*)::bigint as rsvps
  from day_windows w
  join public.attendees a
    on a.created_at >= w.day_start_utc
   and a.created_at < w.day_end_utc
  group by w.day_local
),
friend_adds as (
  select
    w.day_local,
    count(*)::bigint as friend_adds
  from day_windows w
  join public.friendships f
    on f.created_at >= w.day_start_utc
   and f.created_at < w.day_end_utc
  group by w.day_local
),
events_happening as (
  select
    w.day_local,
    count(*)::bigint as events_happening
  from day_windows w
  join public.events e
    on (e.event_date at time zone 'America/Chicago')::date <= w.day_local
   and (coalesce(e.event_end_date, e.event_date) at time zone 'America/Chicago')::date >= w.day_local
  group by w.day_local
),
activation as (
  select
    w.day_local,
    count(*)::bigint as activated_new_users
  from day_windows w
  join public.profiles p
    on p.created_at >= w.day_start_utc
   and p.created_at < w.day_end_utc
  where exists (
    select 1
    from public.attendees a
    where a.user_id = p.id
      and a.created_at >= p.created_at
      and a.created_at < p.created_at + interval '24 hours'
  )
  group by w.day_local
),
d1_eligible as (
  select
    w.day_local,
    case
      when w.day_local <= (w.last_full_day_local - interval '1 day')::date then count(*)::bigint
      else 0::bigint
    end as d1_eligible_users
  from day_windows w
  left join public.profiles p
    on p.created_at >= w.day_start_utc
   and p.created_at < w.day_end_utc
  group by w.day_local, w.last_full_day_local
),
d1_retained as (
  select
    w.day_local,
    case
      when w.day_local <= (w.last_full_day_local - interval '1 day')::date then count(*)::bigint
      else 0::bigint
    end as d1_retained_users
  from day_windows w
  join public.profiles p
    on p.created_at >= w.day_start_utc
   and p.created_at < w.day_end_utc
  where exists (
    select 1
    from public.attendees a
    where a.user_id = p.id
      and a.created_at >= w.day_end_utc
      and a.created_at < w.day_plus2_utc
  ) or exists (
    select 1
    from public.friendships f
    where f.user_id = p.id
      and f.created_at >= w.day_end_utc
      and f.created_at < w.day_plus2_utc
  )
  group by w.day_local, w.last_full_day_local
)
select
  'Q1_7day_trend'::text as query_name,
  w.day_local,
  coalesce(n.new_users, 0) as new_users,
  coalesce(au.active_users, 0) as active_users,
  coalesce(r.rsvps, 0) as rsvps,
  coalesce(f.friend_adds, 0) as friend_adds,
  coalesce(eh.events_happening, 0) as events_happening,
  coalesce(ac.activated_new_users, 0) as activated_new_users,
  round(
    case
      when coalesce(n.new_users, 0) = 0 then 0
      else (coalesce(ac.activated_new_users, 0)::numeric / n.new_users::numeric) * 100
    end,
    2
  ) as activation_rate_pct,
  coalesce(dr.d1_retained_users, 0) as d1_retained_users,
  coalesce(de.d1_eligible_users, 0) as d1_eligible_users,
  round(
    case
      when coalesce(de.d1_eligible_users, 0) = 0 then 0
      else (coalesce(dr.d1_retained_users, 0)::numeric / de.d1_eligible_users::numeric) * 100
    end,
    2
  ) as d1_retention_pct
from day_windows w
left join new_users n on n.day_local = w.day_local
left join active_users au on au.day_local = w.day_local
left join rsvps r on r.day_local = w.day_local
left join friend_adds f on f.day_local = w.day_local
left join events_happening eh on eh.day_local = w.day_local
left join activation ac on ac.day_local = w.day_local
left join d1_eligible de on de.day_local = w.day_local
left join d1_retained dr on dr.day_local = w.day_local
order by w.day_local;

-- 2) RSVP source split for the last full 7 local days
with bounds as (
  select
    'America/Chicago'::text as tz,
    (now() at time zone 'America/Chicago')::date as local_today
),
time_window as (
  select
    ((local_today - 7)::timestamp at time zone tz) as start_utc,
    (local_today::timestamp at time zone tz) as end_utc
  from bounds
),
source_counts as (
  select
    coalesce(nullif(trim(lower(a.rsvp_source)), ''), 'unknown') as rsvp_source,
    count(*)::bigint as rsvp_count
  from public.attendees a
  cross join time_window w
  where a.created_at >= w.start_utc
    and a.created_at < w.end_utc
  group by 1
)
select
  'Q2_rsvp_source_split'::text as query_name,
  rsvp_source,
  rsvp_count,
  round(
    (rsvp_count::numeric / nullif(sum(rsvp_count) over (), 0)::numeric) * 100,
    2
  ) as pct_of_rsvps
from source_counts
order by rsvp_count desc, rsvp_source;

-- 3) Event source quality for the last full 7 local days
with bounds as (
  select
    'America/Chicago'::text as tz,
    (now() at time zone 'America/Chicago')::date as local_today
),
time_window as (
  select
    ((local_today - 7)::timestamp at time zone tz) as start_utc,
    (local_today::timestamp at time zone tz) as end_utc,
    (local_today - 7)::date as start_day_local,
    (local_today - 1)::date as end_day_local
  from bounds
),
live_events as (
  select
    e.id,
    coalesce(nullif(trim(lower(e.event_source)), ''), 'internal') as event_source
  from public.events e
  cross join time_window w
  where (e.event_date at time zone 'America/Chicago')::date <= w.end_day_local
    and (coalesce(e.event_end_date, e.event_date) at time zone 'America/Chicago')::date >= w.start_day_local
),
rsvps as (
  select
    a.event_id,
    count(*)::bigint as rsvp_count
  from public.attendees a
  cross join time_window w
  where a.created_at >= w.start_utc
    and a.created_at < w.end_utc
  group by a.event_id
)
select
  'Q3_event_source_quality'::text as query_name,
  le.event_source,
  count(*)::bigint as event_count,
  coalesce(sum(r.rsvp_count), 0)::bigint as rsvp_count,
  round(coalesce(sum(r.rsvp_count), 0)::numeric / nullif(count(*), 0)::numeric, 2) as rsvps_per_live_event
from live_events le
left join rsvps r on r.event_id = le.id
group by le.event_source
order by rsvps_per_live_event desc, le.event_source;

-- 4) Primary KPI: RSVPs per active user per week (last 6 full local weeks)
with bounds as (
  select
    'America/Chicago'::text as tz,
    (now() at time zone 'America/Chicago')::date as local_today
),
week_anchor as (
  select date_trunc('week', local_today::timestamp)::date as this_week_start_local
  from bounds
),
weeks as (
  select
    gs::date as week_start_local
  from week_anchor w
  cross join generate_series(
    w.this_week_start_local - interval '6 week',
    w.this_week_start_local - interval '1 week',
    interval '1 week'
  ) as gs
),
week_windows as (
  select
    wk.week_start_local,
    (wk.week_start_local::timestamp at time zone b.tz) as week_start_utc,
    ((wk.week_start_local + 7)::timestamp at time zone b.tz) as week_end_utc
  from weeks wk
  cross join bounds b
),
weekly_active as (
  select
    x.week_start_local,
    count(distinct x.user_id)::bigint as active_users
  from (
    select ww.week_start_local, a.user_id
    from week_windows ww
    join public.attendees a
      on a.created_at >= ww.week_start_utc
     and a.created_at < ww.week_end_utc
    union all
    select ww.week_start_local, f.user_id
    from week_windows ww
    join public.friendships f
      on f.created_at >= ww.week_start_utc
     and f.created_at < ww.week_end_utc
  ) x
  group by x.week_start_local
),
weekly_rsvps as (
  select
    ww.week_start_local,
    count(*)::bigint as rsvps
  from week_windows ww
  join public.attendees a
    on a.created_at >= ww.week_start_utc
   and a.created_at < ww.week_end_utc
  group by ww.week_start_local
)
select
  'Q4_rsvps_per_active_user_weekly'::text as query_name,
  ww.week_start_local,
  coalesce(wr.rsvps, 0) as rsvps,
  coalesce(wa.active_users, 0) as active_users,
  round(
    case
      when coalesce(wa.active_users, 0) = 0 then 0
      else wr.rsvps::numeric / wa.active_users::numeric
    end,
    4
  ) as rsvps_per_active_user
from week_windows ww
left join weekly_rsvps wr on wr.week_start_local = ww.week_start_local
left join weekly_active wa on wa.week_start_local = ww.week_start_local
order by ww.week_start_local;

-- 5) Explore -> Detail CTR (last full 7 local days)
with bounds as (
  select
    'America/Chicago'::text as tz,
    (now() at time zone 'America/Chicago')::date as local_today
),
time_window as (
  select
    ((local_today - 7)::timestamp at time zone tz) as start_utc,
    (local_today::timestamp at time zone tz) as end_utc
  from bounds
),
explore_events as (
  select
    pe.event_name,
    count(*)::bigint as event_count,
    count(distinct pe.user_id)::bigint as unique_users
  from public.product_events pe
  cross join time_window w
  where pe.created_at >= w.start_utc
    and pe.created_at < w.end_utc
    and pe.source = 'explore'
    and pe.event_name in ('explore_event_impression', 'explore_event_click')
  group by pe.event_name
),
impressions as (
  select
    coalesce(max(case when event_name = 'explore_event_impression' then event_count end), 0)::bigint as impressions,
    coalesce(max(case when event_name = 'explore_event_impression' then unique_users end), 0)::bigint as impression_users
  from explore_events
),
clicks as (
  select
    coalesce(max(case when event_name = 'explore_event_click' then event_count end), 0)::bigint as clicks,
    coalesce(max(case when event_name = 'explore_event_click' then unique_users end), 0)::bigint as click_users
  from explore_events
)
select
  'Q5_explore_to_detail_ctr'::text as query_name,
  i.impressions,
  c.clicks,
  round((c.clicks::numeric / nullif(i.impressions, 0)::numeric) * 100, 2) as ctr_pct,
  i.impression_users,
  c.click_users,
  round((c.click_users::numeric / nullif(i.impression_users, 0)::numeric) * 100, 2) as user_ctr_pct
from impressions i
cross join clicks c;

-- 6) Detail -> RSVP CVR (last full 7 local days)
with bounds as (
  select
    'America/Chicago'::text as tz,
    (now() at time zone 'America/Chicago')::date as local_today
),
time_window as (
  select
    ((local_today - 7)::timestamp at time zone tz) as start_utc,
    (local_today::timestamp at time zone tz) as end_utc
  from bounds
),
detail_views as (
  select
    pe.user_id,
    pe.event_id,
    min(pe.created_at) as first_view_at
  from public.product_events pe
  cross join time_window w
  where pe.event_name = 'event_detail_view'
    and pe.event_id is not null
    and pe.created_at >= w.start_utc
    and pe.created_at < w.end_utc
  group by pe.user_id, pe.event_id
),
detail_conversions as (
  select
    dv.user_id,
    dv.event_id
  from detail_views dv
  where exists (
    select 1
    from public.attendees a
    where a.user_id = dv.user_id
      and a.event_id = dv.event_id
      and a.created_at >= dv.first_view_at
      and a.created_at < dv.first_view_at + interval '24 hours'
  )
)
select
  'Q6_detail_to_rsvp_cvr'::text as query_name,
  count(*)::bigint as detail_views_user_event,
  (select count(*)::bigint from detail_conversions) as converted_user_event,
  round(
    ((select count(*)::numeric from detail_conversions) / nullif(count(*), 0)::numeric) * 100,
    2
  ) as detail_to_rsvp_cvr_pct
from detail_views;

-- 7) Friend-add -> RSVP within 72h (last full 7 local days)
with bounds as (
  select
    'America/Chicago'::text as tz,
    (now() at time zone 'America/Chicago')::date as local_today
),
time_window as (
  select
    ((local_today - 7)::timestamp at time zone tz) as start_utc,
    (local_today::timestamp at time zone tz) as end_utc
  from bounds
),
friend_adds as (
  select
    f.user_id,
    f.friend_id,
    f.created_at as friend_added_at
  from public.friendships f
  cross join time_window w
  where f.created_at >= w.start_utc
    and f.created_at < w.end_utc
),
friend_add_conversions as (
  select
    fa.user_id,
    fa.friend_id,
    fa.friend_added_at
  from friend_adds fa
  where exists (
    select 1
    from public.attendees a
    where a.user_id = fa.user_id
      and a.created_at >= fa.friend_added_at
      and a.created_at < fa.friend_added_at + interval '72 hours'
  )
)
select
  'Q7_friend_add_to_rsvp_72h'::text as query_name,
  count(*)::bigint as friend_adds,
  (select count(*)::bigint from friend_add_conversions) as friend_adds_with_rsvp_72h,
  round(
    ((select count(*)::numeric from friend_add_conversions) / nullif(count(*), 0)::numeric) * 100,
    2
  ) as friend_add_to_rsvp_72h_pct
from friend_adds;
