-- Last 24h funnel totals
select
  event_name,
  count(*) as events_24h
from public.product_events
where created_at >= now() - interval '24 hours'
  and event_name in (
    'event_detail_view',
    'invite_sent',
    'invite_link_copied',
    'invite_signup_completed',
    'invite_rsvp_completed'
  )
group by 1
order by 2 desc;

-- Client analytics events from external sinks should include:
-- login_success, event_view, rsvp_success, rsvp_failed, invite_copy, invite_share, friend_add
-- (If you mirror them into product_events later, add them to query above.)

-- Error sink (frontend + edge) last 24h
select
  surface,
  kind,
  count(*) as errors_24h
from public.app_error_logs
where created_at >= now() - interval '24 hours'
group by 1, 2
order by errors_24h desc;

-- Top recent errors
select
  created_at,
  surface,
  kind,
  message,
  context
from public.app_error_logs
order by created_at desc
limit 100;
