# Email Retention Automation

This runbook documents the working setup for automated retention emails in this
project.

It uses:

- Supabase Edge Functions
- Supabase Cron jobs in the dashboard
- `pg_cron`
- `pg_net`

It does **not** use `vault` in this project because the extension is not
available in the current Supabase instance.

## Triggers currently automated

- `signup_no_friend`
- `signup_no_rsvp`
- `rsvp_no_invite`

These are all handled by the same edge function:

- `email-retention-send`

## Prerequisites

Before creating cron jobs, confirm all of the following are true:

### Edge Function deployed

Deploy:

```bash
npx supabase functions deploy email-retention-send
```

### Supabase secrets present

These secrets must already exist for the function:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SITE_URL`
- `UNSUBSCRIBE_SECRET`

### Required database extensions enabled

In Supabase Dashboard -> Database -> Extensions, enable:

- `pg_cron`
- `pg_net`

## Base function URL

For this project:

```text
https://ecdyglakdtgeweisxxpv.supabase.co/functions/v1/email-retention-send
```

## Shared request headers

Every cron job should use the same headers:

- Header name: `Content-Type`
  - Value: `application/json`
- Header name: `Authorization`
  - Value: `Bearer YOUR_SERVICE_ROLE_KEY`

The service role key should come from your Supabase project settings.

## Job 1: signup_no_friend

Use this to email users who signed up but have not added a friend.

- Job name: `email-retention-signup-no-friend`
- Method: `POST`
- Schedule: `5 16 * * *`
- URL:
  - `https://ecdyglakdtgeweisxxpv.supabase.co/functions/v1/email-retention-send`

Headers:

- Header name: `Content-Type`
  - Value: `application/json`
- Header name: `Authorization`
  - Value: `Bearer YOUR_SERVICE_ROLE_KEY`

Body:

```json
{
  "trigger_key": "signup_no_friend",
  "dry_run": false,
  "lookback_days": 7
}
```

## Job 2: signup_no_rsvp

Use this to email users who signed up but have not RSVPed to an event.

- Job name: `email-retention-signup-no-rsvp`
- Method: `POST`
- Schedule: `10 16 * * *`
- URL:
  - `https://ecdyglakdtgeweisxxpv.supabase.co/functions/v1/email-retention-send`

Headers:

- Header name: `Content-Type`
  - Value: `application/json`
- Header name: `Authorization`
  - Value: `Bearer YOUR_SERVICE_ROLE_KEY`

Body:

```json
{
  "trigger_key": "signup_no_rsvp",
  "dry_run": false,
  "lookback_days": 7
}
```

## Job 3: rsvp_no_invite

Use this to email users who RSVPed but have not invited anyone.

- Job name: `email-retention-rsvp-no-invite`
- Method: `POST`
- Schedule: `15 16 * * *`
- URL:
  - `https://ecdyglakdtgeweisxxpv.supabase.co/functions/v1/email-retention-send`

Headers:

- Header name: `Content-Type`
  - Value: `application/json`
- Header name: `Authorization`
  - Value: `Bearer YOUR_SERVICE_ROLE_KEY`

Body:

```json
{
  "trigger_key": "rsvp_no_invite",
  "dry_run": false,
  "lookback_days": 7
}
```

## Recommended rollout

Do not start with live sends immediately.

### Phase 1: safe verification

For each cron job, temporarily use:

```json
{
  "dry_run": true
}
```

Example:

```json
{
  "trigger_key": "signup_no_friend",
  "dry_run": true,
  "lookback_days": 7
}
```

Review the cron job output and confirm:

- function executes successfully
- eligible users are found when expected
- no authorization errors occur

### Phase 2: live sends

After dry-run validation, switch each job body back to:

```json
{
  "dry_run": false
}
```

## Recommended cadence

The default schedules are staggered five minutes apart:

- `16:05 UTC` -> `signup_no_friend`
- `16:10 UTC` -> `signup_no_rsvp`
- `16:15 UTC` -> `rsvp_no_invite`

This spacing reduces overlap and makes failures easier to isolate.

## Verification checklist

After cron jobs are created, verify:

1. The job appears in Supabase Cron dashboard
2. The request method is `POST`
3. The URL is correct
4. The `Authorization` header uses the service role key
5. The body uses the correct `trigger_key`
6. First run succeeds with `dry_run: true`
7. Then switch to `dry_run: false`

## Operational notes

- The edge function already enforces per-user suppression for recent sends
- The edge function also suppresses already-sent trigger/event combinations
- Resend also applies idempotency behavior on repeated identical sends
- Manual `force_send` exists for one-off testing with a specific `user_id`
- `force_send` should not be used in cron jobs

## Not used in this project

The SQL file `supabase/sql/020_email_retention_schedule.sql` assumes a Vault-based
internal scheduling path. That is **not** the active recommendation for this
project because `vault` is not available in the current Supabase instance.

Use the Supabase dashboard cron setup described above instead.
