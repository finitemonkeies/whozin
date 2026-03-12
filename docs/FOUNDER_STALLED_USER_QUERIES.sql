-- Founder follow-up queries for the first 100 users.
-- Goal: spot users who signed up but did not complete the core loop:
-- add one friend -> RSVP to one event -> send one invite.

-- 1. Signed up, but have not added a friend.
select
  p.id as user_id,
  p.username,
  p.display_name,
  p.created_at as signed_up_at
from public.profiles p
left join public.friendships f
  on f.user_id = p.id
  and coalesce(f.status, 'accepted') in ('accepted', 'pending')
where p.created_at >= now() - interval '14 days'
group by p.id, p.username, p.display_name, p.created_at
having count(f.friend_id) = 0
order by p.created_at desc;

-- 2. Has a friend connection, but has not RSVPed.
select
  p.id as user_id,
  p.username,
  p.display_name,
  max(f.created_at) as last_friend_activity_at
from public.profiles p
join public.friendships f
  on f.user_id = p.id
  and coalesce(f.status, 'accepted') in ('accepted', 'pending')
left join public.attendees a
  on a.user_id = p.id
where p.created_at >= now() - interval '14 days'
group by p.id, p.username, p.display_name
having count(a.event_id) = 0
order by last_friend_activity_at desc nulls last;

-- 3. RSVPed, but never sent an invite.
select
  p.id as user_id,
  p.username,
  p.display_name,
  max(a.created_at) as last_rsvp_at
from public.profiles p
join public.attendees a
  on a.user_id = p.id
left join public.product_events pe
  on pe.user_id = p.id
  and pe.event_name = 'invite_sent'
where p.created_at >= now() - interval '14 days'
group by p.id, p.username, p.display_name
having count(pe.id) = 0
order by last_rsvp_at desc nulls last;

-- 4. Lightweight founder queue with suggested follow-up angle.
with friend_counts as (
  select
    f.user_id,
    count(*) filter (where coalesce(f.status, 'accepted') in ('accepted', 'pending')) as friend_edges
  from public.friendships f
  group by f.user_id
),
rsvp_counts as (
  select
    a.user_id,
    count(*) as rsvps,
    max(a.created_at) as last_rsvp_at
  from public.attendees a
  group by a.user_id
),
invite_counts as (
  select
    pe.user_id,
    count(*) filter (where pe.event_name = 'invite_sent') as invites_sent
  from public.product_events pe
  group by pe.user_id
)
select
  p.id as user_id,
  p.username,
  p.display_name,
  p.created_at as signed_up_at,
  coalesce(fc.friend_edges, 0) as friend_edges,
  coalesce(rc.rsvps, 0) as rsvps,
  coalesce(ic.invites_sent, 0) as invites_sent,
  case
    when coalesce(fc.friend_edges, 0) = 0 then 'Ask them to add one friend they actually go out with.'
    when coalesce(rc.rsvps, 0) = 0 then 'Send one event recommendation and ask for a first RSVP.'
    when coalesce(ic.invites_sent, 0) = 0 then 'Ask them to send one event to the friend most likely to say yes.'
    else 'Healthy enough for now.'
  end as founder_follow_up
from public.profiles p
left join friend_counts fc on fc.user_id = p.id
left join rsvp_counts rc on rc.user_id = p.id
left join invite_counts ic on ic.user_id = p.id
where p.created_at >= now() - interval '14 days'
  and (
    coalesce(fc.friend_edges, 0) = 0
    or coalesce(rc.rsvps, 0) = 0
    or coalesce(ic.invites_sent, 0) = 0
  )
order by p.created_at desc;
