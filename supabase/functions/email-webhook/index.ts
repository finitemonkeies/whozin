import { createClient } from "jsr:@supabase/supabase-js@2";
import { Webhook } from "npm:svix";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ResendWebhookPayload = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
    click?: {
      link?: string;
      timestamp?: string;
      ipAddress?: string;
      userAgent?: string;
    };
    bounce?: {
      message?: string;
      subType?: string;
      type?: string;
      diagnosticCode?: string[];
    };
    [key: string]: unknown;
  };
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function errorToMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function eventTimestamp(payload: ResendWebhookPayload): string {
  if (payload.type === "email.clicked" && payload.data?.click?.timestamp) {
    return payload.data.click.timestamp;
  }
  return payload.created_at ?? new Date().toISOString();
}

async function updateEmailEvent(
  service: ReturnType<typeof createClient>,
  payload: ResendWebhookPayload,
) {
  const providerMessageId = String(payload.data?.email_id ?? "").trim();
  if (!providerMessageId) {
    throw new Error("Missing email_id in webhook payload");
  }

  const occurredAt = eventTimestamp(payload);
  const type = String(payload.type ?? "").trim();
  const patch: Record<string, unknown> = {
    status: type.replace(/^email\./, "") || "unknown",
  };

  if (type === "email.sent") patch.sent_at = occurredAt;
  if (type === "email.delivered") patch.delivered_at = occurredAt;
  if (type === "email.opened") patch.opened_at = occurredAt;
  if (type === "email.clicked") patch.clicked_at = occurredAt;
  if (type === "email.bounced") patch.bounced_at = occurredAt;
  if (type === "email.complained") patch.complained_at = occurredAt;

  const { data: existingRows, error: existingErr } = await service
    .from("email_events")
    .select("id,metadata")
    .eq("provider_message_id", providerMessageId)
    .limit(1);
  if (existingErr) throw existingErr;

  const existing = (existingRows ?? [])[0] as { id: string; metadata?: Record<string, unknown> } | undefined;
  if (!existing?.id) {
    return { updated: false, reason: "email_event_not_found" };
  }

  const nextMetadata: Record<string, unknown> = {
    ...(existing.metadata ?? {}),
    webhook_type: type,
    webhook_created_at: payload.created_at ?? null,
  };
  if (payload.data?.click) nextMetadata.click = payload.data.click;
  if (payload.data?.bounce) nextMetadata.bounce = payload.data.bounce;
  if (Array.isArray(payload.data?.to)) nextMetadata.to = payload.data.to;

  patch.metadata = nextMetadata;

  const { error: updateErr } = await service
    .from("email_events")
    .update(patch)
    .eq("id", existing.id);
  if (updateErr) throw updateErr;

  const primaryRecipient = Array.isArray(payload.data?.to) ? payload.data?.to[0] ?? null : null;
  if (primaryRecipient) {
    if (type === "email.bounced") {
      const pauseUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      await service
        .from("profiles")
        .update({ email_pause_until: pauseUntil })
        .eq("email", primaryRecipient);
    }

    if (type === "email.complained") {
      await service
        .from("profiles")
        .update({
          email_unsubscribed_at: occurredAt,
          email_retention_opt_in: false,
          email_product_updates_opt_in: false,
        })
        .eq("email", primaryRecipient);
    }
  }

  return { updated: true, id: existing.id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    return jsonResponse(500, { error: "Missing Supabase or webhook env" });
  }

  const rawPayload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let payload: ResendWebhookPayload;
  try {
    const webhook = new Webhook(webhookSecret);
    payload = webhook.verify(rawPayload, headers) as ResendWebhookPayload;
  } catch (error) {
    return jsonResponse(400, {
      error: "Invalid webhook signature",
      message: errorToMessage(error),
    });
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const result = await updateEmailEvent(service, payload);
    return jsonResponse(200, {
      ok: true,
      type: payload.type ?? null,
      ...result,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: "Webhook processing failed",
      message: errorToMessage(error),
    });
  }
});
