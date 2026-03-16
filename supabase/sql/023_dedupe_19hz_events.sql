with ranked as (
  select
    e.id,
    row_number() over (
      partition by lower(trim(coalesce(e.title, ''))), date_trunc('minute', e.event_date)
      order by
        (case when nullif(trim(coalesce(e.image_url, '')), '') is not null then 1 else 0 end) desc,
        (case when nullif(trim(coalesce(e.ticket_url, '')), '') is not null then 1 else 0 end) desc,
        (case when nullif(trim(coalesce(e.venue_name, '')), '') is not null then 1 else 0 end) desc,
        (case when nullif(trim(coalesce(e.location, '')), '') is not null then 1 else 0 end) desc,
        e.created_at desc nulls last,
        e.id desc
    ) as keep_rank
  from public.events e
  where coalesce(e.event_source, '') = '19hz'
    and coalesce(e.event_end_date, e.event_date) >= now() - interval '1 day'
)
delete from public.events e
using ranked r
where e.id = r.id
  and r.keep_rank > 1;
