begin;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text null,
  platform text null,
  permission_state text not null default 'granted',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz null
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id, disabled_at, last_seen_at desc);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push_subscriptions_read_own" on public.push_subscriptions;
create policy "push_subscriptions_read_own"
on public.push_subscriptions
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "push_subscriptions_insert_own" on public.push_subscriptions;
create policy "push_subscriptions_insert_own"
on public.push_subscriptions
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "push_subscriptions_update_own" on public.push_subscriptions;
create policy "push_subscriptions_update_own"
on public.push_subscriptions
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "push_subscriptions_delete_own" on public.push_subscriptions;
create policy "push_subscriptions_delete_own"
on public.push_subscriptions
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin());

create table if not exists public.push_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  status text not null default 'sent',
  error text null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (notification_id, subscription_id)
);

create index if not exists push_notification_deliveries_notification_idx
  on public.push_notification_deliveries (notification_id, sent_at desc);

alter table public.push_notification_deliveries enable row level security;

drop policy if exists "push_notification_deliveries_admin_read" on public.push_notification_deliveries;
create policy "push_notification_deliveries_admin_read"
on public.push_notification_deliveries
for select
to authenticated
using (public.is_admin());

drop policy if exists "push_notification_deliveries_no_client_insert" on public.push_notification_deliveries;
create policy "push_notification_deliveries_no_client_insert"
on public.push_notification_deliveries
for insert
to authenticated
with check (false);

drop policy if exists "push_notification_deliveries_no_client_update" on public.push_notification_deliveries;
create policy "push_notification_deliveries_no_client_update"
on public.push_notification_deliveries
for update
to authenticated
using (false)
with check (false);

drop policy if exists "push_notification_deliveries_no_client_delete" on public.push_notification_deliveries;
create policy "push_notification_deliveries_no_client_delete"
on public.push_notification_deliveries
for delete
to authenticated
using (false);

commit;
