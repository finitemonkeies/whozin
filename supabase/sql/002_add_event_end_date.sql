-- Support multi-day events.
alter table if exists public.events
add column if not exists event_end_date timestamptz null;

create index if not exists events_event_end_date_idx
on public.events (event_end_date);
