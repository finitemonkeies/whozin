# Production Hardening Guide (Whozin)

This guide is written for first-time founders. Follow it top-to-bottom once.

## 1) Stop tracking local secrets in git

Already added in this repo:
- `.gitignore` now ignores `.env` files.
- `.env.example` now shows safe placeholders.

One-time cleanup command (run locally):

```powershell
git rm --cached .env
git commit -m "Stop tracking .env"
git push
```

## 2) Set Edge Function environment variables

In Supabase Dashboard:
1. Open your project.
2. Go to `Edge Functions` -> `Settings` -> `Environment variables`.
3. Add:

- `CORS_ORIGINS`  
Example:
`https://whozin.app,https://www.whozin.app,https://staging.whozin.app,http://localhost:5173`

- `SIGNUP_ADMIN_TOKEN`  
Generate one locally:
```powershell
npm run security:token
```
Copy the output and paste as the variable value.

Do **not** put `SUPABASE_SERVICE_ROLE_KEY` anywhere in frontend env vars.

## 3) Apply SQL security policies (RLS)

In Supabase Dashboard:
1. Go to `SQL Editor`.
2. Open file `supabase/sql/001_security_policies.sql`.
3. Paste and run.

What this does:
- Enables RLS on `events`, `attendees`, `profiles`, `friendships`.
- Makes event writes admin-only.
- Allows users to modify only their own profile/attendance/friendship rows.

## 4) Redeploy Edge Functions

Redeploy after env and SQL changes so latest code + env are active.

## 5) Run smoke checks

Set the function base URL and run:

```powershell
$env:WHOZIN_SERVER_URL="https://YOUR_FUNCTION_HOST"
npm run security:smoke
```

Expected:
- `PASS: health endpoint reachable`
- `PASS: unauth attendees is blocked -> status=401`
- `PASS: signup blocked without admin token -> status=403`

## 6) Add CI check (recommended)

In your CI pipeline, run:

```powershell
npm test
```

This protects redirect hardening and future tests from regressions.

## 7) Quick production sanity checks

Manual checks:
1. Try visiting `/setup?redirect=https://example.com` -> should stay in-app.
2. Login with OAuth/magic link -> should return to a valid internal route.
3. Non-admin account should not be able to create/update/delete events.
