begin;

create index if not exists events_city_event_date_idx
  on public.events (city, event_date asc nulls last);

create index if not exists events_moderation_city_event_date_idx
  on public.events (moderation_status, city, event_date asc nulls last);

create index if not exists events_moderation_event_date_idx
  on public.events (moderation_status, event_date asc nulls last);

create index if not exists attendees_event_id_created_at_idx
  on public.attendees (event_id, created_at desc);

create index if not exists attendees_event_id_user_id_idx
  on public.attendees (event_id, user_id);

commit;
