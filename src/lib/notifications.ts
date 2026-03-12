import { supabase } from "@/lib/supabase";

export type AppNotification = {
  id: string;
  type: "friend_joined_event" | "event_momentum" | "post_rsvp_invite_nudge" | string;
  title: string;
  body: string;
  cta_path: string | null;
  read_at: string | null;
  created_at: string;
  event_id: string | null;
  group_key?: string | null;
};

function createdAtMs(value: string) {
  const ts = new Date(value).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

function notificationPriority(notification: AppNotification) {
  switch (notification.type) {
    case "event_momentum":
      return 300;
    case "friend_joined_event":
      return 220;
    case "post_rsvp_invite_nudge":
      return 80;
    default:
      return 140;
  }
}

function coalesceFriendNames(notifications: AppNotification[]) {
  const names = notifications
    .map((notification) => notification.title.replace(/\s+is going out$/i, "").trim())
    .filter(Boolean);

  if (names.length === 0) return `${notifications.length} friends`;
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} +${names.length - 2}`;
}

export function prioritizeNotifications(
  rows: AppNotification[],
  { limit }: { limit?: number } = {}
): AppNotification[] {
  const sorted = [...rows].sort((a, b) => createdAtMs(b.created_at) - createdAtMs(a.created_at));
  const grouped: AppNotification[] = [];
  const friendBurstMap = new Map<string, AppNotification[]>();
  let newestNudge: AppNotification | null = null;

  for (const notification of sorted) {
    if (notification.type === "post_rsvp_invite_nudge") {
      if (!newestNudge || createdAtMs(notification.created_at) > createdAtMs(newestNudge.created_at)) {
        newestNudge = notification;
      }
      continue;
    }

    if (notification.type === "friend_joined_event" && notification.event_id) {
      const dayKey = new Date(notification.created_at).toISOString().slice(0, 10);
      const key = `${notification.event_id}:${dayKey}:${notification.read_at ? "read" : "unread"}`;
      const burst = friendBurstMap.get(key) ?? [];
      burst.push(notification);
      friendBurstMap.set(key, burst);
      continue;
    }

    grouped.push(notification);
  }

  for (const burst of friendBurstMap.values()) {
    if (burst.length === 1) {
      grouped.push(burst[0]);
      continue;
    }

    const newest = [...burst].sort((a, b) => createdAtMs(b.created_at) - createdAtMs(a.created_at))[0];
    const names = coalesceFriendNames(burst);
    grouped.push({
      ...newest,
      title: `${names} are going out`,
      body: `${burst.length} people in your circle are locking in for the same event.`,
      type: "friend_joined_event_burst",
      read_at: burst.every((item) => !!item.read_at) ? newest.read_at : null,
    });
  }

  grouped.sort((a, b) => {
    const priorityDelta = notificationPriority(b) - notificationPriority(a);
    if (priorityDelta !== 0) return priorityDelta;
    if (!!a.read_at !== !!b.read_at) return a.read_at ? 1 : -1;
    return createdAtMs(b.created_at) - createdAtMs(a.created_at);
  });

  const result = newestNudge && grouped.filter((item) => !item.read_at).length < 3
    ? [...grouped, newestNudge]
    : grouped;

  return typeof limit === "number" ? result.slice(0, limit) : result;
}

export async function listNotifications(limit = 30): Promise<AppNotification[]> {
  const { data, error } = await supabase.rpc("list_notification_digest", {
    p_limit: limit,
  });

  if (!error) return (data ?? []) as AppNotification[];

  const fallback = await supabase
    .from("notifications")
    .select("id,type,title,body,cta_path,read_at,created_at,event_id")
    .order("created_at", { ascending: false })
    .limit(Math.max(limit * 3, 30));

  if (fallback.error) throw fallback.error;
  return prioritizeNotifications((fallback.data ?? []) as AppNotification[], { limit });
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_unread_notification_digest_count");

  if (!error) return Number(data ?? 0);

  const fallback = await supabase
    .from("notifications")
    .select("id,type,title,body,cta_path,read_at,created_at,event_id")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(120);

  if (fallback.error) throw fallback.error;
  return prioritizeNotifications((fallback.data ?? []) as AppNotification[]).filter((item) => !item.read_at)
    .length;
}

export async function markNotificationRead(
  id: string,
  groupKey?: string | null
): Promise<void> {
  const { error } = await supabase.rpc("mark_notification_digest_read", {
    p_notification_id: id,
    p_group_key: groupKey ?? null,
  });

  if (!error) return;

  const fallback = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);

  if (fallback.error) throw fallback.error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw error;
}
