alter table if exists public.profiles
  add column if not exists email_retention_opt_in boolean not null default false,
  add column if not exists email_product_updates_opt_in boolean not null default false,
  add column if not exists email_marketing_consent_at timestamptz,
  add column if not exists email_marketing_consent_source text,
  add column if not exists email_unsubscribed_at timestamptz,
  add column if not exists email_pause_until timestamptz,
  add column if not exists email_last_sent_at timestamptz;

create or replace function public.is_user_emailable(
  p_user_id uuid,
  p_email_kind text
)
returns boolean
language sql
stable
as $$
  select
    case
      when p.id is null then false
      when p.email is null then false
      when p.email_pause_until is not null and p.email_pause_until > now() then false
      when lower(coalesce(p_email_kind, '')) = 'retention' then
        p.email_unsubscribed_at is null and coalesce(p.email_retention_opt_in, false)
      when lower(coalesce(p_email_kind, '')) in ('marketing', 'product_updates') then
        p.email_unsubscribed_at is null and coalesce(p.email_product_updates_opt_in, false)
      else
        true
    end
  from public.profiles p
  where p.id = p_user_id;
$$;
