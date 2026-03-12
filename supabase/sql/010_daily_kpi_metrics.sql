begin;

create table if not exists public.daily_kpi_metrics (
  metric_date date primary key,
  timezone text not null default 'America/Chicago',
  new_users bigint not null default 0,
  active_users bigint not null default 0,
  rsvps bigint not null default 0,
  friend_adds bigint not null default 0,
  events_happening bigint not null default 0,
  activated_new_users bigint not null default 0,
  activation_rate_pct numeric(6,2) not null default 0,
  d1_retained_users bigint not null default 0,
  d1_eligible_users bigint not null default 0,
  d1_retention_pct numeric(6,2) not null default 0,
  event_detail_views bigint not null default 0,
  invite_sent bigint not null default 0,
  invite_opened bigint not null default 0,
  invite_signup_completed bigint not null default 0,
  invite_rsvp_completed bigint not null default 0,
  generated_at timestamptz not null default now()
);

create table if not exists public.daily_kpi_rsvp_sources (
  metric_date date not null,
  timezone text not null default 'America/Chicago',
  source text not null,
  rsvp_count bigint not null default 0,
  pct_of_day numeric(6,2) not null default 0,
  generated_at timestamptz not null default now(),
  primary key (metric_date, source)
);

create index if not exists daily_kpi_metrics_generated_at_idx
  on public.daily_kpi_metrics (generated_at desc);

create index if not exists daily_kpi_rsvp_sources_metric_date_idx
  on public.daily_kpi_rsvp_sources (metric_date desc);

alter table public.daily_kpi_metrics enable row level security;
alter table public.daily_kpi_rsvp_sources enable row level security;

drop policy if exists "daily_kpi_metrics_admin_read" on public.daily_kpi_metrics;
create policy "daily_kpi_metrics_admin_read"
on public.daily_kpi_metrics
for select
to authenticated
using (public.is_admin());

drop policy if exists "daily_kpi_metrics_no_client_write" on public.daily_kpi_metrics;
create policy "daily_kpi_metrics_no_client_write"
on public.daily_kpi_metrics
for all
to authenticated
using (false)
with check (false);

drop policy if exists "daily_kpi_rsvp_sources_admin_read" on public.daily_kpi_rsvp_sources;
create policy "daily_kpi_rsvp_sources_admin_read"
on public.daily_kpi_rsvp_sources
for select
to authenticated
using (public.is_admin());

drop policy if exists "daily_kpi_rsvp_sources_no_client_write" on public.daily_kpi_rsvp_sources;
create policy "daily_kpi_rsvp_sources_no_client_write"
on public.daily_kpi_rsvp_sources
for all
to authenticated
using (false)
with check (false);

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
      ((d.metric_date + 2)::timestamp at time zone p_tz) as day_plus2_utc
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
      where f.user_id = p.id
        and f.created_at >= w.day_end_utc
        and f.created_at < w.day_plus2_utc
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
    d1_retained_users,
    d1_eligible_users,
    d1_retention_pct,
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
    coalesce(dr.d1_retained_users, 0),
    coalesce(de.d1_eligible_users, 0),
    round(
      case
        when coalesce(de.d1_eligible_users, 0) = 0 then 0
        else (coalesce(dr.d1_retained_users, 0)::numeric / de.d1_eligible_users::numeric) * 100
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
  left join d1_eligible de on de.metric_date = d.metric_date
  left join d1_retained dr on dr.metric_date = d.metric_date
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

revoke all on function public.refresh_daily_kpi_metrics(date, date, text) from public;
grant execute on function public.refresh_daily_kpi_metrics(date, date, text) to authenticated;

commit;
