create or replace function public.get_admin_sync_health()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce((auth.jwt() ->> 'email'), auth.email(), ''));
  v_job record;
  v_last_run record;
  v_sources jsonb := '[]'::jsonb;
  v_latest_source_stats jsonb := '[]'::jsonb;
  v_upcoming_total integer := 0;
  v_move_scored_total integer := 0;
begin
  if v_email not in ('hello@whozin.app', 'jvincenthallahan@gmail.com') then
    raise exception 'forbidden';
  end if;

  select jobid, jobname, schedule, active
    into v_job
  from cron.job
  where jobname = 'sync-bay-area-events-daily'
  order by jobid desc
  limit 1;

  if v_job.jobid is not null then
    select jobid, status, return_message, start_time, end_time
      into v_last_run
    from cron.job_run_details
    where jobid = v_job.jobid
    order by start_time desc
    limit 1;
  end if;

  select count(*)
    into v_upcoming_total
  from public.events
  where coalesce(event_end_date, event_date) >= now();

  select count(*)
    into v_move_scored_total
  from public.events
  where coalesce(event_end_date, event_date) >= now()
    and move_score is not null;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'source', source,
        'total', total,
        'upcoming', upcoming,
        'with_image', with_image,
        'with_ticket', with_ticket,
        'next_event_at', next_event_at,
        'coverage_status',
        case
          when upcoming = 0 then 'missing'
          when next_event_at is null then 'stale'
          when next_event_at > now() + interval '21 days' then 'stale'
          when with_image = 0 then 'thin'
          else 'healthy'
        end,
        'image_pct',
        case when total > 0 then round((with_image::numeric / total::numeric) * 100, 1) else 0 end,
        'ticket_pct',
        case when total > 0 then round((with_ticket::numeric / total::numeric) * 100, 1) else 0 end
      )
      order by upcoming desc, total desc, source asc
    ),
    '[]'::jsonb
  )
    into v_sources
  from (
    select
      coalesce(nullif(trim(event_source), ''), 'internal') as source,
      count(*)::int as total,
      count(*) filter (where coalesce(event_end_date, event_date) >= now())::int as upcoming,
      count(*) filter (where nullif(trim(coalesce(image_url, '')), '') is not null)::int as with_image,
      count(*) filter (where nullif(trim(coalesce(ticket_url, '')), '') is not null)::int as with_ticket,
      min(event_date) filter (where coalesce(event_end_date, event_date) >= now()) as next_event_at
    from public.events
    group by 1
  ) source_rollup;

  select coalesce(
    (
      select s.source_stats
      from public.sync_run_summaries s
      where s.sync_name = 'sync-bay-area-events'
      order by s.started_at desc
      limit 1
    ),
    '[]'::jsonb
  )
    into v_latest_source_stats;

  return jsonb_build_object(
    'job',
    case
      when v_job.jobid is null then null
      else jsonb_build_object(
        'job_id', v_job.jobid,
        'job_name', v_job.jobname,
        'schedule', v_job.schedule,
        'active', v_job.active
      )
    end,
    'last_run',
    case
      when v_last_run.jobid is null then null
      else jsonb_build_object(
        'status', v_last_run.status,
        'return_message', v_last_run.return_message,
        'start_time', v_last_run.start_time,
        'end_time', v_last_run.end_time
      )
    end,
    'upcoming_total', v_upcoming_total,
    'move_scored_upcoming', v_move_scored_total,
    'sources', v_sources,
    'latest_source_stats', v_latest_source_stats
  );
end;
$$;

revoke all on function public.get_admin_sync_health() from public;
grant execute on function public.get_admin_sync_health() to authenticated;

comment on function public.get_admin_sync_health() is
  'Returns scheduler state, latest cron run, and source freshness coverage for the admin health page.';
