create table if not exists public.sync_run_summaries (
  id uuid primary key default gen_random_uuid(),
  sync_name text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz not null default now(),
  timezone text not null default 'America/Chicago',
  status text not null default 'succeeded',
  totals jsonb not null default '{}'::jsonb,
  upsert jsonb not null default '{}'::jsonb,
  source_errors jsonb not null default '[]'::jsonb,
  source_stats jsonb not null default '[]'::jsonb,
  source_debug jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists sync_run_summaries_sync_name_started_at_idx
  on public.sync_run_summaries (sync_name, started_at desc);

alter table public.sync_run_summaries enable row level security;

drop policy if exists "sync_run_summaries_admin_select" on public.sync_run_summaries;
create policy "sync_run_summaries_admin_select"
on public.sync_run_summaries
for select
to authenticated
using (
  lower(coalesce((auth.jwt() ->> 'email'), auth.email(), '')) in ('hello@whozin.app', 'jvincenthallahan@gmail.com')
);

drop policy if exists "sync_run_summaries_service_insert" on public.sync_run_summaries;
create policy "sync_run_summaries_service_insert"
on public.sync_run_summaries
for insert
to authenticated
with check (
  lower(coalesce((auth.jwt() ->> 'role'), '')) in ('service_role', 'supabase_admin')
  or lower(coalesce(current_setting('request.jwt.claim.role', true), '')) in ('service_role', 'supabase_admin')
);

comment on table public.sync_run_summaries is
  'Latest sync run summaries for admin observability, including per-source contribution metrics.';
