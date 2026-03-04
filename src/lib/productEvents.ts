import { supabase } from "@/lib/supabase";
import { sanitizeRsvpSource } from "@/lib/rsvpSource";

type ProductEventName =
  | "explore_event_impression"
  | "explore_event_click"
  | "event_detail_view"
  | "explore_feed_loaded"
  | "explore_buy_ticket_click"
  | "explore_rsvp_click"
  | "invite_sent"
  | "invite_link_copied"
  | "invite_link_opened"
  | "invite_signup_completed"
  | "invite_rsvp_completed";

type LogProductEventArgs = {
  eventName: ProductEventName;
  eventId?: string | null;
  source?: string | null;
  metadata?: Record<string, unknown>;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function logProductEvent({
  eventName,
  eventId,
  source,
  metadata = {},
}: LogProductEventArgs): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const userId = session?.user?.id;
    if (!userId) return;

    const cleanEventId = eventId && isUuid(eventId) ? eventId : null;

    const payload = {
      user_id: userId,
      event_name: eventName,
      event_id: cleanEventId,
      source: sanitizeRsvpSource(source ?? "unknown"),
      metadata,
    };

    await supabase.from("product_events").insert(payload);
  } catch {
    // Best-effort instrumentation: never block UI flows.
  }
}
