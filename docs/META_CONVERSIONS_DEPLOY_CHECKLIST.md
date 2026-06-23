# Meta Conversions Deploy Checklist

## 1) Frontend env

Set on your frontend host:

```env
VITE_META_PIXEL_ID=YOUR_META_PIXEL_ID
```

Optional:

```env
VITE_META_PIXEL_DEBUG=true
```

## 2) Supabase function secrets

Set in Supabase project secrets:

```env
META_PIXEL_ID=YOUR_META_PIXEL_ID
META_CONVERSIONS_ACCESS_TOKEN=YOUR_META_CONVERSIONS_API_ACCESS_TOKEN
META_GRAPH_API_VERSION=v23.0
META_TEST_EVENT_CODE=OPTIONAL_META_TEST_EVENT_CODE
```

## 3) Deploy the function

```powershell
npx.cmd supabase functions deploy meta-conversions
```

If you need to set secrets from CLI:

```powershell
npx.cmd supabase secrets set META_PIXEL_ID=YOUR_META_PIXEL_ID META_CONVERSIONS_ACCESS_TOKEN=YOUR_META_CONVERSIONS_API_ACCESS_TOKEN META_GRAPH_API_VERSION=v23.0 META_TEST_EVENT_CODE=OPTIONAL_META_TEST_EVENT_CODE
```

## 4) Verify readiness

Open Admin Health and confirm:

- `Meta CAPI readiness` shows `PASS`
- frontend env summary shows `metaPixelIdSet: true`

## 5) Live test

Use Meta test mode first.

Check for:

- `PageView`
- `CompleteRegistration`
- `ActivatedUser`

Expect browser and server copies for the conversion events with shared `event_id`.

## 6) Recommended first rollout

- keep `META_TEST_EVENT_CODE` on for the first validation pass
- verify one signup flow and one RSVP flow
- then remove `META_TEST_EVENT_CODE` for production reporting
