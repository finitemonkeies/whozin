# KPI Export Automation

## Command
```bash
npm run ops:kpi-export
```

## Persist daily trend tables
Run this first if you want SQL-backed daily trends in the app:
```bash
npm run ops:kpi-refresh
```

This populates:
- `public.daily_kpi_metrics`
- `public.daily_kpi_rsvp_sources`

It calls the Supabase edge function `kpi-refresh`, which then invokes the SQL refresh on the server side.

Optional args:
```bash
npm run ops:kpi-refresh -- --days 35 --tz America/Chicago
```

## Required env vars
- `SUPABASE_URL` (or `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

The refresh script will also auto-read these files if present:
- `.env.ops`
- `.env.local`
- `.env`

Recommended local setup:
```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

## Optional args
```bash
npm run ops:kpi-export -- --tz America/Chicago --out-dir reports
```

## Output
Timestamped files:
- `reports/kpi_snapshot_<timestamp>.json`
- `reports/kpi_trend_7d_<timestamp>.csv`
- `reports/kpi_weekly_6w_<timestamp>.csv`

## Suggested cadence
- Daily KPI refresh at 7:55 AM local
- Daily at 8:00 AM local
- Weekly summary pull on Monday 9:00 AM local

## Windows Task Scheduler example (PowerShell)
```powershell
$env:SUPABASE_URL="https://<project-ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
cd "C:\Users\jvinc\Desktop\Whozin"
npm run ops:kpi-refresh -- --days 35 --tz America/Chicago
npm run ops:kpi-export -- --tz America/Chicago --out-dir reports
```

## Notes
- This exporter is read-only and does not mutate product data.
- It is designed for alpha scale and should be enough for ~100 users.
- The persisted KPI refresh writes aggregate rows only and is safe to re-run for the same date window.
