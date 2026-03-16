import { supabase } from "@/lib/supabase";

export type PushPermissionState = NotificationPermission | "unsupported";

export type PushStatus = {
  supported: boolean;
  permission: PushPermissionState;
  subscribed: boolean;
  needsStandaloneIosPrompt: boolean;
};

function isStandaloneIosMode() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)")?.matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isAppleMobile() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isPushSupported() {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function getPushStatus(permissionOverride?: NotificationPermission): PushStatus {
  const supported = isPushSupported();
  const permission = supported ? permissionOverride ?? Notification.permission : "unsupported";
  return {
    supported,
    permission,
    subscribed: false,
    needsStandaloneIosPrompt: supported && isAppleMobile() && !isStandaloneIosMode(),
  };
}

function getPublicVapidKey() {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushServiceWorker() {
  if (!isPushSupported()) return null;
  return navigator.serviceWorker.register("/sw.js");
}

async function getCurrentSubscription() {
  const registration = await registerPushServiceWorker();
  if (!registration) return null;
  return registration.pushManager.getSubscription();
}

export async function loadPushStatus(userId?: string | null): Promise<PushStatus> {
  const base = getPushStatus();
  if (!base.supported) return base;

  const subscription = await getCurrentSubscription();
  if (!subscription) return base;

  let subscribed = true;
  if (userId) {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("endpoint", subscription.endpoint)
      .is("disabled_at", null)
      .maybeSingle();
    subscribed = !error && !!data;
  }

  return {
    ...base,
    subscribed,
  };
}

export async function enablePushNotifications(userId: string) {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported on this device.");
  }

  if (isAppleMobile() && !isStandaloneIosMode()) {
    throw new Error("On iPhone, add Whozin to your Home Screen first to enable push alerts.");
  }

  const vapidPublicKey = getPublicVapidKey();
  if (!vapidPublicKey) {
    throw new Error("Missing VITE_VAPID_PUBLIC_KEY");
  }

  const registration = await registerPushServiceWorker();
  if (!registration) {
    throw new Error("Could not register the notification service worker.");
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    throw new Error("Notifications were not allowed.");
  }

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const subscriptionJson = subscription.toJSON();
  const p256dh = subscriptionJson.keys?.p256dh;
  const auth = subscriptionJson.keys?.auth;
  if (!subscription.endpoint || !p256dh || !auth) {
    throw new Error("Browser push subscription is missing required keys.");
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh,
      auth,
      user_agent: navigator.userAgent,
      platform: navigator.platform ?? null,
      permission_state: "granted",
      disabled_at: null,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" }
  );
  if (error) throw error;

  return subscription;
}

export async function disablePushNotifications(userId?: string | null) {
  if (!isPushSupported()) return;
  const subscription = await getCurrentSubscription();
  if (!subscription) return;

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => null);

  let query = supabase
    .from("push_subscriptions")
    .update({
      disabled_at: new Date().toISOString(),
      permission_state: Notification.permission === "denied" ? "denied" : "revoked",
      last_seen_at: new Date().toISOString(),
    })
    .eq("endpoint", endpoint);

  if (userId) query = query.eq("user_id", userId);
  const { error } = await query;
  if (error) throw error;
}
