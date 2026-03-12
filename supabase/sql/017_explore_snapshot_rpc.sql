begin;

create or replace function public.get_explore_snapshot(
  p_city text default null,
  p_time_filter text default 'all',
  p_selected_date date default null,
  p_limit integer default 80,
  p_tz text default 'America/Chicago'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_city text := nullif(trim(p_city), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 80), 200));
  v_result jsonb;
begin
  with upcoming_events as (
    select
      e.id,
      e.title,
      e.location,
      e.city,
      e.event_date,
      e.event_end_date,
      e.image_url,
      e.description,
      e.event_source,
      e.ticket_url,
      e.external_url,
      e.venue_name,
      e.move_score,
      e.move_status,
      e.move_label,
      e.move_secondary,
      e.move_explainer,
      e.move_total_rsvps,
      e.move_recent_rsvps_6h,
      coalesce(e.event_end_date, e.event_date) as effective_end_at
    from public.events e
    where coalesce(e.moderation_status, 'approved') = 'approved'
      and coalesce(e.event_end_date, e.event_date) >= now()
      and (
        v_city is null
        or coalesce(e.city, '') ilike '%' || v_city || '%'
        or coalesce(e.location, '') ilike '%' || v_city || '%'
      )
  ),
  time_scoped as (
    select ue.*
    from upcoming_events ue
    where case
      when coalesce(p_time_filter, 'all') = 'tonight' then
        timezone(p_tz, ue.event_date)::date = timezone(p_tz, now())::date
      when coalesce(p_time_filter, 'all') = 'thisWeek' then
        timezone(p_tz, ue.event_date)::date >= timezone(p_tz, now())::date
        and timezone(p_tz, ue.event_date)::date
          <= (date_trunc('week', timezone(p_tz, now()))::date + interval '6 days')::date
      when coalesce(p_time_filter, 'all') = 'weekend' then
        timezone(p_tz, ue.event_date)::date >= timezone(p_tz, now())::date
        and extract(dow from timezone(p_tz, ue.event_date)) in (0, 5, 6)
      when coalesce(p_time_filter, 'all') = 'pickDate' then
        p_selected_date is not null
        and timezone(p_tz, ue.event_date)::date = p_selected_date
      else true
    end
  ),
  attendee_rollup as (
    select
      a.event_id,
      count(distinct a.user_id)::integer as total_rsvps,
      count(distinct a.user_id) filter (where a.created_at >= now() - interval '6 hours')::integer as recent_rsvps_6h,
      bool_or(a.user_id = auth.uid()) as viewer_going
    from public.attendees a
    join time_scoped ts on ts.id = a.event_id
    group by a.event_id
  ),
  joined as (
    select
      ts.*,
      coalesce(ar.total_rsvps, coalesce(ts.move_total_rsvps, 0), 0)::integer as total_rsvps,
      coalesce(ar.recent_rsvps_6h, coalesce(ts.move_recent_rsvps_6h, 0), 0)::integer as recent_rsvps_6h,
      coalesce(ar.viewer_going, false) as viewer_going
    from time_scoped ts
    left join attendee_rollup ar on ar.event_id = ts.id
  ),
  city_pulse as (
    select *
    from joined
    where viewer_going = false
      and (
        coalesce(move_status, '') in ('the_move', 'building_fast', 'might_be_the_move')
        or total_rsvps >= 3
        or recent_rsvps_6h >= 2
      )
    order by
      coalesce(move_score, 0) desc nulls last,
      recent_rsvps_6h desc,
      total_rsvps desc,
      event_date asc nulls last
    limit 6
  ),
  all_picks as (
    select *
    from joined
    order by
      coalesce(move_score, 0) desc nulls last,
      event_date asc nulls last,
      total_rsvps desc
    limit v_limit
  )
  select jsonb_build_object(
    'ok', true,
    'city', v_city,
    'time_filter', coalesce(p_time_filter, 'all'),
    'selected_date', p_selected_date,
    'generated_at', now(),
    'city_pulse', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', cp.id,
          'title', cp.title,
          'location', cp.location,
          'city', cp.city,
          'event_date', cp.event_date,
          'event_end_date', cp.event_end_date,
          'image_url', cp.image_url,
          'description', cp.description,
          'event_source', cp.event_source,
          'venue_name', cp.venue_name,
          'ticket_url', cp.ticket_url,
          'external_url', cp.external_url,
          'move_score', cp.move_score,
          'move_status', cp.move_status,
          'move_label', cp.move_label,
          'move_secondary', cp.move_secondary,
          'move_explainer', cp.move_explainer,
          'total_rsvps', cp.total_rsvps,
          'recent_rsvps_6h', cp.recent_rsvps_6h,
          'viewer_going', cp.viewer_going
        )
        order by coalesce(cp.move_score, 0) desc nulls last, cp.recent_rsvps_6h desc, cp.total_rsvps desc, cp.event_date asc nulls last
      )
      from city_pulse cp
    ), '[]'::jsonb),
    'all_picks', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', ap.id,
          'title', ap.title,
          'location', ap.location,
          'city', ap.city,
          'event_date', ap.event_date,
          'event_end_date', ap.event_end_date,
          'image_url', ap.image_url,
          'description', ap.description,
          'event_source', ap.event_source,
          'venue_name', ap.venue_name,
          'ticket_url', ap.ticket_url,
          'external_url', ap.external_url,
          'move_score', ap.move_score,
          'move_status', ap.move_status,
          'move_label', ap.move_label,
          'move_secondary', ap.move_secondary,
          'move_explainer', ap.move_explainer,
          'total_rsvps', ap.total_rsvps,
          'recent_rsvps_6h', ap.recent_rsvps_6h,
          'viewer_going', ap.viewer_going
        )
        order by coalesce(ap.move_score, 0) desc nulls last, ap.event_date asc nulls last, ap.total_rsvps desc
      )
      from all_picks ap
    ), '[]'::jsonb)
  )
  into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_explore_snapshot(text, text, date, integer, text) from public;
grant execute on function public.get_explore_snapshot(text, text, date, integer, text) to authenticated;

commit;
