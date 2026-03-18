begin;

create or replace function public.users_are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.user_id = a and f.friend_id = b)
        or
        (f.user_id = b and f.friend_id = a)
      )
  );
$$;

create or replace function public.users_are_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_blocks ub
    where
      (ub.blocker_user_id = a and ub.blocked_user_id = b)
      or
      (ub.blocker_user_id = b and ub.blocked_user_id = a)
  );
$$;

revoke all on function public.users_are_friends(uuid, uuid) from public;
grant execute on function public.users_are_friends(uuid, uuid) to authenticated;

revoke all on function public.users_are_blocked(uuid, uuid) from public;
grant execute on function public.users_are_blocked(uuid, uuid) to authenticated;

commit;
