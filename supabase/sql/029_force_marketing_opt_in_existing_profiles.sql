begin;

update public.profiles
set
  email_retention_opt_in = true,
  email_product_updates_opt_in = true,
  email_marketing_consent_at = coalesce(email_marketing_consent_at, now()),
  email_marketing_consent_source = coalesce(
    nullif(email_marketing_consent_source, ''),
    'founder_override_2026_03_19'
  ),
  email_unsubscribed_at = null,
  updated_at = now()
where id is not null;

commit;
