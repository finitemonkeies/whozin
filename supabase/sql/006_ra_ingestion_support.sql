begin;

alter table public.events
  add column if not exists source_event_id text,
  add column if not exists ticket_url text,
  add column if not exists venue_name text,
  add column if not exists city text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists external_url text;

create unique index if not exists events_event_source_source_event_id_uidx
  on public.events (event_source, source_event_id)
  where source_event_id is not null;

create index if not exists events_source_event_id_idx
  on public.events (source_event_id);

create index if not exists events_city_idx
  on public.events (city);

commit;
