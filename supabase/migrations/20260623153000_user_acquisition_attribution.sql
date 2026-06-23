begin;

create table if not exists public.user_acquisition_attribution (
  user_id uuid primary key references auth.users(id) on delete cascade,
  captured_at timestamptz not null default now(),
  landing_path text not null,
  landing_url text null,
  referrer text null,
  utm_source text null,
  utm_medium text null,
  utm_campaign text null,
  utm_term text null,
  utm_content text null,
  fbclid text null,
  gclid text null,
  ttclid text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_acquisition_attribution_captured_at_idx
  on public.user_acquisition_attribution (captured_at desc);

create index if not exists user_acquisition_attribution_source_campaign_idx
  on public.user_acquisition_attribution (utm_source, utm_campaign, captured_at desc);

alter table public.user_acquisition_attribution enable row level security;

drop policy if exists "uaa_read_self_or_admin" on public.user_acquisition_attribution;
create policy "uaa_read_self_or_admin"
on public.user_acquisition_attribution
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "uaa_insert_self_or_admin" on public.user_acquisition_attribution;
create policy "uaa_insert_self_or_admin"
on public.user_acquisition_attribution
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "uaa_update_admin_only" on public.user_acquisition_attribution;
create policy "uaa_update_admin_only"
on public.user_acquisition_attribution
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "uaa_delete_admin_only" on public.user_acquisition_attribution;
create policy "uaa_delete_admin_only"
on public.user_acquisition_attribution
for delete
to authenticated
using (public.is_admin());

commit;
