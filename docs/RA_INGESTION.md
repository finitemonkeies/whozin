# RA Ingestion (SF/Oakland Bootstrap)

This project uses a managed extractor via Apify to ingest Resident Advisor events for SF Bay Area coverage.

- Source page: `https://ra.co/events/us/sanfrancisco`
- Actor: `chalkandcheese/ra-events-scraper`
- Edge Function: `sync-ra-sf`

## ToS / Risk Note

Resident Advisor may restrict automated access in their Terms: https://ra.co/terms

This integration is intentionally conservative:
- server-side only (no browser scraping),
- token kept in Edge Function secrets,
- manual/admin trigger + conservative scheduling (suggested every 12 hours).

Long-term, partnership/API options should be explored for durable compliance.

## Scheduling Recommendation

No scheduler infrastructure currently exists in this repo.

Recommended cadence:
- Run `sync-ra-sf` every 12 hours.
- Keep ingestion cached by upsert keys (`event_source`, `source_event_id`) to avoid duplicates.

You can schedule this from Supabase Dashboard (Edge Function scheduler / cron) later.
