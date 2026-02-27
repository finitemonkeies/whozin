-- Remove friend-request throttling to keep add flows immediate.
-- Keeps RSVP throttling from 003_server_rate_limits.sql intact.

begin;

drop trigger if exists friendships_rate_limit_insert on public.friendships;
drop function if exists public.tg_rate_limit_friendships_insert();

commit;
