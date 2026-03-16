create or replace function public.get_admin_push_health()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(coalesce((auth.jwt() ->> 'email'), auth.email(), ''));
  v_active_subscriptions integer := 0;
  v_disabled_subscriptions integer := 0;
  v_recent_24h integer := 0;
  v_recent_7d integer := 0;
  v_sent_24h integer := 0;
  v_failed_24h integer := 0;
  v_opens_24h integer := 0;
  v_opens_7d integer := 0;
  v_open_rate_7d numeric := 0;
  v_rsvp_after_open_7d integer := 0;
  v_invite_after_open_7d integer := 0;
  v_platforms jsonb := '[]'::jsonb;
  v_top_types jsonb := '[]'::jsonb;
  v_recent_errors jsonb := '[]'::jsonb;
begin
  if v_email not in ('hello@whozin.app', 'jvincenthallahan@gmail.com') then
    raise exception 'forbidden';
  end if;

  select count(*)
    into v_active_subscriptions
  from public.push_subscriptions
  where disabled_at is null
    and permission_state = 'granted';

  select count(*)
    into v_disabled_subscriptions
  from public.push_subscriptions
  where disabled_at is not null
     or permission_state <> 'granted';

  select count(*)
    into v_recent_24h
  from public.push_notification_deliveries
  where sent_at >= now() - interval '24 hours';

  select count(*)
    into v_recent_7d
  from public.push_notification_deliveries
  where sent_at >= now() - interval '7 days';

  select count(*) filter (where status = 'sent'),
         count(*) filter (where status <> 'sent')
    into v_sent_24h, v_failed_24h
  from public.push_notification_deliveries
  where sent_at >= now() - interval '24 hours';

  select count(*)
    into v_opens_24h
  from public.product_events
  where event_name = 'push_opened'
    and created_at >= now() - interval '24 hours';

  select count(*)
    into v_opens_7d
  from public.product_events
  where event_name = 'push_opened'
    and created_at >= now() - interval '7 days';

  v_open_rate_7d :=
    case
      when v_recent_7d > 0 then round((v_opens_7d::numeric / v_recent_7d::numeric) * 100, 1)
      else 0
    end;

  with recent_push_opens as (
    select id, user_id, created_at
    from public.product_events
    where event_name = 'push_opened'
      and created_at >= now() - interval '7 days'
  )
  select
    count(*) filter (
      where exists (
        select 1
        from public.attendees a
        where a.user_id = rpo.user_id
          and a.created_at >= rpo.created_at
          and a.created_at < rpo.created_at + interval '24 hours'
      )
    )::int,
    count(*) filter (
      where exists (
        select 1
        from public.product_events pe
        where pe.user_id = rpo.user_id
          and pe.event_name = 'invite_sent'
          and pe.created_at >= rpo.created_at
          and pe.created_at < rpo.created_at + interval '24 hours'
      )
    )::int
  into v_rsvp_after_open_7d, v_invite_after_open_7d
  from recent_push_opens rpo;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'platform', platform,
        'active', active_count,
        'disabled', disabled_count
      )
      order by active_count desc, disabled_count desc, platform asc
    ),
    '[]'::jsonb
  )
    into v_platforms
  from (
    select
      coalesce(nullif(trim(platform), ''), 'unknown') as platform,
      count(*) filter (where disabled_at is null and permission_state = 'granted')::int as active_count,
      count(*) filter (where disabled_at is not null or permission_state <> 'granted')::int as disabled_count
    from public.push_subscriptions
    group by 1
  ) platform_rollup;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'type', type,
        'sent', sent_count,
        'failed', failed_count
      )
      order by sent_count desc, failed_count desc, type asc
    ),
    '[]'::jsonb
  )
    into v_top_types
  from (
    select
      n.type,
      count(*) filter (where d.status = 'sent')::int as sent_count,
      count(*) filter (where d.status <> 'sent')::int as failed_count
    from public.push_notification_deliveries d
    join public.notifications n on n.id = d.notification_id
    where d.sent_at >= now() - interval '7 days'
    group by 1
    order by sent_count desc, failed_count desc, n.type asc
    limit 6
  ) type_rollup;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'sent_at', sent_at,
        'status', status,
        'error', error,
        'type', type,
        'platform', platform
      )
      order by sent_at desc
    ),
    '[]'::jsonb
  )
    into v_recent_errors
  from (
    select
      d.sent_at,
      d.status,
      d.error,
      n.type,
      coalesce(nullif(trim(s.platform), ''), 'unknown') as platform
    from public.push_notification_deliveries d
    join public.notifications n on n.id = d.notification_id
    join public.push_subscriptions s on s.id = d.subscription_id
    where d.status <> 'sent'
    order by d.sent_at desc
    limit 8
  ) recent_failures;

  return jsonb_build_object(
    'active_subscriptions', v_active_subscriptions,
    'disabled_subscriptions', v_disabled_subscriptions,
    'deliveries_24h', v_recent_24h,
    'deliveries_7d', v_recent_7d,
    'sent_24h', v_sent_24h,
    'failed_24h', v_failed_24h,
    'opens_24h', v_opens_24h,
    'opens_7d', v_opens_7d,
    'open_rate_7d', v_open_rate_7d,
    'rsvp_after_open_7d', v_rsvp_after_open_7d,
    'invite_after_open_7d', v_invite_after_open_7d,
    'platforms', v_platforms,
    'top_types', v_top_types,
    'recent_errors', v_recent_errors
  );
end;
$$;

revoke all on function public.get_admin_push_health() from public;
grant execute on function public.get_admin_push_health() to authenticated;

comment on function public.get_admin_push_health() is
  'Returns admin push subscription and delivery health metrics.';
