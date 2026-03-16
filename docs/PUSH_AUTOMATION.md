# Web Push Automation

This runbook documents the working setup for automated web push in this
project.

It uses:

- the browser Push API
- a service worker in the frontend
- Supabase Edge Function `push-dispatch`
- Supabase Cron jobs in the dashboard
- `pg_cron`
- `pg_net`

## Prerequisites

Before scheduling push dispatch, confirm all of the following are true:

### SQL applied

Run:

- [025_web_push_foundation.sql](/C:/Users/jvinc/Desktop/Whozin/supabase/sql/025_web_push_foundation.sql)

### Edge Function deployed

Deploy:

```bash
npx supabase functions deploy push-dispatch --project-ref ecdyglakdtgeweisxxpv
```

### Supabase secrets present

These secrets must exist in Supabase:

- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`

### Frontend env present

This public env var must exist in the frontend host:

- `VITE_VAPID_PUBLIC_KEY`

### At least one subscription exists

Users must enable `Browser Push Alerts` in Settings before dispatch can send
anything.

## Base function URL

For this project:

```text
https://ecdyglakdtgeweisxxpv.supabase.co/functions/v1/push-dispatch
```

## Shared request headers

Every cron job should use:

- Header name: `Content-Type`
  - Value: `application/json`
- Header name: `Authorization`
  - Value: `Bearer YOUR_SERVICE_ROLE_KEY`

## Recommended MVP schedule

Use one cron job:

- Job name: `push-dispatch-quarter-hour`
- Method: `POST`
- Schedule: `*/15 * * * *`
- URL:
  - `https://ecdyglakdtgeweisxxpv.supabase.co/functions/v1/push-dispatch`

Headers:

- Header name: `Content-Type`
  - Value: `application/json`
- Header name: `Authorization`
  - Value: `Bearer YOUR_SERVICE_ROLE_KEY`

Body:

```json
{
  "dry_run": false,
  "since_minutes": 20,
  "limit": 150,
  "types": ["friend_joined_event", "event_momentum"]
}
```

## Recommended rollout

### Phase 1: safe verification

Start with:

```json
{
  "dry_run": true,
  "since_minutes": 20,
  "limit": 50,
  "types": ["friend_joined_event", "event_momentum"]
}
```

Confirm:

- the function runs successfully
- subscriptions are found
- attempted deliveries look reasonable

### Phase 2: live sends

Switch back to:

```json
{
  "dry_run": false,
  "since_minutes": 20,
  "limit": 150,
  "types": ["friend_joined_event", "event_momentum"]
}
```

## What gets sent

`push-dispatch` reads recent unread rows from `public.notifications` and sends
them to active rows in `public.push_subscriptions`.

So push currently mirrors existing in-app notifications instead of inventing a
separate trigger system.

## MVP guidance

`push-dispatch` now defaults to only the highest-value notification types:

- `friend_joined_event`
- `event_momentum`

You can override this by passing a `types` array in the request body.

## Operational notes

- `404` and `410` push provider responses disable dead subscriptions
- sends are deduped per `notification_id + subscription_id`
- iPhone users need the app added to the Home Screen to receive web push
