import { supabase } from "@/lib/supabase";

const PENDING_MARKETING_EMAIL_OPT_IN_KEY = "whozin_pending_marketing_email_opt_in";

function hasWindow() {
  return typeof window !== "undefined";
}

function readPendingValue(): boolean | null {
  if (!hasWindow()) return null;
  const raw = window.localStorage.getItem(PENDING_MARKETING_EMAIL_OPT_IN_KEY);
  if (raw === "true") return true;
  if (raw === "false") return false;
  return null;
}

export function getPendingMarketingEmailOptIn(defaultValue = false): boolean {
  return readPendingValue() ?? defaultValue;
}

export function setPendingMarketingEmailOptIn(value: boolean) {
  if (!hasWindow()) return;
  window.localStorage.setItem(PENDING_MARKETING_EMAIL_OPT_IN_KEY, String(value));
}

export function clearPendingMarketingEmailOptIn() {
  if (!hasWindow()) return;
  window.localStorage.removeItem(PENDING_MARKETING_EMAIL_OPT_IN_KEY);
}

export async function syncPendingMarketingEmailPreference(args: {
  userId: string;
  email?: string | null;
  source: string;
}) {
  const optIn = readPendingValue();
  if (optIn === null) return;

  const timestamp = new Date().toISOString();
  const payload = {
    id: args.userId,
    email: args.email ?? null,
    email_retention_opt_in: optIn,
    email_product_updates_opt_in: optIn,
    email_marketing_consent_at: optIn ? timestamp : null,
    email_marketing_consent_source: args.source,
    email_unsubscribed_at: optIn ? null : timestamp,
    updated_at: timestamp,
  };

  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (error) throw error;

  clearPendingMarketingEmailOptIn();
}

export const MARKETING_EMAIL_OPT_IN_LABEL =
  "Email me optional updates about events, friend activity, new features, and offers. I can unsubscribe anytime.";
