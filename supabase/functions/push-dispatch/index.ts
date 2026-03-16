import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split(".")[1];
    if (!base64) return null;
    const normalized = base64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

type NotificationRow = {
  id: string;
  user_id: string;
  event_id: string | null;
  type: string;
  title: string;
  body: string;
  cta_path: string | null;
  created_at: string;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!supabaseUrl || !serviceRoleKey || !vapidSubject || !vapidPublicKey || !vapidPrivateKey) {
    return jsonResponse(500, { error: "Missing push env configuration" });
  }

  const authHeader = req.headers.get("Authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const apikey = req.headers.get("apikey") ?? "";
  const bearerRole = String(decodeJwtPayload(bearer ?? "")?.role ?? "").toLowerCase().trim();
  const apikeyRole = String(decodeJwtPayload(apikey ?? "")?.role ?? "").toLowerCase().trim();

  const isAuthorized =
    bearer === serviceRoleKey ||
    apikey === serviceRoleKey ||
    bearerRole === "service_role" ||
    bearerRole === "supabase_admin" ||
    apikeyRole === "service_role" ||
    apikeyRole === "supabase_admin";

  if (!isAuthorized) {
    return jsonResponse(401, { error: "Unauthorized" });
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  try {
    const body = await req.json().catch(() => ({}));
    const sinceMinutes = Math.max(1, Math.min(Number(body?.since_minutes ?? 60) || 60, 24 * 60));
    const limit = Math.max(1, Math.min(Number(body?.limit ?? 150) || 150, 500));
    const dryRun = body?.dry_run === true;
    const filterUserId = asString(body?.user_id);
    const sinceIso = new Date(Date.now() - sinceMinutes * 60 * 1000).toISOString();

    const notificationsQuery = service
      .from("notifications")
      .select("id,user_id,event_id,type,title,body,cta_path,created_at")
      .is("read_at", null)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (filterUserId) notificationsQuery.eq("user_id", filterUserId);

    const { data: notifications, error: notificationsError } = await notificationsQuery;
    if (notificationsError) throw notificationsError;

    const typedNotifications = (notifications ?? []) as NotificationRow[];
    if (typedNotifications.length === 0) {
      return jsonResponse(200, {
        ok: true,
        dry_run: dryRun,
        evaluated_notifications: 0,
        attempted_deliveries: 0,
        sent: 0,
        failed: 0,
        disabled_subscriptions: 0,
      });
    }

    const userIds = unique(typedNotifications.map((row) => row.user_id));
    const { data: subscriptions, error: subscriptionsError } = await service
      .from("push_subscriptions")
      .select("id,user_id,endpoint,p256dh,auth")
      .in("user_id", userIds)
      .is("disabled_at", null)
      .eq("permission_state", "granted");
    if (subscriptionsError) throw subscriptionsError;

    const typedSubscriptions = (subscriptions ?? []) as SubscriptionRow[];
    if (typedSubscriptions.length === 0) {
      return jsonResponse(200, {
        ok: true,
        dry_run: dryRun,
        evaluated_notifications: typedNotifications.length,
        attempted_deliveries: 0,
        sent: 0,
        failed: 0,
        disabled_subscriptions: 0,
      });
    }

    const notificationIds = typedNotifications.map((row) => row.id);
    const subscriptionIds = typedSubscriptions.map((row) => row.id);

    const { data: priorDeliveries, error: deliveriesError } = await service
      .from("push_notification_deliveries")
      .select("notification_id,subscription_id")
      .in("notification_id", notificationIds)
      .in("subscription_id", subscriptionIds);
    if (deliveriesError) throw deliveriesError;

    const deliveredKeys = new Set(
      (priorDeliveries ?? []).map((row) => `${row.notification_id}:${row.subscription_id}`)
    );

    const subscriptionsByUser = new Map<string, SubscriptionRow[]>();
    for (const row of typedSubscriptions) {
      const current = subscriptionsByUser.get(row.user_id) ?? [];
      current.push(row);
      subscriptionsByUser.set(row.user_id, current);
    }

    let attemptedDeliveries = 0;
    let sent = 0;
    let failed = 0;
    let disabledSubscriptions = 0;

    for (const notification of typedNotifications) {
      const userSubscriptions = subscriptionsByUser.get(notification.user_id) ?? [];
      for (const subscription of userSubscriptions) {
        const deliveryKey = `${notification.id}:${subscription.id}`;
        if (deliveredKeys.has(deliveryKey)) continue;
        attemptedDeliveries += 1;

        const payload = JSON.stringify({
          title: notification.title,
          body: notification.body,
          url:
            notification.cta_path ??
            (notification.event_id ? `/event/${notification.event_id}?src=push` : "/activity?src=push"),
          tag: `${notification.type}:${notification.event_id ?? notification.id}`,
          type: notification.type,
          notification_id: notification.id,
          event_id: notification.event_id,
          created_at: notification.created_at,
        });

        let status = "sent";
        let errorMessage: string | null = null;

        if (!dryRun) {
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: {
                  p256dh: subscription.p256dh,
                  auth: subscription.auth,
                },
              },
              payload,
              {
                TTL: 60 * 60,
                urgency: notification.type === "friend_joined_event" ? "high" : "normal",
              }
            );
            sent += 1;
          } catch (error: unknown) {
            failed += 1;
            status = "failed";
            errorMessage = errorToMessage(error);
            const statusCode =
              typeof error === "object" && error && "statusCode" in error
                ? Number((error as { statusCode?: unknown }).statusCode)
                : null;
            if (statusCode === 404 || statusCode === 410) {
              const { error: disableError } = await service
                .from("push_subscriptions")
                .update({ disabled_at: new Date().toISOString(), permission_state: "revoked" })
                .eq("id", subscription.id);
              if (!disableError) disabledSubscriptions += 1;
            }
          }

          const { error: insertDeliveryError } = await service.from("push_notification_deliveries").insert({
            notification_id: notification.id,
            subscription_id: subscription.id,
            status,
            error: errorMessage,
          });
          if (insertDeliveryError) throw insertDeliveryError;
        }
      }
    }

    return jsonResponse(200, {
      ok: true,
      dry_run: dryRun,
      evaluated_notifications: typedNotifications.length,
      subscriptions: typedSubscriptions.length,
      attempted_deliveries: attemptedDeliveries,
      sent,
      failed,
      disabled_subscriptions: disabledSubscriptions,
    });
  } catch (error) {
    return jsonResponse(500, {
      error: "Push dispatch failed",
      message: errorToMessage(error),
    });
  }
});
