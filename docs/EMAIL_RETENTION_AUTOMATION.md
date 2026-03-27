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
- `weekly_moves_digest`

These are all handled by the same edge function:

- `email-retention-send`

## Weekly digest

The same edge function now supports a weekly editorial-style email:

- Trigger key: `weekly_moves_digest`
- Audience: users with `email_product_updates_opt_in = true`
- Data source: upcoming `events` with move scores
- Selection strategy: first spread picks across different days of the week, then fill remaining slots by strongest score
- Dedupe: once per ISO week per city filter

You can optionally pass:

- `city`: limits the digest to a city/local market
- `editor_note`: a short hand-written note that appears above the auto-selected events

### Local preview command

Use this to dry-run the weekly digest without sending:

```bash
npm run ops:weekly-digest-preview -- --email jvincenthallahan@gmail.com
```

Optional flags:

- `--city "San Francisco"`
- `--editor-note "This week feels strongest on Friday."`
- `--editor-note-file "reports/weekly_digest_editor_note.txt"`
- `--live` to send instead of preview

Examples:

```bash
npm run ops:weekly-digest-preview -- --email jvincenthallahan@gmail.com --city "San Francisco"
```

```bash
npm run ops:weekly-digest-preview -- --email jvincenthallahan@gmail.com --editor-note "Friday is the cleanest bet this week."
```

```bash
npm run ops:weekly-digest-preview -- --email jvincenthallahan@gmail.com --editor-note-file "reports/weekly_digest_editor_note.txt"
```

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

## Job 4: weekly_moves_digest

Use this to send a Thursday "the moves this week" email powered by current event momentum.

- Job name: `email-weekly-moves-digest`
- Method: `POST`
- Schedule: `0 17 * * 4`
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
  "trigger_key": "weekly_moves_digest",
  "dry_run": false,
  "city": "San Francisco",
  "editor_note": "This week feels stronger on Friday than Saturday. If you only pick one night, start there."
}
```

Notes:

- `0 17 * * 4` is every Thursday at `17:00 UTC`
- In America/Chicago that is `12:00 PM` during daylight saving time
- Omit `city` to send one broader digest using the top weekly events across the current dataset
- Omit `editor_note` if you want the intro to be fully automatic

## Suggested editorial workflow

Recommended weekly operating loop:

1. Wednesday morning: run the digest in dry-run mode to preview the spread of events.
2. Review whether the picks feel balanced across days and whether the city filter is right.
3. Write or tweak the `editor_note` in [weekly_digest_editor_note.txt](C:/Users/jvinc/Desktop/Whozin/reports/weekly_digest_editor_note.txt).
4. Send yourself one live test.
5. Thursday: run the real send for the audience you want.

The simplest Codex automation is a Wednesday recurring inbox task that runs the dry-run preview command, summarizes the selected events, and asks you for the `editor_note` to use for Thursday.

## Current-account marketing override

If you want to temporarily include all existing profiles in marketing emails, run:

- [029_force_marketing_opt_in_existing_profiles.sql](C:/Users/jvinc/Desktop/Whozin/supabase/sql/029_force_marketing_opt_in_existing_profiles.sql)

What it does:

- sets `email_retention_opt_in = true`
- sets `email_product_updates_opt_in = true`
- clears `email_unsubscribed_at`
- stamps `email_marketing_consent_source` with `founder_override_2026_03_19` when empty

What it does not do:

- it does not change future signup defaults
- it does not clear `email_pause_until`, so bounced or paused addresses still stay suppressed

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
- weekly digest preview includes the expected top events and any editorial note you passed

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

For the Thursday digest, start with a dry run on the exact Thursday body you plan to use, then switch `dry_run` to `false` once the event picks look right.

## Verification checklist

After cron jobs are created, verify:

1. The job appears in Supabase Cron dashboard
2. The request method is `POST`
3. The URL is correct
4. The `Authorization` header uses the service role key
5. The body uses the correct `trigger_key`
6. First run succeeds with `dry_run: true`
7. Then switch to `dry_run: false`
8. For `weekly_moves_digest`, confirm the preview is selecting the right city scope and top events

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
