import { supabase } from "@/lib/supabase";
import { getSiteOrigin } from "@/lib/site";

type MetaConversionEventName = "CompleteRegistration" | "ActivatedUser";

type SendMetaConversionArgs = {
  customData?: Record<string, unknown>;
  eventId: string;
  eventName: MetaConversionEventName;
  eventSourceUrl?: string | null;
};

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`));
  if (!match) return null;
  const [, value] = match.split("=");
  return value ? decodeURIComponent(value) : null;
}

export function createMetaEventId(prefix: string): string {
  const safePrefix = prefix.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "") || "whozin";
  const unique =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${safePrefix}-${unique}`;
}

export async function sendMetaConversion(args: SendMetaConversionArgs): Promise<void> {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (!supabaseUrl || !anonKey) return;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;
  if (!accessToken) return;

  const endpoint = `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/meta-conversions`;
  const payload = {
    event_name: args.eventName,
    event_id: args.eventId,
    event_source_url: args.eventSourceUrl?.trim() || (typeof window !== "undefined" ? window.location.href : getSiteOrigin()),
    fbc: readCookie("_fbc"),
    fbp: readCookie("_fbp"),
    custom_data: args.customData ?? {},
  };

  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Best effort only.
  }
}
