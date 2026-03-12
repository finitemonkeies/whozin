# Bay Area Event Ingestion

This repo now includes a daily Bay Area event ingestion function:

- Edge Function: `supabase/functions/sync-bay-area-events`
- Local/ops runner: `npm run ops:event-sync`

## Source strategy

Current ingestion lanes:

- `Resident Advisor` via Apify actor
- `19hz` Bay Area parser
- `Ticketmaster Discovery API`
- `Generic JSON-LD page scraping` for organizer pages or venue calendars

The `19hz` lane now includes a quality/dedupe pass before upsert:

- low-signal rows like placeholders or weak titles are dropped
- duplicate listings across sources are collapsed by semantic event key
- richer listings are preferred when the same event appears multiple ways

The JSON-LD lane is the easiest way to add new sources without writing a new parser every time.

## Required secrets

Set these in Supabase Edge Function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional but recommended:

- `APIFY_TOKEN`
- `APIFY_RA_ACTOR_ID`
- `APIFY_RA_URLS_JSON`
- `BAY_AREA_19HZ_URL`
- `TICKETMASTER_API_KEY`
- `BAY_AREA_CITIES`
- `BAY_AREA_EVENT_URLS_JSON`
- `ADMIN_EMAILS`

## Suggested values

`APIFY_RA_URLS_JSON`

```json
["https://ra.co/events/us/sanfrancisco","https://ra.co/events/us/oakland"]
```

`BAY_AREA_CITIES`

```text
San Francisco,Oakland,Berkeley,San Jose,Santa Cruz,Palo Alto,Mountain View,San Mateo,Redwood City
```

`BAY_AREA_19HZ_URL`

```text
https://19hz.info/eventlisting_BayArea.php
```

`BAY_AREA_EVENT_URLS_JSON`

```json
[
  { "url": "https://www.eventbrite.com/o/YOUR_ORGANIZER_SLUG", "source": "eventbrite_org", "city": "San Francisco" }
]
```

## Scheduling daily in Supabase

Supabase supports scheduled Edge Functions with `pg_cron` and `pg_net`:

- [Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
- [Cron](https://supabase.com/docs/guides/cron)

This repo now includes a helper migration:

- `supabase/sql/012_sync_bay_area_events_schedule.sql`

It creates:

- `public.schedule_sync_bay_area_events_daily(p_cron text default '15 16 * * *', p_tz text default 'America/Chicago')`

The cron expression is interpreted in UTC by `pg_cron`. The default `16:15` UTC is roughly `11:15 AM` America/Chicago during daylight saving time.

Before running the helper, store these vault secrets:

```sql
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('YOUR_SERVICE_ROLE_KEY', 'service_role_key');
```

Then run:

```sql
select public.schedule_sync_bay_area_events_daily();
```

If you want a different UTC schedule:

```sql
select public.schedule_sync_bay_area_events_daily('0 18 * * *', 'America/Chicago');
```

## Important product note

To surface ingested providers like `ra` or `19hz` in the app, production should set:

```text
VITE_SURFACE_INGESTED_SOURCES=true
```
