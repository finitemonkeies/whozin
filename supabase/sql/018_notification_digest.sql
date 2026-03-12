begin;

create or replace function public.list_notification_digest(
  p_limit integer default 30
)
returns table (
  id uuid,
  type text,
  title text,
  body text,
  cta_path text,
  read_at timestamptz,
  created_at timestamptz,
  event_id uuid,
  group_key text
)
language sql
security definer
set search_path = public
as $$
  with raw as (
    select
      n.id,
      n.type,
      n.title,
      n.body,
      n.cta_path,
      n.read_at,
      n.created_at,
      n.event_id
    from public.notifications n
    where n.user_id = auth.uid()
    order by n.created_at desc
    limit greatest(coalesce(p_limit, 30) * 4, 60)
  ),
  grouped_friends as (
    select
      (array_agg(r.id order by r.created_at desc))[1] as id,
      case when count(*) > 1 then 'friend_joined_event_burst' else 'friend_joined_event' end as type,
      case
        when count(*) > 1 then concat(count(*), ' friends are going out')
        else max(r.title)
      end as title,
      case
        when count(*) > 1 then concat(count(*), ' people in your circle are locking in for the same event.')
        else max(r.body)
      end as body,
      max(r.cta_path) as cta_path,
      case when bool_and(r.read_at is not null) then max(r.read_at) else null end as read_at,
      max(r.created_at) as created_at,
      r.event_id,
      concat('friend_joined_event_burst:', r.event_id::text, ':', (max(r.created_at) at time zone 'UTC')::date::text) as group_key,
      220 as priority
    from raw r
    where r.type = 'friend_joined_event'
      and r.event_id is not null
    group by r.event_id, (r.created_at at time zone 'UTC')::date
  ),
  friend_singletons as (
    select
      g.id,
      g.type,
      g.title,
      g.body,
      g.cta_path,
      g.read_at,
      g.created_at,
      g.event_id,
      case when g.type = 'friend_joined_event_burst' then g.group_key else null end as group_key,
      g.priority
    from grouped_friends g
  ),
  primary_rows as (
    select
      r.id,
      r.type,
      r.title,
      r.body,
      r.cta_path,
      r.read_at,
      r.created_at,
      r.event_id,
      null::text as group_key,
      case
        when r.type = 'event_momentum' then 300
        when r.type = 'post_rsvp_invite_nudge' then 80
        else 140
      end as priority
    from raw r
    where r.type <> 'friend_joined_event'
  ),
  newest_nudge as (
    select *
    from primary_rows
    where type = 'post_rsvp_invite_nudge'
    order by created_at desc
    limit 1
  ),
  non_nudge_rows as (
    select *
    from primary_rows
    where type <> 'post_rsvp_invite_nudge'

    union all

    select *
    from friend_singletons
  ),
  unread_signal_count as (
    select count(*)::int as value
    from non_nudge_rows
    where read_at is null
  ),
  final_rows as (
    select *
    from non_nudge_rows

    union all

    select n.*
    from newest_nudge n
    cross join unread_signal_count usc
    where usc.value < 3
  )
  select
    f.id,
    f.type,
    f.title,
    f.body,
    f.cta_path,
    f.read_at,
    f.created_at,
    f.event_id,
    f.group_key
  from final_rows f
  order by
    f.priority desc,
    case when f.read_at is null then 0 else 1 end,
    f.created_at desc
  limit greatest(coalesce(p_limit, 30), 1);
$$;

create or replace function public.get_unread_notification_digest_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.list_notification_digest(120)
  where read_at is null;
$$;

create or replace function public.mark_notification_digest_read(
  p_notification_id uuid default null,
  p_group_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_bucket_date date;
begin
  if p_group_key is not null and p_group_key like 'friend_joined_event_burst:%' then
    v_event_id := nullif(split_part(p_group_key, ':', 2), '')::uuid;
    v_bucket_date := nullif(split_part(p_group_key, ':', 3), '')::date;

    update public.notifications
    set read_at = coalesce(read_at, now())
    where user_id = auth.uid()
      and type = 'friend_joined_event'
      and event_id = v_event_id
      and (created_at at time zone 'UTC')::date = v_bucket_date
      and read_at is null;

    return;
  end if;

  if p_notification_id is null then
    return;
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where user_id = auth.uid()
    and id = p_notification_id
    and read_at is null;
end;
$$;

revoke all on function public.list_notification_digest(integer) from public;
grant execute on function public.list_notification_digest(integer) to authenticated;

revoke all on function public.get_unread_notification_digest_count() from public;
grant execute on function public.get_unread_notification_digest_count() to authenticated;

revoke all on function public.mark_notification_digest_read(uuid, text) from public;
grant execute on function public.mark_notification_digest_read(uuid, text) to authenticated;

comment on function public.list_notification_digest(integer) is
  'Returns a prioritized notification feed with grouped friend RSVP bursts and nudge suppression.';

comment on function public.get_unread_notification_digest_count() is
  'Returns the unread count for the prioritized notification digest.';

comment on function public.mark_notification_digest_read(uuid, text) is
  'Marks a digest notification read, including grouped friend RSVP bursts.';

commit;
