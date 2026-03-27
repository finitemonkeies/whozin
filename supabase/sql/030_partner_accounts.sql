begin;

alter table public.profiles
  add column if not exists account_type text not null default 'person',
  add column if not exists partner_type text,
  add column if not exists partner_status text not null default 'none',
  add column if not exists partner_badge_label text,
  add column if not exists partner_slug text,
  add column if not exists partner_contact_email text,
  add column if not exists partner_instagram_url text,
  add column if not exists partner_website_url text,
  add column if not exists partner_bio_short text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_account_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_account_type_check
      check (account_type in ('person', 'partner'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_partner_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_partner_type_check
      check (
        partner_type is null
        or partner_type in ('promoter', 'venue', 'collective', 'dj', 'artist', 'brand')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_partner_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_partner_status_check
      check (partner_status in ('none', 'invited', 'active'));
  end if;
end $$;

create unique index if not exists profiles_partner_slug_idx
  on public.profiles (partner_slug)
  where partner_slug is not null;

alter table public.events
  add column if not exists organizer_profile_id uuid references public.profiles(id) on delete set null;

create index if not exists events_organizer_profile_id_idx
  on public.events (organizer_profile_id, event_date desc);

commit;
