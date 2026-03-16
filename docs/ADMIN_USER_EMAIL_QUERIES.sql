-- Admin user lookup queries
-- Use in the Supabase SQL editor.

-- 1) Total users
select count(*) as total_users
from public.profiles;

-- 2) User list with profile name + email
select
  p.id as user_id,
  coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'No profile name') as profile_name,
  coalesce(nullif(trim(u.email), ''), nullif(trim(p.email), ''), 'No email') as email,
  p.created_at as signed_up_at
from public.profiles p
left join auth.users u
  on u.id = p.id
order by p.created_at desc;
