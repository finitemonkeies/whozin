import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  type AppNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications";
import { ActivityIcon, FriendsGoingIcon, InviteIcon, NewIcon, ShareIcon, TrendingIcon } from "@/app/components/WhozinIcons";

function relativeTime(value: string) {
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return "";
  const deltaMinutes = Math.floor((Date.now() - ts) / 60000);
  if (deltaMinutes < 1) return "just now";
  if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) return `${deltaHours}h ago`;
  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
}

function notificationIcon(type: string) {
  switch (type) {
    case "friend_joined_event":
    case "friend_joined_event_burst":
      return FriendsGoingIcon;
    case "event_momentum":
      return TrendingIcon;
    case "post_rsvp_invite_nudge":
      return ShareIcon;
    default:
      return ActivityIcon;
  }
}

function fallbackCta(notification: AppNotification) {
  if (notification.cta_path) return notification.cta_path;
  if (notification.event_id) return `/event/${notification.event_id}?src=notification`;
  return "/profile";
}

type NotificationsPanelProps = {
  title?: string;
  subtitle?: string;
  limit?: number;
  compact?: boolean;
};

export function NotificationsPanel({
  title = "The Loop",
  subtitle = "Friend movement, momentum, and the next nudge worth acting on.",
  limit = 8,
  compact = false,
}: NotificationsPanelProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showAll, setShowAll] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );
  const visibleNotifications = useMemo(() => {
    if (!compact || showAll) return notifications;

    const unread = notifications.filter((notification) => !notification.read_at);
    const read = notifications.filter((notification) => !!notification.read_at);
    const next = [...unread.slice(0, 4), ...read.slice(0, unread.length > 0 ? 1 : 2)];
    return next.slice(0, Math.min(limit, 5));
  }, [compact, limit, notifications, showAll]);
  const hiddenCount = Math.max(0, notifications.length - visibleNotifications.length);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const rows = await listNotifications(limit);
        if (!cancelled) setNotifications(rows);
      } catch {
        if (!cancelled) setNotifications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const onUpdated = () => {
      void load();
    };

    void load();
    window.addEventListener("whozin:notifications-updated", onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("whozin:notifications-updated", onUpdated);
    };
  }, [limit]);

  const emitUpdated = () => {
    window.dispatchEvent(new Event("whozin:notifications-updated"));
  };

  const openNotification = async (notification: AppNotification) => {
    try {
      if (!notification.read_at) {
        await markNotificationRead(notification.id, notification.group_key);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item
          )
        );
        emitUpdated();
      }
    } catch {
      // Keep navigation working even if read state fails.
    }

    navigate(fallbackCta(notification));
  };

  const handleMarkAll = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          read_at: item.read_at ?? new Date().toISOString(),
        }))
      );
      emitUpdated();
      toast.success("You're caught up");
    } catch (error: any) {
      toast.error(error?.message ?? "Could not clear notifications");
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className={compact ? "" : "min-h-screen bg-black text-white px-5 py-8 pb-24"}>
      <div className={compact ? "flex items-center justify-between mb-4" : "flex items-center justify-between mb-6"}>
        <div>
          <h2 className={compact ? "text-xl font-semibold" : "text-3xl font-bold"}>{title}</h2>
          <div className="mt-1 text-sm text-zinc-500">{subtitle}</div>
        </div>
        <button
          type="button"
          onClick={() => void handleMarkAll()}
          disabled={markingAll || unreadCount === 0}
          className="rounded-full border border-white/10 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          {markingAll ? "Clearing..." : unreadCount > 0 ? "Mark all read" : "All caught up"}
        </button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 text-sm text-zinc-400">
          Loading the loop...
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {visibleNotifications.map((notification) => {
            const Icon = notificationIcon(notification.type);
            const unread = !notification.read_at;

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => void openNotification(notification)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  unread
                    ? "border-fuchsia-400/20 bg-zinc-900/65"
                    : "border-white/10 bg-zinc-900/40"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${
                      unread ? "bg-fuchsia-500/15 text-fuchsia-200" : "bg-white/5 text-zinc-400"
                    }`}
                  >
                    <Icon color="currentColor" className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-sm font-semibold text-white">{notification.title}</div>
                      <div className="flex items-center gap-2">
                        {unread ? <span className="h-2.5 w-2.5 rounded-full bg-pink-500" /> : null}
                        <span className="text-xs text-zinc-500">
                          {relativeTime(notification.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">{notification.body}</div>
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                      Open it
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
          {compact && hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-white/[0.06]"
            >
              {showAll ? "Show less" : `Show earlier activity (${hiddenCount})`}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/10 bg-gradient-to-br from-zinc-900 to-black p-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800">
            <NewIcon color="currentColor" className="h-8 w-8 text-zinc-500" />
          </div>
          <h3 className="text-lg font-bold">Quiet for now</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Add one friend, find one move, and share it once. That's when Whozin starts talking back.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <Link
              to="/friends"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white text-black px-4 py-3 text-sm font-bold hover:bg-zinc-200"
            >
              <InviteIcon color="currentColor" className="h-4 w-4" />
              Find friends
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-800 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-700"
            >
              <TrendingIcon color="currentColor" className="h-4 w-4" />
              Find the move
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
