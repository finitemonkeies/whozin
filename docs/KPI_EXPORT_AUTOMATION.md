# KPI Export Automation

## Command
```bash
npm run ops:kpi-export
```

## Required env vars
- `SUPABASE_URL` (or `VITE_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

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
- Daily at 8:00 AM local
- Weekly summary pull on Monday 9:00 AM local

## Windows Task Scheduler example (PowerShell)
```powershell
$env:SUPABASE_URL="https://<project-ref>.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
cd "C:\Users\jvinc\Desktop\Whozin\Whozin code"
npm run ops:kpi-export -- --tz America/Chicago --out-dir reports
```

## Notes
- This exporter is read-only and does not mutate product data.
- It is designed for alpha scale and should be enough for ~100 users.
