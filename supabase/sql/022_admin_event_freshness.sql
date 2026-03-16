create or replace function public.get_admin_event_freshness(p_tz text default 'America/Chicago')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce((auth.jwt() ->> 'email'), auth.email(), ''));
  v_today date := (now() at time zone p_tz)::date;
  v_tonight_total integer := 0;
  v_upcoming_7d_total integer := 0;
  v_upcoming_7d_missing_image integer := 0;
  v_upcoming_7d_missing_ticket integer := 0;
  v_upcoming_7d_missing_location integer := 0;
  v_quarantined_upcoming integer := 0;
  v_day_coverage jsonb := '[]'::jsonb;
  v_weak_events jsonb := '[]'::jsonb;
  v_anchor_events jsonb := '[]'::jsonb;
begin
  if v_email not in ('hello@whozin.app', 'jvincenthallahan@gmail.com') then
    raise exception 'forbidden';
  end if;

  select count(*)::int
    into v_tonight_total
  from public.events e
  where coalesce(e.moderation_status, 'approved') = 'approved'
    and (e.event_date at time zone p_tz)::date = v_today;

  select
    count(*)::int,
    count(*) filter (where nullif(trim(coalesce(e.image_url, '')), '') is null)::int,
    count(*) filter (where nullif(trim(coalesce(e.ticket_url, '')), '') is null)::int,
    count(*) filter (where nullif(trim(coalesce(e.location, '')), '') is null)::int
    into
      v_upcoming_7d_total,
      v_upcoming_7d_missing_image,
      v_upcoming_7d_missing_ticket,
      v_upcoming_7d_missing_location
  from public.events e
  where coalesce(e.moderation_status, 'approved') = 'approved'
    and (e.event_date at time zone p_tz)::date >= v_today
    and (e.event_date at time zone p_tz)::date <= v_today + 6;

  select count(*)::int
    into v_quarantined_upcoming
  from public.events e
  where coalesce(e.moderation_status, 'approved') = 'quarantined'
    and coalesce(e.event_end_date, e.event_date) >= now();

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'date', row_data.metric_date,
        'weekday', to_char(row_data.metric_date, 'Dy'),
        'approved_events', row_data.approved_events,
        'quarantined_events', row_data.quarantined_events,
        'has_events', row_data.approved_events > 0
      )
      order by row_data.metric_date asc
    ),
    '[]'::jsonb
  )
    into v_day_coverage
  from (
    select
      d.metric_date,
      count(*) filter (
        where coalesce(e.moderation_status, 'approved') = 'approved'
      )::int as approved_events,
      count(*) filter (
        where coalesce(e.moderation_status, 'approved') = 'quarantined'
      )::int as quarantined_events
    from generate_series(v_today, v_today + 6, interval '1 day') d(metric_date)
    left join public.events e
      on (e.event_date at time zone p_tz)::date = d.metric_date
    group by d.metric_date
  ) row_data;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', row_data.id,
        'title', row_data.title,
        'event_date', row_data.event_date,
        'city', row_data.city,
        'event_source', row_data.event_source,
        'missing_image', row_data.missing_image,
        'missing_ticket', row_data.missing_ticket,
        'missing_location', row_data.missing_location
      )
      order by row_data.event_date asc
    ),
    '[]'::jsonb
  )
    into v_weak_events
  from (
    select
      e.id,
      e.title,
      e.event_date,
      e.city,
      e.event_source,
      nullif(trim(coalesce(e.image_url, '')), '') is null as missing_image,
      nullif(trim(coalesce(e.ticket_url, '')), '') is null as missing_ticket,
      nullif(trim(coalesce(e.location, '')), '') is null as missing_location
    from public.events e
    where coalesce(e.moderation_status, 'approved') = 'approved'
      and (e.event_date at time zone p_tz)::date >= v_today
      and (e.event_date at time zone p_tz)::date <= v_today + 6
      and (
        nullif(trim(coalesce(e.image_url, '')), '') is null
        or nullif(trim(coalesce(e.ticket_url, '')), '') is null
        or nullif(trim(coalesce(e.location, '')), '') is null
      )
    order by e.event_date asc
    limit 8
  ) row_data;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', row_data.id,
        'title', row_data.title,
        'event_date', row_data.event_date,
        'city', row_data.city,
        'event_source', row_data.event_source,
        'attendee_count', row_data.attendee_count,
        'move_score', row_data.move_score
      )
      order by row_data.event_date asc, row_data.attendee_count desc, row_data.move_score desc nulls last
    ),
    '[]'::jsonb
  )
    into v_anchor_events
  from (
    select
      e.id,
      e.title,
      e.event_date,
      e.city,
      e.event_source,
      e.move_score,
      count(a.user_id)::int as attendee_count
    from public.events e
    left join public.attendees a on a.event_id = e.id
    where coalesce(e.moderation_status, 'approved') = 'approved'
      and (e.event_date at time zone p_tz)::date >= v_today
      and (e.event_date at time zone p_tz)::date <= v_today + 6
    group by e.id, e.title, e.event_date, e.city, e.event_source, e.move_score
    order by count(a.user_id) desc, e.move_score desc nulls last, e.event_date asc
    limit 8
  ) row_data;

  return jsonb_build_object(
    'tonight_total', v_tonight_total,
    'upcoming_7d_total', v_upcoming_7d_total,
    'upcoming_7d_missing_image', v_upcoming_7d_missing_image,
    'upcoming_7d_missing_ticket', v_upcoming_7d_missing_ticket,
    'upcoming_7d_missing_location', v_upcoming_7d_missing_location,
    'quarantined_upcoming', v_quarantined_upcoming,
    'day_coverage', v_day_coverage,
    'weak_events', v_weak_events,
    'anchor_events', v_anchor_events
  );
end;
$$;

revoke all on function public.get_admin_event_freshness(text) from public;
grant execute on function public.get_admin_event_freshness(text) to authenticated;

comment on function public.get_admin_event_freshness(text) is
  'Returns near-term event freshness coverage, weak metadata flags, and anchor events for the admin health page.';
