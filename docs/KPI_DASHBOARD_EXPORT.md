# Whozin KPI Dashboard Export

This is the exported KPI dashboard spec for alpha operations.
Use this as the source of truth instead of referencing raw SQL files.

## Dashboard purpose
Track whether the core loop is healthy:
Open app -> Discover event -> RSVP -> Invite friends -> Friend joins -> Friend RSVPs.

## Timezone
- America/Chicago

## Dashboard sections

### 1) Growth + Activation (7-day daily trend)
Show as a table or line chart by day:
- `new_users`
- `active_users`
- `rsvps`
- `friend_adds`
- `events_happening`
- `activated_new_users`
- `activation_rate_pct`
- `d1_retained_users`
- `d1_eligible_users`
- `d1_retention_pct`

Primary read:
- Activation up + D1 up = onboarding and core loop healthy.
- New users up but activation flat = acquisition quality or first-session friction issue.

### 2) RSVP Source Mix (last full 7 days)
Show as stacked bar or pie:
- source
- RSVP count
- percent of total RSVPs

Primary read:
- `home` / `event_detail` should dominate.
- if `unknown` grows, source tagging is regressing.

### 3) Event Source Quality (last full 7 days)
Show as table:
- `event_source`
- live event count
- RSVP count
- RSVPs per live event

Primary read:
- tells whether current surfaced source mix is producing attendance momentum.

### 4) Core Efficiency KPI (last 6 full weeks)
Show as weekly line:
- `rsvps`
- `active_users`
- `rsvps_per_active_user` (primary)

Primary read:
- this is the top-level alpha efficiency metric.
- stable or rising = core loop stickiness improving.

### 5) Explore -> Detail CTR (last full 7 days)
Show as funnel:
- impressions
- clicks
- `ctr_pct`
- impression users
- click users
- `user_ctr_pct`

Primary read:
- low CTR means event card relevance/hierarchy issue.

### 6) Detail -> RSVP CVR (last full 7 days)
Show as funnel:
- detail views (user-event)
- converted user-event
- `detail_to_rsvp_cvr_pct`

Primary read:
- this is RSVP conversion quality from detail page.

### 7) Friend-add -> RSVP within 72h (last full 7 days)
Show as conversion card:
- friend adds
- friend adds with RSVP in 72h
- `friend_add_to_rsvp_72h_pct`

Primary read:
- validates social graph quality and friend gravity impact.

### 8) Referral Flywheel Baseline (last 7 days)
Show as KPI cards:
- total RSVPs
- `invite_sent`
- `invite_opened`
- `invite_signup_completed`
- `invite_rsvp_completed`
- `% RSVPs with invite click`
- `signup_from_invite_pct`
- `rsvp_from_invite_72h_pct`

Primary read:
- confirms invite loop contributes to growth.

### 9) Referral Funnel by Day (last 14 days)
Show as daily trend:
- invite sent/opened/signup/rsvp completed

Primary read:
- day-over-day consistency of invite loop.

### 10) Referral Conversion by Source (last 14 days)
Show as source table:
- source
- sent/opened/signup/rsvp completed
- signup %
- rsvp %

Primary read:
- tells which invite entry point performs best.

### 11) Top Inviters (last 30 days)
Show as leaderboard:
- inviter user id / username
- invites created
- invites opened
- invites claimed

Primary read:
- identifies early community amplifiers.

### 12) Open Quality Split (last 30 days)
Show as KPI block:
- invites created
- opened anonymous
- opened authenticated
- claimed invites
- `claimed_per_anon_open_pct`

Primary read:
- quality of top-of-funnel invite traffic.

### 13) Observability Health (last 24h)
Show as error cards:
- funnel event totals:
  - `event_detail_view`, `invite_sent`, `invite_link_copied`, `invite_signup_completed`, `invite_rsvp_completed`
- error sink:
  - errors by `surface` + `kind`
  - top recent errors

Primary read:
- detect auth, RSVP, invite, and edge failures before users report them.

## KPI alert thresholds (starter)
- `detail_to_rsvp_cvr_pct` drops >20% WoW -> alert
- `rsvps_per_active_user` drops >15% WoW -> alert
- `signup_from_invite_pct` drops >25% WoW -> alert
- `rsvp_failed` events > 3x 7-day average -> alert
- any edge 5xx burst > 20 in 10 min -> alert

## Source mapping
If you need the underlying SQL later, it maps to:
- `docs/WEEK1_KPI_QUERIES.sql`
- `docs/REFERRAL_KPI_QUERIES.sql`
- `docs/ALPHA_OBSERVABILITY_QUERIES.sql`
