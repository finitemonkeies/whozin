alter table public.events
  add column if not exists moderation_status text not null default 'approved',
  add column if not exists moderation_note text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'events_moderation_status_check'
  ) then
    alter table public.events
      add constraint events_moderation_status_check
      check (moderation_status in ('approved', 'quarantined'));
  end if;
end
$$;

update public.events
set moderation_status = 'approved'
where moderation_status is null
   or trim(moderation_status) = '';

create index if not exists events_moderation_status_idx
  on public.events (moderation_status);
