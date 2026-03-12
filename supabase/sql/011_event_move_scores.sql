begin;

alter table public.events
  add column if not exists move_score numeric(10,2),
  add column if not exists move_status text,
  add column if not exists move_label text,
  add column if not exists move_secondary text,
  add column if not exists move_explainer text,
  add column if not exists move_scope text,
  add column if not exists move_scope_key text,
  add column if not exists move_total_rsvps integer not null default 0,
  add column if not exists move_recent_rsvps_6h integer not null default 0,
  add column if not exists move_computed_at timestamptz;

create index if not exists events_move_score_idx
  on public.events (move_score desc nulls last);

create index if not exists events_move_scope_idx
  on public.events (move_scope, move_scope_key, move_score desc nulls last);

create or replace function public.refresh_event_move_scores(
  p_tz text default 'America/Chicago'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated_count integer := 0;
  v_notified_count integer := 0;
begin
  update public.events
  set
    move_score = null,
    move_status = null,
    move_label = null,
    move_secondary = null,
    move_explainer = null,
    move_scope = null,
    move_scope_key = null,
    move_total_rsvps = 0,
    move_recent_rsvps_6h = 0,
    move_computed_at = now()
  where coalesce(event_end_date, event_date) < now();

  with event_base as (
    select
      e.id,
      e.title,
      e.location,
      e.event_date,
      e.event_end_date,
      e.image_url,
      e.ticket_url,
      lower(
        trim(
          case
            when position(',' in coalesce(e.location, '')) > 0
              then split_part(e.location, ',', 2)
            else coalesce(e.location, 'unknown')
          end
        )
      ) as scope_key
    from public.events e
    where coalesce(e.event_end_date, e.event_date) >= now()
      and e.event_date <= now() + interval '7 days'
  ),
  attendee_counts as (
    select
      a.event_id,
      count(*)::integer as total_rsvps,
      count(*) filter (where a.created_at >= now() - interval '6 hours')::integer as recent_rsvps_6h
    from public.attendees a
    join event_base eb on eb.id = a.event_id
    group by a.event_id
  ),
  scored as (
    select
      eb.id,
      eb.scope_key,
      coalesce(ac.total_rsvps, 0) as total_rsvps,
      coalesce(ac.recent_rsvps_6h, 0) as recent_rsvps_6h,
      greatest(
        0,
        round(
          (
            ln(coalesce(ac.total_rsvps, 0) + 1) * 14 +
            coalesce(ac.recent_rsvps_6h, 0) * 11 +
            case
              when eb.event_date is null then 6
              when eb.event_date <= now() + interval '2 hours' then 18
              when eb.event_date <= now() + interval '8 hours' then 16
              when eb.event_date <= now() + interval '24 hours' then 12
              when eb.event_date <= now() + interval '48 hours' then 8
              when eb.event_date <= now() + interval '72 hours' then 4
              else -4
            end +
            case when coalesce(eb.image_url, '') <> '' then 4 else 0 end +
            case when coalesce(eb.ticket_url, '') <> '' then 3 else 0 end -
            case
              when coalesce(ac.total_rsvps, 0) < 5 and coalesce(ac.recent_rsvps_6h, 0) < 2 then 14
              else 0
            end
          )::numeric,
          2
        )
      ) as move_score
    from event_base eb
    left join attendee_counts ac on ac.event_id = eb.id
  ),
  ranked as (
    select
      s.*,
      row_number() over (partition by s.scope_key order by s.move_score desc, s.total_rsvps desc, s.id) as scope_rank,
      max(s.move_score) over (partition by s.scope_key) as top_scope_score
    from scored s
  ),
  labeled as (
    select
      r.id,
      r.scope_key,
      r.total_rsvps,
      r.recent_rsvps_6h,
      r.move_score,
      case
        when r.scope_rank = 1 and r.move_score >= 34 and (r.total_rsvps >= 12 or r.recent_rsvps_6h >= 4)
          then 'the_move'
        when r.scope_rank <= 2 and r.move_score >= 28 and r.recent_rsvps_6h >= 3
          then 'building_fast'
        when r.scope_rank <= 3 and r.move_score >= 24 and r.total_rsvps >= 8
          then 'might_be_the_move'
        else null
      end as move_status
    from ranked r
  ),
  final_labels as (
    select
      l.id,
      l.scope_key,
      l.total_rsvps,
      l.recent_rsvps_6h,
      l.move_score,
      l.move_status,
      case l.move_status
        when 'the_move' then 'The Move'
        when 'building_fast' then 'Building Fast'
        when 'might_be_the_move' then 'Might Be The Move'
        else null
      end as move_label,
      case l.move_status
        when 'the_move' then concat(l.total_rsvps, ' going')
        when 'building_fast' then concat(l.recent_rsvps_6h, ' new RSVPs lately')
        when 'might_be_the_move' then concat(l.total_rsvps, ' already going')
        else null
      end as move_secondary,
      case l.move_status
        when 'the_move' then 'This is where the night is building fastest.'
        when 'building_fast' then 'Momentum is climbing right now.'
        when 'might_be_the_move' then 'Not fully there yet, but the energy is real.'
        else null
      end as move_explainer
    from labeled l
  )
  update public.events e
  set
    move_score = f.move_score,
    move_status = f.move_status,
    move_label = f.move_label,
    move_secondary = f.move_secondary,
    move_explainer = f.move_explainer,
    move_scope = case when f.move_status is null then null else 'city' end,
    move_scope_key = case when f.move_status is null then null else f.scope_key end,
    move_total_rsvps = f.total_rsvps,
    move_recent_rsvps_6h = f.recent_rsvps_6h,
    move_computed_at = now()
  from final_labels f
  where e.id = f.id;

  get diagnostics v_updated_count = row_count;

  with momentum_targets as (
    select
      a.user_id,
      e.id as event_id,
      e.move_status,
      e.title,
      e.move_explainer
    from public.attendees a
    join public.events e on e.id = a.event_id
    where e.move_status in ('the_move', 'building_fast')
      and e.move_computed_at >= now() - interval '15 minutes'
  )
  insert into public.notifications (
    user_id,
    event_id,
    type,
    title,
    body,
    cta_path,
    metadata,
    dedupe_key
  )
  select
    mt.user_id,
    mt.event_id,
    'event_momentum',
    case
      when mt.move_status = 'the_move' then 'Your event is becoming the move'
      else 'Your event is picking up'
    end,
    coalesce(mt.move_explainer, 'Momentum is rising on this event.'),
    concat('/event/', mt.event_id, '?src=notification'),
    jsonb_build_object('move_status', mt.move_status),
    concat('event_momentum:', mt.user_id, ':', mt.event_id, ':', mt.move_status, ':', to_char(now(), 'YYYYMMDD'))
  from momentum_targets mt
  on conflict (dedupe_key) do nothing;

  get diagnostics v_notified_count = row_count;

  return jsonb_build_object(
    'ok', true,
    'updated_events', v_updated_count,
    'notifications_created', v_notified_count,
    'computed_at', now(),
    'timezone', p_tz
  );
end;
$$;

revoke all on function public.refresh_event_move_scores(text) from public;
grant execute on function public.refresh_event_move_scores(text) to authenticated;

commit;
