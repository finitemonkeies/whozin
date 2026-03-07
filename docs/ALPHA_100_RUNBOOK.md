# Alpha 100 Runbook

## 1) Deploy order
1. Run SQL migrations in this order:
   - `supabase/sql/001_security_policies.sql`
   - `supabase/sql/003_server_rate_limits.sql`
   - `supabase/sql/007_referrals_mvp.sql`
   - `supabase/sql/008_referrals_open_tracking.sql`
   - `supabase/sql/009_alpha_guardrails_observability.sql`
2. Deploy edge functions:
   - `server`
   - `sync-ra-sf`
3. Deploy frontend.

## 2) Required env vars
- Frontend:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_SITE_URL`
  - `VITE_PHONE_AUTH_ENABLED` (optional; currently `false` for alpha)
  - `VITE_SURFACE_INGESTED_SOURCES` (currently `false`)
- Supabase Edge Functions:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `CORS_ORIGINS`
  - `SIGNUP_ADMIN_TOKEN`
  - `APIFY_TOKEN` (for `sync-ra-sf`)
  - `APIFY_RA_ACTOR_ID` (optional override)
  - `ADMIN_EMAILS` (for `sync-ra-sf` auth)

## 3) Daily checks
1. Run data quality audit:
   - `npm run ops:data-quality`
2. Check auth and funnel telemetry:
   - `login_success`
   - `event_view`
   - `rsvp_success`
   - `rsvp_failed`
   - `invite_copy`
   - `invite_share`
   - `friend_add`
3. Check error sink volume in `app_error_logs`.

## 4) Outage fallback
- Google OAuth issue:
  - Keep magic link visible and verify callback URL matches production domain.
- SMS issue:
  - Leave phone auth disabled via `VITE_PHONE_AUTH_ENABLED=false`.
- Ingestion issue:
  - Keep `VITE_SURFACE_INGESTED_SOURCES=false`.
  - Continue manual event curation in Admin.

## 5) Rollback
1. Frontend rollback:
   - Redeploy previous known-good commit.
2. Edge function rollback:
   - Redeploy previous function versions.
3. Feature flags:
   - Set `VITE_SURFACE_INGESTED_SOURCES=false`
   - Set `VITE_PHONE_AUTH_ENABLED=false`

## 6) Backups and alerts checklist
- Supabase PITR/backups enabled.
- Alerts configured for:
  - Edge function error spikes
  - Database high CPU
  - Database connection saturation
- On-call email/slack route tested.

## 7) Invite launch gate
- Google OAuth tested on production URL.
- `npm test` and `npm run build` pass on release commit.
- Data quality audit returns no critical failures.
- Admin can manually add/edit/delete events.
