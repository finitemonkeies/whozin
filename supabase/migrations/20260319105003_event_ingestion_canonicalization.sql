begin;

create table if not exists public.event_source_aliases (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  event_source text not null,
  source_event_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists event_source_aliases_source_uidx
  on public.event_source_aliases (event_source, source_event_id);

create index if not exists event_source_aliases_event_id_idx
  on public.event_source_aliases (event_id, updated_at desc);

insert into public.event_source_aliases (event_id, event_source, source_event_id)
select e.id, e.event_source, e.source_event_id
from public.events e
where nullif(trim(coalesce(e.event_source, '')), '') is not null
  and nullif(trim(coalesce(e.source_event_id, '')), '') is not null
on conflict (event_source, source_event_id) do update
set event_id = excluded.event_id,
    updated_at = now();

create or replace function public.event_source_rank(p_source text)
returns integer
language sql
immutable
as $$
  select case lower(trim(coalesce(p_source, '')))
    when '' then 4
    when 'internal' then 4
    when 'shotgun' then 2
    when '19hz' then 1
    else 0
  end
$$;

create or replace function public.normalize_event_match_text(p_value text)
returns text
language sql
immutable
as $$
  select trim(
    regexp_replace(
      regexp_replace(
        regexp_replace(
          lower(coalesce(p_value, '')),
          '&', ' and ', 'g'
        ),
        '\m(ft|feat)\.?\M', ' featuring ', 'gi'
      ),
      '[^a-z0-9]+', ' ', 'g'
    )
  )
$$;

create or replace function public.normalize_event_match_compact(p_value text)
returns text
language sql
immutable
as $$
  select regexp_replace(public.normalize_event_match_text(p_value), '[^a-z0-9]+', '', 'g')
$$;

create or replace function public.event_title_tokens(p_value text)
returns text[]
language sql
immutable
as $$
  with tokens as (
    select token
    from unnest(regexp_split_to_array(public.normalize_event_match_text(p_value), '\s+')) token
    where token <> ''
      and (
        length(token) > 1
        or token ~ '^\d+$'
      )
      and token <> all(array[
        'a','an','and','at','by','dj','edition','event','for','in','live','night',
        'official','party','presents','presented','show','special','the','tour','with'
      ]::text[])
  )
  select coalesce(array_agg(distinct token), array[]::text[]) from tokens
$$;

create or replace function public.event_location_tokens(p_location text, p_city text)
returns text[]
language sql
immutable
as $$
  with tokens as (
    select token
    from unnest(
      regexp_split_to_array(
        public.normalize_event_match_text(concat_ws(' ', coalesce(p_location, ''), coalesce(p_city, ''))),
        '\s+'
      )
    ) token
    where token <> ''
      and (
        length(token) > 1
        or token ~ '^\d+$'
      )
      and token <> all(array['bar','center','club','hall','lounge','room','stage','the','venue']::text[])
  )
  select coalesce(array_agg(distinct token), array[]::text[]) from tokens
$$;

create or replace function public.event_token_overlap_count(p_left text[], p_right text[])
returns integer
language sql
immutable
as $$
  select count(*)
  from (
    select distinct unnest(coalesce(p_left, array[]::text[]))
    intersect
    select distinct unnest(coalesce(p_right, array[]::text[]))
  ) overlap
$$;

create or replace function public.event_token_containment_ratio(p_left text[], p_right text[])
returns numeric
language sql
immutable
as $$
  select case
    when least(cardinality(coalesce(p_left, array[]::text[])), cardinality(coalesce(p_right, array[]::text[]))) = 0
      then 0
    else public.event_token_overlap_count(p_left, p_right)::numeric
      / least(cardinality(coalesce(p_left, array[]::text[])), cardinality(coalesce(p_right, array[]::text[])))::numeric
  end
$$;

create or replace function public.event_titles_similar(p_left text, p_right text)
returns boolean
language sql
immutable
as $$
  with normalized as (
    select
      public.normalize_event_match_text(p_left) as left_text,
      public.normalize_event_match_text(p_right) as right_text,
      public.normalize_event_match_compact(p_left) as left_compact,
      public.normalize_event_match_compact(p_right) as right_compact,
      public.event_title_tokens(p_left) as left_tokens,
      public.event_title_tokens(p_right) as right_tokens
  ),
  scored as (
    select *,
      public.event_token_overlap_count(left_tokens, right_tokens) as overlap_count,
      public.event_token_containment_ratio(left_tokens, right_tokens) as containment_ratio
    from normalized
  )
  select
    left_text <> ''
    and right_text <> ''
    and (
      left_text = right_text
      or (
        least(length(left_compact), length(right_compact)) >= 6
        and (
          left_compact = right_compact
          or left_compact like '%' || right_compact || '%'
          or right_compact like '%' || left_compact || '%'
        )
      )
      or (
        overlap_count >= 2
        and containment_ratio >= 0.75
      )
      or (
        overlap_count >= 3
        and containment_ratio >= 0.60
      )
    )
  from scored
$$;

create or replace function public.event_locations_compatible(
  p_left_location text,
  p_left_city text,
  p_right_location text,
  p_right_city text
)
returns boolean
language sql
immutable
as $$
  with normalized as (
    select
      public.normalize_event_match_text(concat_ws(' ', coalesce(p_left_location, ''), coalesce(p_left_city, ''))) as left_text,
      public.normalize_event_match_text(concat_ws(' ', coalesce(p_right_location, ''), coalesce(p_right_city, ''))) as right_text,
      public.normalize_event_match_compact(concat_ws(' ', coalesce(p_left_location, ''), coalesce(p_left_city, ''))) as left_compact,
      public.normalize_event_match_compact(concat_ws(' ', coalesce(p_right_location, ''), coalesce(p_right_city, ''))) as right_compact,
      public.event_location_tokens(p_left_location, p_left_city) as left_tokens,
      public.event_location_tokens(p_right_location, p_right_city) as right_tokens
  )
  select
    case
      when left_text = '' and right_text = '' then false
      when left_text = '' or right_text = '' then true
      when left_text = right_text then true
      when left_compact <> '' and left_compact = right_compact then true
      else (
        public.event_token_overlap_count(left_tokens, right_tokens) >= 1
        and public.event_token_containment_ratio(left_tokens, right_tokens) >= 0.60
      )
    end
  from normalized
$$;

create or replace function public.event_record_quality(
  p_source text,
  p_ticket_url text,
  p_image_url text,
  p_description text,
  p_location text
)
returns integer
language sql
immutable
as $$
  select
    public.event_source_rank(p_source) * 10
    + case when nullif(trim(coalesce(p_ticket_url, '')), '') is not null then 4 else 0 end
    + case when nullif(trim(coalesce(p_image_url, '')), '') is not null then 3 else 0 end
    + case when nullif(trim(coalesce(p_description, '')), '') is not null then 2 else 0 end
    + case when nullif(trim(coalesce(p_location, '')), '') is not null then 1 else 0 end
$$;

create or replace function public.preferred_event_id(p_first uuid, p_second uuid)
returns uuid
language sql
stable
as $$
  with ranked as (
    select
      e.id,
      public.event_record_quality(
        e.event_source,
        e.ticket_url,
        e.image_url,
        e.description,
        coalesce(e.venue_name, e.location, e.city)
      ) as quality,
      coalesce(length(nullif(trim(coalesce(e.title, '')), '')), 0) as title_length
    from public.events e
    where e.id in (p_first, p_second)
  )
  select id
  from ranked
  order by quality desc, title_length desc, id asc
  limit 1
$$;

create or replace function public.find_matching_event_for_ingest(
  p_title text,
  p_event_date timestamptz,
  p_location text,
  p_city text,
  p_exclude_event_id uuid default null
)
returns uuid
language sql
stable
as $$
  with candidates as (
    select
      e.id,
      abs(extract(epoch from (coalesce(e.event_date, p_event_date) - p_event_date))) as start_diff_seconds,
      public.event_record_quality(
        e.event_source,
        e.ticket_url,
        e.image_url,
        e.description,
        coalesce(e.venue_name, e.location, e.city)
      ) as quality
    from public.events e
    where e.id is distinct from p_exclude_event_id
      and e.event_date is not null
      and (
        abs(extract(epoch from (e.event_date - p_event_date))) <= 21600
        or e.event_date::date = p_event_date::date
      )
      and public.event_titles_similar(e.title, p_title)
      and public.event_locations_compatible(coalesce(e.venue_name, e.location), e.city, p_location, p_city)
  )
  select id
  from candidates
  order by quality desc, start_diff_seconds asc, id asc
  limit 1
$$;

create or replace function public.merge_event_records(
  p_canonical_event_id uuid,
  p_duplicate_event_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_canonical public.events%rowtype;
  v_duplicate public.events%rowtype;
begin
  if p_canonical_event_id is null or p_duplicate_event_id is null or p_canonical_event_id = p_duplicate_event_id then
    return false;
  end if;

  select * into v_canonical from public.events where id = p_canonical_event_id for update;
  select * into v_duplicate from public.events where id = p_duplicate_event_id for update;

  if v_canonical.id is null or v_duplicate.id is null then
    return false;
  end if;

  update public.events e
  set
    title = case
      when nullif(trim(coalesce(e.title, '')), '') is null then v_duplicate.title
      when public.event_source_rank(v_duplicate.event_source) > public.event_source_rank(e.event_source)
        and length(coalesce(v_duplicate.title, '')) > length(coalesce(e.title, ''))
        then v_duplicate.title
      else e.title
    end,
    event_date = coalesce(e.event_date, v_duplicate.event_date),
    event_end_date = coalesce(e.event_end_date, v_duplicate.event_end_date),
    location = case
      when nullif(trim(coalesce(e.location, '')), '') is null then v_duplicate.location
      else e.location
    end,
    venue_name = case
      when nullif(trim(coalesce(e.venue_name, '')), '') is null then v_duplicate.venue_name
      else e.venue_name
    end,
    city = case
      when nullif(trim(coalesce(e.city, '')), '') is null then v_duplicate.city
      else e.city
    end,
    lat = coalesce(e.lat, v_duplicate.lat),
    lng = coalesce(e.lng, v_duplicate.lng),
    image_url = case
      when nullif(trim(coalesce(e.image_url, '')), '') is null then v_duplicate.image_url
      when public.event_source_rank(v_duplicate.event_source) > public.event_source_rank(e.event_source)
        and nullif(trim(coalesce(v_duplicate.image_url, '')), '') is not null
        then v_duplicate.image_url
      else e.image_url
    end,
    ticket_url = coalesce(nullif(trim(coalesce(e.ticket_url, '')), ''), nullif(trim(coalesce(v_duplicate.ticket_url, '')), '')),
    external_url = coalesce(nullif(trim(coalesce(e.external_url, '')), ''), nullif(trim(coalesce(v_duplicate.external_url, '')), '')),
    description = case
      when nullif(trim(coalesce(e.description, '')), '') is null then v_duplicate.description
      when public.event_source_rank(v_duplicate.event_source) > public.event_source_rank(e.event_source)
        and nullif(trim(coalesce(v_duplicate.description, '')), '') is not null
        then v_duplicate.description
      else e.description
    end
  where e.id = p_canonical_event_id;

  insert into public.event_source_aliases (event_id, event_source, source_event_id)
  select p_canonical_event_id, v_duplicate.event_source, v_duplicate.source_event_id
  where nullif(trim(coalesce(v_duplicate.event_source, '')), '') is not null
    and nullif(trim(coalesce(v_duplicate.source_event_id, '')), '') is not null
  on conflict (event_source, source_event_id) do update
  set event_id = excluded.event_id,
      updated_at = now();

  update public.event_source_aliases
  set event_id = p_canonical_event_id,
      updated_at = now()
  where event_id = p_duplicate_event_id;

  delete from public.attendees a
  using public.attendees b
  where a.event_id = p_duplicate_event_id
    and b.event_id = p_canonical_event_id
    and a.user_id = b.user_id;

  update public.attendees
  set event_id = p_canonical_event_id
  where event_id = p_duplicate_event_id;

  update public.referrals
  set event_id = p_canonical_event_id
  where event_id = p_duplicate_event_id;

  update public.product_events
  set event_id = p_canonical_event_id
  where event_id = p_duplicate_event_id;

  update public.notifications
  set event_id = p_canonical_event_id
  where event_id = p_duplicate_event_id;

  update public.safety_reports
  set target_event_id = p_canonical_event_id
  where target_event_id = p_duplicate_event_id;

  delete from public.events
  where id = p_duplicate_event_id;

  update public.events e
  set
    event_source = case
      when public.event_source_rank(v_duplicate.event_source) > public.event_source_rank(e.event_source)
        then v_duplicate.event_source
      else e.event_source
    end,
    source_event_id = case
      when public.event_source_rank(v_duplicate.event_source) > public.event_source_rank(e.event_source)
        then v_duplicate.source_event_id
      else e.source_event_id
    end
  where e.id = p_canonical_event_id;

  return true;
end;
$$;

create or replace function public.ingest_external_event(
  p_event_source text,
  p_source_event_id text,
  p_title text,
  p_event_date timestamptz,
  p_event_end_date timestamptz default null,
  p_location text default null,
  p_venue_name text default null,
  p_city text default null,
  p_lat double precision default null,
  p_lng double precision default null,
  p_image_url text default null,
  p_ticket_url text default null,
  p_external_url text default null,
  p_description text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exact_event_id uuid;
  v_candidate_event_id uuid;
  v_target_event_id uuid;
  v_action text := 'updated';
begin
  if nullif(trim(coalesce(p_event_source, '')), '') is null
    or nullif(trim(coalesce(p_source_event_id, '')), '') is null
    or nullif(trim(coalesce(p_title, '')), '') is null
    or p_event_date is null then
    return jsonb_build_object('action', 'skipped', 'event_id', null);
  end if;

  select a.event_id
  into v_exact_event_id
  from public.event_source_aliases a
  where a.event_source = p_event_source
    and a.source_event_id = p_source_event_id
  limit 1;

  if v_exact_event_id is null then
    select e.id
    into v_exact_event_id
    from public.events e
    where e.event_source = p_event_source
      and e.source_event_id = p_source_event_id
    limit 1;
  end if;

  select public.find_matching_event_for_ingest(
    p_title,
    p_event_date,
    coalesce(p_venue_name, p_location),
    p_city,
    v_exact_event_id
  )
  into v_candidate_event_id;

  if v_exact_event_id is not null and v_candidate_event_id is not null and v_exact_event_id <> v_candidate_event_id then
    v_target_event_id := public.preferred_event_id(v_exact_event_id, v_candidate_event_id);
    if v_target_event_id = v_candidate_event_id then
      perform public.merge_event_records(v_candidate_event_id, v_exact_event_id);
    else
      perform public.merge_event_records(v_exact_event_id, v_candidate_event_id);
    end if;
    v_action := 'deduped';
  elsif v_exact_event_id is not null then
    v_target_event_id := v_exact_event_id;
    v_action := 'updated';
  elsif v_candidate_event_id is not null then
    v_target_event_id := v_candidate_event_id;
    v_action := 'deduped';
  else
    insert into public.events (
      title,
      event_date,
      event_end_date,
      location,
      venue_name,
      city,
      lat,
      lng,
      image_url,
      ticket_url,
      external_url,
      description,
      event_source,
      source_event_id
    )
    values (
      p_title,
      p_event_date,
      p_event_end_date,
      p_location,
      p_venue_name,
      p_city,
      p_lat,
      p_lng,
      p_image_url,
      p_ticket_url,
      p_external_url,
      p_description,
      p_event_source,
      p_source_event_id
    )
    returning id into v_target_event_id;

    v_action := 'inserted';
  end if;

  update public.events e
  set
    event_source = case
      when public.event_source_rank(p_event_source) > public.event_source_rank(e.event_source)
        then p_event_source
      else e.event_source
    end,
    source_event_id = case
      when public.event_source_rank(p_event_source) > public.event_source_rank(e.event_source)
        then p_source_event_id
      else e.source_event_id
    end,
    title = case
      when nullif(trim(coalesce(e.title, '')), '') is null then p_title
      when public.event_source_rank(p_event_source) > public.event_source_rank(e.event_source)
        and length(coalesce(p_title, '')) > length(coalesce(e.title, ''))
        then p_title
      else e.title
    end,
    event_date = coalesce(e.event_date, p_event_date),
    event_end_date = coalesce(e.event_end_date, p_event_end_date),
    location = case
      when nullif(trim(coalesce(e.location, '')), '') is null then p_location
      else e.location
    end,
    venue_name = case
      when nullif(trim(coalesce(e.venue_name, '')), '') is null then p_venue_name
      else e.venue_name
    end,
    city = case
      when nullif(trim(coalesce(e.city, '')), '') is null then p_city
      else e.city
    end,
    lat = coalesce(e.lat, p_lat),
    lng = coalesce(e.lng, p_lng),
    image_url = case
      when nullif(trim(coalesce(e.image_url, '')), '') is null then p_image_url
      when public.event_source_rank(p_event_source) > public.event_source_rank(e.event_source)
        and nullif(trim(coalesce(p_image_url, '')), '') is not null
        then p_image_url
      else e.image_url
    end,
    ticket_url = coalesce(nullif(trim(coalesce(e.ticket_url, '')), ''), nullif(trim(coalesce(p_ticket_url, '')), '')),
    external_url = coalesce(nullif(trim(coalesce(e.external_url, '')), ''), nullif(trim(coalesce(p_external_url, '')), '')),
    description = case
      when nullif(trim(coalesce(e.description, '')), '') is null then p_description
      when public.event_source_rank(p_event_source) > public.event_source_rank(e.event_source)
        and nullif(trim(coalesce(p_description, '')), '') is not null
        then p_description
      else e.description
    end
  where e.id = v_target_event_id;

  insert into public.event_source_aliases (event_id, event_source, source_event_id)
  values (v_target_event_id, p_event_source, p_source_event_id)
  on conflict (event_source, source_event_id) do update
  set event_id = excluded.event_id,
      updated_at = now();

  return jsonb_build_object(
    'action', v_action,
    'event_id', v_target_event_id
  );
end;
$$;

create or replace function public.ingest_external_events(p_events jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event jsonb;
  v_result jsonb;
  v_processed integer := 0;
  v_inserted integer := 0;
  v_updated integer := 0;
  v_deduped integer := 0;
  v_skipped integer := 0;
begin
  for v_event in
    select value
    from jsonb_array_elements(coalesce(p_events, '[]'::jsonb))
  loop
    v_result := public.ingest_external_event(
      v_event->>'event_source',
      v_event->>'source_event_id',
      v_event->>'title',
      nullif(v_event->>'event_date', '')::timestamptz,
      nullif(v_event->>'event_end_date', '')::timestamptz,
      nullif(v_event->>'location', ''),
      nullif(v_event->>'venue_name', ''),
      nullif(v_event->>'city', ''),
      nullif(v_event->>'lat', '')::double precision,
      nullif(v_event->>'lng', '')::double precision,
      nullif(v_event->>'image_url', ''),
      nullif(v_event->>'ticket_url', ''),
      nullif(v_event->>'external_url', ''),
      nullif(v_event->>'description', '')
    );

    v_processed := v_processed + 1;
    case v_result->>'action'
      when 'inserted' then v_inserted := v_inserted + 1;
      when 'deduped' then v_deduped := v_deduped + 1;
      when 'updated' then v_updated := v_updated + 1;
      else v_skipped := v_skipped + 1;
    end case;
  end loop;

  return jsonb_build_object(
    'processed', v_processed,
    'inserted', v_inserted,
    'updated', v_updated,
    'deduped', v_deduped,
    'skipped', v_skipped,
    'upserted', v_inserted + v_updated + v_deduped
  );
end;
$$;

revoke all on function public.merge_event_records(uuid, uuid) from public;
revoke all on function public.ingest_external_event(text, text, text, timestamptz, timestamptz, text, text, text, double precision, double precision, text, text, text, text) from public;
revoke all on function public.ingest_external_events(jsonb) from public;

grant execute on function public.merge_event_records(uuid, uuid) to service_role;
grant execute on function public.ingest_external_event(text, text, text, timestamptz, timestamptz, text, text, text, double precision, double precision, text, text, text, text) to service_role;
grant execute on function public.ingest_external_events(jsonb) to service_role;

commit;
