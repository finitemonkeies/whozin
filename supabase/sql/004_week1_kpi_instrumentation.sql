begin;

alter table public.attendees
  add column if not exists rsvp_source text;

alter table public.events
  add column if not exists event_source text;

update public.events
set event_source = 'internal'
where coalesce(trim(event_source), '') = '';

alter table public.events
  alter column event_source set default 'internal';

create index if not exists attendees_created_at_idx
  on public.attendees (created_at);

create index if not exists attendees_rsvp_source_created_at_idx
  on public.attendees (rsvp_source, created_at);

create index if not exists events_event_source_idx
  on public.events (event_source);

commit;
