# Day 1 Execution Checklist (Pre-Alpha)

Target date: Wednesday, February 25, 2026

## 1) Configure Supabase Edge Function env vars

- [ ] Open Supabase Dashboard -> Project -> Edge Functions -> Settings -> Environment variables
- [ ] Set `CORS_ORIGINS`
  - [ ] Include production, www, staging (if used), and localhost
- [ ] Set `SIGNUP_ADMIN_TOKEN`
  - [ ] Value: `17be5143678954b356ccdca7384c14d588212da0a63a16aed106a3318c761676`
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is not exposed in frontend env vars

## 2) Apply SQL in exact order

- [ ] Run `supabase/sql/001_security_policies.sql`
- [ ] Run `supabase/sql/002_add_event_end_date.sql`
- [ ] Run `supabase/sql/003_server_rate_limits.sql`

## 3) Redeploy Edge Function

- [ ] Redeploy active server function after env + SQL are applied
- [ ] Confirm latest deployed code is the fixed entrypoint version

## 4) Validate security + behavior

- [ ] Non-admin cannot create/update/delete events
- [ ] Users can only edit their own profile/attendance/friendship data
- [ ] Rapid repeated friend-add attempts are throttled
- [ ] Rapid repeated RSVP inserts are throttled
- [ ] Multi-day events support `event_end_date` correctly

## 5) Smoke checks from local terminal

- [ ] Set function URL:
  - [ ] `$env:WHOZIN_SERVER_URL="https://YOUR_FUNCTION_HOST"`
- [ ] Run:
  - [ ] `npm run security:smoke`
- [ ] Confirm expected results:
  - [ ] `PASS: health endpoint reachable`
  - [ ] `PASS: unauth attendees is blocked -> status=401`
  - [ ] `PASS: signup blocked without admin token -> status=403`

## Current local status

- [x] `npm test` passed
- [x] `npm run build` passed
- [ ] `npm run security:smoke` pending (requires deployed function host)

