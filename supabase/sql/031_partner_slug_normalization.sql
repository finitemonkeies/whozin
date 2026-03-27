begin;

update public.profiles
set partner_slug = nullif(
  regexp_replace(
    lower(trim(coalesce(partner_slug, ''))),
    '(^-+|-+$)|[^a-z0-9]+',
    '-',
    'g'
  ),
  ''
)
where partner_slug is not null;

drop index if exists public.profiles_partner_slug_idx;

create unique index if not exists profiles_partner_slug_lower_idx
  on public.profiles (lower(partner_slug))
  where partner_slug is not null;

commit;
