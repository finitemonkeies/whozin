-- Whozin acquisition attribution queries
-- Requires:
-- 1) public.user_acquisition_attribution
-- 2) public.user_acquisition_attribution_report

-- 1) Campaign performance summary (last 90 days)
select
  utm_source,
  utm_medium,
  utm_campaign,
  nullif(utm_content, '') as utm_content,
  count(*) as attributed_users,
  count(*) filter (where onboarding_complete) as onboarded_users,
  count(*) filter (where activated_rsvp_7d) as rsvp_7d_users,
  count(*) filter (where added_friend_7d) as friend_7d_users,
  count(*) filter (where invited_7d) as invite_7d_users,
  count(*) filter (where ticket_click_7d) as ticket_click_7d_users,
  count(*) filter (where retained_d7) as retained_d7_users,
  round(100.0 * count(*) filter (where onboarding_complete) / nullif(count(*), 0), 2) as onboarded_rate_pct,
  round(100.0 * count(*) filter (where activated_rsvp_7d) / nullif(count(*), 0), 2) as rsvp_7d_rate_pct,
  round(100.0 * count(*) filter (where invited_7d) / nullif(count(*), 0), 2) as invite_7d_rate_pct,
  round(100.0 * count(*) filter (where retained_d7) / nullif(count(*), 0), 2) as retained_d7_rate_pct
from public.user_acquisition_attribution_report
where profile_created_at >= now() - interval '90 days'
group by 1, 2, 3, 4
order by rsvp_7d_users desc, attributed_users desc, utm_source asc, utm_campaign asc;

-- 2) Channel-level summary (last 90 days)
select
  utm_source,
  utm_medium,
  count(*) as attributed_users,
  count(*) filter (where activated_rsvp_7d) as rsvp_7d_users,
  count(*) filter (where invited_7d) as invite_7d_users,
  count(*) filter (where retained_d7) as retained_d7_users,
  round(100.0 * count(*) filter (where activated_rsvp_7d) / nullif(count(*), 0), 2) as rsvp_7d_rate_pct,
  round(100.0 * count(*) filter (where retained_d7) / nullif(count(*), 0), 2) as retained_d7_rate_pct
from public.user_acquisition_attribution_report
where profile_created_at >= now() - interval '90 days'
group by 1, 2
order by attributed_users desc, rsvp_7d_users desc;

-- 3) Recent attributed users with first-week outcomes (last 30 days)
select
  profile_created_at,
  user_id,
  utm_source,
  utm_medium,
  utm_campaign,
  nullif(utm_content, '') as utm_content,
  landing_path,
  onboarding_complete,
  activated_rsvp_7d,
  added_friend_7d,
  invited_7d,
  ticket_click_7d,
  retained_d7,
  first_rsvp_at,
  first_friend_add_at,
  first_invite_at,
  first_ticket_click_at
from public.user_acquisition_attribution_report
where profile_created_at >= now() - interval '30 days'
order by profile_created_at desc
limit 200;
