begin;

alter table public.daily_kpi_metrics
  add column if not exists new_users_with_friend_24h bigint not null default 0,
  add column if not exists friend_24h_rate_pct numeric(6,2) not null default 0,
  add column if not exists new_users_with_rsvp_24h bigint not null default 0,
  add column if not exists rsvp_24h_rate_pct numeric(6,2) not null default 0,
  add column if not exists new_users_with_invite_72h bigint not null default 0,
  add column if not exists invite_72h_rate_pct numeric(6,2) not null default 0,
  add column if not exists wau_7d bigint not null default 0,
  add column if not exists d7_retained_users bigint not null default 0,
  add column if not exists d7_eligible_users bigint not null default 0,
  add column if not exists d7_retention_pct numeric(6,2) not null default 0,
  add column if not exists d30_retained_users bigint not null default 0,
  add column if not exists d30_eligible_users bigint not null default 0,
  add column if not exists d30_retention_pct numeric(6,2) not null default 0;

create or replace function public.refresh_daily_kpi_metrics(
  p_start_date date default null,
  p_end_date date default null,
  p_tz text default 'America/Chicago'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local_today date := (now() at time zone p_tz)::date;
  v_start_date date := coalesce(p_start_date, v_local_today - 30);
  v_end_date date := coalesce(p_end_date, v_local_today - 1);
begin
  if v_end_date < v_start_date then
    raise exception 'end date must be on or after start date';
  end if;

  delete from public.daily_kpi_rsvp_sources
  where metric_date between v_start_date and v_end_date;

  delete from public.daily_kpi_metrics
  where metric_date between v_start_date and v_end_date;

  with days as (
    select gs::date as metric_date
    from generate_series(v_start_date, v_end_date, interval '1 day') as gs
  ),
  day_windows as (
    select
      d.metric_date,
      (d.metric_date::timestamp at time zone p_tz) as day_start_utc,
      ((d.metric_date + 1)::timestamp at time zone p_tz) as day_end_utc,
      ((d.metric_date + 2)::timestamp at time zone p_tz) as day_plus2_utc,
      ((d.metric_date + 8)::timestamp at time zone p_tz) as day_plus8_utc,
      ((d.metric_date + 31)::timestamp at time zone p_tz) as day_plus31_utc,
      ((d.metric_date - 6)::timestamp at time zone p_tz) as trailing7_start_utc
    from days d
  ),
  new_users as (
    select
      w.metric_date,
      count(*)::bigint as new_users
    from day_windows w
    join public.profiles p
      on p.created_at >= w.day_start_utc
     and p.created_at < w.day_end_utc
    group by w.metric_date
  ),
  active_users as (
    select
      x.metric_date,
      count(distinct x.user_id)::bigint as active_users
    from (
      select w.metric_date, a.user_id
      from day_windows w
      join public.attendees a
        on a.created_at >= w.day_start_utc
       and a.created_at < w.day_end_utc
      union all
      select w.metric_date, f.user_id
      from day_windows w
      join public.friendships f
        on f.created_at >= w.day_start_utc
       and f.created_at < w.day_end_utc
    ) x
    group by x.metric_date
  ),
  wau_7d as (
    select
      x.metric_date,
      count(distinct x.user_id)::bigint as wau_7d
    from (
      select w.metric_date, a.user_id
      from day_windows w
      join public.attendees a
        on a.created_at >= w.trailing7_start_utc
       and a.created_at < w.day_end_utc
      union all
      select w.metric_date, f.user_id
      from day_windows w
      join public.friendships f
        on f.created_at >= w.trailing7_start_utc
       and f.created_at < w.day_end_utc
    ) x
    group by x.metric_date
  ),
  rsvps as (
    select
      w.metric_date,
      count(*)::bigint as rsvps
    from day_windows w
    join public.attendees a
      on a.created_at >= w.day_start_utc
     and a.created_at < w.day_end_utc
    group by w.metric_date
  ),
  friend_adds as (
    select
      w.metric_date,
      count(*)::bigint as friend_adds
    from day_windows w
    join public.friendships f
      on f.created_at >= w.day_start_utc
     and f.created_at < w.day_end_utc
    group by w.metric_date
  ),
  events_happening as (
    select
      w.metric_date,
      count(*)::bigint as events_happening
    from day_windows w
    join public.events e
      on (e.event_date at time zone p_tz)::date <= w.metric_date
     and (coalesce(e.event_end_date, e.event_date) at time zone p_tz)::date >= w.metric_date
    group by w.metric_date
  ),
  activation as (
    select
      w.metric_date,
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
    group by w.metric_date
  ),
  friend_24h as (
    select
      w.metric_date,
      count(*)::bigint as new_users_with_friend_24h
    from day_windows w
    join public.profiles p
      on p.created_at >= w.day_start_utc
     and p.created_at < w.day_end_utc
    where exists (
      select 1
      from public.friendships f
      where (f.user_id = p.id or f.friend_id = p.id)
        and f.created_at >= p.created_at
        and f.created_at < p.created_at + interval '24 hours'
    )
    group by w.metric_date
  ),
  rsvp_24h as (
    select
      w.metric_date,
      count(*)::bigint as new_users_with_rsvp_24h
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
    group by w.metric_date
  ),
  invite_72h as (
    select
      w.metric_date,
      count(*)::bigint as new_users_with_invite_72h
    from day_windows w
    join public.profiles p
      on p.created_at >= w.day_start_utc
     and p.created_at < w.day_end_utc
    where exists (
      select 1
      from public.product_events pe
      where pe.user_id = p.id
        and pe.event_name = 'invite_sent'
        and pe.created_at >= p.created_at
        and pe.created_at < p.created_at + interval '72 hours'
    )
    group by w.metric_date
  ),
  d1_eligible as (
    select
      w.metric_date,
      case
        when w.metric_date <= (v_local_today - 2) then count(*)::bigint
        else 0::bigint
      end as d1_eligible_users
    from day_windows w
    left join public.profiles p
      on p.created_at >= w.day_start_utc
     and p.created_at < w.day_end_utc
    group by w.metric_date
  ),
  d1_retained as (
    select
      w.metric_date,
      case
        when w.metric_date <= (v_local_today - 2) then count(*)::bigint
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
      where (f.user_id = p.id or f.friend_id = p.id)
        and f.created_at >= w.day_end_utc
        and f.created_at < w.day_plus2_utc
    )
    group by w.metric_date
  ),
  d7_eligible as (
    select
      w.metric_date,
      case
        when w.metric_date <= (v_local_today - 8) then count(*)::bigint
        else 0::bigint
      end as d7_eligible_users
    from day_windows w
    left join public.profiles p
      on p.created_at >= w.day_start_utc
     and p.created_at < w.day_end_utc
    group by w.metric_date
  ),
  d7_retained as (
    select
      w.metric_date,
      case
        when w.metric_date <= (v_local_today - 8) then count(*)::bigint
        else 0::bigint
      end as d7_retained_users
    from day_windows w
    join public.profiles p
      on p.created_at >= w.day_start_utc
     and p.created_at < w.day_end_utc
    where exists (
      select 1
      from public.attendees a
      where a.user_id = p.id
        and a.created_at >= w.day_plus2_utc
        and a.created_at < w.day_plus8_utc
    ) or exists (
      select 1
      from public.friendships f
      where (f.user_id = p.id or f.friend_id = p.id)
        and f.created_at >= w.day_plus2_utc
        and f.created_at < w.day_plus8_utc
    )
    group by w.metric_date
  ),
  d30_eligible as (
    select
      w.metric_date,
      case
        when w.metric_date <= (v_local_today - 31) then count(*)::bigint
        else 0::bigint
      end as d30_eligible_users
    from day_windows w
    left join public.profiles p
      on p.created_at >= w.day_start_utc
     and p.created_at < w.day_end_utc
    group by w.metric_date
  ),
  d30_retained as (
    select
      w.metric_date,
      case
        when w.metric_date <= (v_local_today - 31) then count(*)::bigint
        else 0::bigint
      end as d30_retained_users
    from day_windows w
    join public.profiles p
      on p.created_at >= w.day_start_utc
     and p.created_at < w.day_end_utc
    where exists (
      select 1
      from public.attendees a
      where a.user_id = p.id
        and a.created_at >= w.day_plus8_utc
        and a.created_at < w.day_plus31_utc
    ) or exists (
      select 1
      from public.friendships f
      where (f.user_id = p.id or f.friend_id = p.id)
        and f.created_at >= w.day_plus8_utc
        and f.created_at < w.day_plus31_utc
    )
    group by w.metric_date
  ),
  product_event_counts as (
    select
      w.metric_date,
      count(*) filter (where pe.event_name = 'event_detail_view')::bigint as event_detail_views,
      count(*) filter (where pe.event_name = 'invite_sent')::bigint as invite_sent,
      count(*) filter (where pe.event_name = 'invite_link_opened')::bigint as invite_opened,
      count(*) filter (where pe.event_name = 'invite_signup_completed')::bigint as invite_signup_completed,
      count(*) filter (where pe.event_name = 'invite_rsvp_completed')::bigint as invite_rsvp_completed
    from day_windows w
    left join public.product_events pe
      on pe.created_at >= w.day_start_utc
     and pe.created_at < w.day_end_utc
    group by w.metric_date
  )
  insert into public.daily_kpi_metrics (
    metric_date,
    timezone,
    new_users,
    active_users,
    rsvps,
    friend_adds,
    events_happening,
    activated_new_users,
    activation_rate_pct,
    new_users_with_friend_24h,
    friend_24h_rate_pct,
    new_users_with_rsvp_24h,
    rsvp_24h_rate_pct,
    new_users_with_invite_72h,
    invite_72h_rate_pct,
    wau_7d,
    d1_retained_users,
    d1_eligible_users,
    d1_retention_pct,
    d7_retained_users,
    d7_eligible_users,
    d7_retention_pct,
    d30_retained_users,
    d30_eligible_users,
    d30_retention_pct,
    event_detail_views,
    invite_sent,
    invite_opened,
    invite_signup_completed,
    invite_rsvp_completed,
    generated_at
  )
  select
    d.metric_date,
    p_tz,
    coalesce(n.new_users, 0),
    coalesce(au.active_users, 0),
    coalesce(r.rsvps, 0),
    coalesce(f.friend_adds, 0),
    coalesce(eh.events_happening, 0),
    coalesce(ac.activated_new_users, 0),
    round(
      case
        when coalesce(n.new_users, 0) = 0 then 0
        else (coalesce(ac.activated_new_users, 0)::numeric / n.new_users::numeric) * 100
      end,
      2
    ),
    coalesce(fr24.new_users_with_friend_24h, 0),
    round(
      case
        when coalesce(n.new_users, 0) = 0 then 0
        else (coalesce(fr24.new_users_with_friend_24h, 0)::numeric / n.new_users::numeric) * 100
      end,
      2
    ),
    coalesce(rv24.new_users_with_rsvp_24h, 0),
    round(
      case
        when coalesce(n.new_users, 0) = 0 then 0
        else (coalesce(rv24.new_users_with_rsvp_24h, 0)::numeric / n.new_users::numeric) * 100
      end,
      2
    ),
    coalesce(inv72.new_users_with_invite_72h, 0),
    round(
      case
        when coalesce(n.new_users, 0) = 0 then 0
        else (coalesce(inv72.new_users_with_invite_72h, 0)::numeric / n.new_users::numeric) * 100
      end,
      2
    ),
    coalesce(wau.wau_7d, 0),
    coalesce(dr.d1_retained_users, 0),
    coalesce(de.d1_eligible_users, 0),
    round(
      case
        when coalesce(de.d1_eligible_users, 0) = 0 then 0
        else (coalesce(dr.d1_retained_users, 0)::numeric / de.d1_eligible_users::numeric) * 100
      end,
      2
    ),
    coalesce(d7r.d7_retained_users, 0),
    coalesce(d7e.d7_eligible_users, 0),
    round(
      case
        when coalesce(d7e.d7_eligible_users, 0) = 0 then 0
        else (coalesce(d7r.d7_retained_users, 0)::numeric / d7e.d7_eligible_users::numeric) * 100
      end,
      2
    ),
    coalesce(d30r.d30_retained_users, 0),
    coalesce(d30e.d30_eligible_users, 0),
    round(
      case
        when coalesce(d30e.d30_eligible_users, 0) = 0 then 0
        else (coalesce(d30r.d30_retained_users, 0)::numeric / d30e.d30_eligible_users::numeric) * 100
      end,
      2
    ),
    coalesce(pec.event_detail_views, 0),
    coalesce(pec.invite_sent, 0),
    coalesce(pec.invite_opened, 0),
    coalesce(pec.invite_signup_completed, 0),
    coalesce(pec.invite_rsvp_completed, 0),
    now()
  from days d
  left join new_users n on n.metric_date = d.metric_date
  left join active_users au on au.metric_date = d.metric_date
  left join rsvps r on r.metric_date = d.metric_date
  left join friend_adds f on f.metric_date = d.metric_date
  left join events_happening eh on eh.metric_date = d.metric_date
  left join activation ac on ac.metric_date = d.metric_date
  left join friend_24h fr24 on fr24.metric_date = d.metric_date
  left join rsvp_24h rv24 on rv24.metric_date = d.metric_date
  left join invite_72h inv72 on inv72.metric_date = d.metric_date
  left join wau_7d wau on wau.metric_date = d.metric_date
  left join d1_eligible de on de.metric_date = d.metric_date
  left join d1_retained dr on dr.metric_date = d.metric_date
  left join d7_eligible d7e on d7e.metric_date = d.metric_date
  left join d7_retained d7r on d7r.metric_date = d.metric_date
  left join d30_eligible d30e on d30e.metric_date = d.metric_date
  left join d30_retained d30r on d30r.metric_date = d.metric_date
  left join product_event_counts pec on pec.metric_date = d.metric_date;

  with days as (
    select gs::date as metric_date
    from generate_series(v_start_date, v_end_date, interval '1 day') as gs
  ),
  day_windows as (
    select
      d.metric_date,
      (d.metric_date::timestamp at time zone p_tz) as day_start_utc,
      ((d.metric_date + 1)::timestamp at time zone p_tz) as day_end_utc
    from days d
  ),
  source_counts as (
    select
      w.metric_date,
      coalesce(nullif(trim(lower(a.rsvp_source)), ''), 'unknown') as source,
      count(*)::bigint as rsvp_count
    from day_windows w
    join public.attendees a
      on a.created_at >= w.day_start_utc
     and a.created_at < w.day_end_utc
    group by w.metric_date, coalesce(nullif(trim(lower(a.rsvp_source)), ''), 'unknown')
  ),
  totals as (
    select
      metric_date,
      sum(rsvp_count)::bigint as total_rsvps
    from source_counts
    group by metric_date
  )
  insert into public.daily_kpi_rsvp_sources (
    metric_date,
    timezone,
    source,
    rsvp_count,
    pct_of_day,
    generated_at
  )
  select
    sc.metric_date,
    p_tz,
    sc.source,
    sc.rsvp_count,
    round((sc.rsvp_count::numeric / nullif(t.total_rsvps, 0)::numeric) * 100, 2),
    now()
  from source_counts sc
  join totals t on t.metric_date = sc.metric_date;

  return jsonb_build_object(
    'start_date', v_start_date,
    'end_date', v_end_date,
    'timezone', p_tz,
    'days_refreshed', (v_end_date - v_start_date + 1)
  );
end;
$$;

commit;
