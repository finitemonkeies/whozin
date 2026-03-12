create extension if not exists pg_cron;
create extension if not exists pg_net;
create extension if not exists vault;

create or replace function public.schedule_sync_bay_area_events_daily(
  p_cron text default '15 16 * * *',
  p_tz text default 'America/Chicago'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_url text;
  v_service_role_key text;
  v_job_id bigint;
  v_existing_job record;
begin
  select decrypted_secret
    into v_project_url
  from vault.decrypted_secrets
  where name = 'project_url'
  order by created_at desc
  limit 1;

  select decrypted_secret
    into v_service_role_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  order by created_at desc
  limit 1;

  if v_project_url is null or v_service_role_key is null then
    raise exception
      'Missing vault secrets project_url and/or service_role_key. Create them first, then rerun public.schedule_sync_bay_area_events_daily().';
  end if;

  for v_existing_job in
    select jobid
    from cron.job
    where jobname = 'sync-bay-area-events-daily'
  loop
    perform cron.unschedule(v_existing_job.jobid);
  end loop;

  v_job_id := cron.schedule(
    'sync-bay-area-events-daily',
    p_cron,
    format(
      $job$
      select
        net.http_post(
          url := %L,
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || %L
          ),
          body := %L::jsonb
        );
      $job$,
      v_project_url || '/functions/v1/sync-bay-area-events',
      v_service_role_key,
      json_build_object('tz', p_tz)::text
    )
  );

  return v_job_id;
end;
$$;

comment on function public.schedule_sync_bay_area_events_daily(text, text) is
  'Schedules the sync-bay-area-events edge function to run daily. Cron is UTC. Default 16:15 UTC is 11:15 AM America/Chicago during daylight saving time.';
