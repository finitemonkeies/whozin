import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { getUnreadNotificationCount } from "@/lib/notifications";
import { ExploreIcon, FriendsGoingIcon, HomeIcon, ProfileIcon } from "@/app/components/WhozinIcons";

export function BottomNav() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    const schedule = (task: () => void) => {
      const idleWindow = window as Window & {
        requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      };

      if (typeof idleWindow.requestIdleCallback === "function") {
        idleWindow.requestIdleCallback(task, { timeout: 1500 });
        return;
      }

      timeoutId = window.setTimeout(task, 250);
    };

    const load = async () => {
      try {
        const count = await getUnreadNotificationCount();
        if (!cancelled) setUnreadCount(count);
      } catch {
        if (!cancelled) setUnreadCount(0);
      }
    };

    const onUpdated = () => {
      void load();
    };

    schedule(() => {
      void load();
    });
    window.addEventListener("whozin:notifications-updated", onUpdated);
    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      window.removeEventListener("whozin:notifications-updated", onUpdated);
    };
  }, []);

  const navItems = [
    { icon: HomeIcon, label: "Feed", path: "/" },
    { icon: ExploreIcon, label: "Explore", path: "/explore" },
    { icon: FriendsGoingIcon, label: "Friends", path: "/friends" },
    { icon: ProfileIcon, label: "Profile", path: "/profile", badge: unreadCount },
  ];

  if (location.pathname.startsWith("/web")) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 z-50 px-4" style={{ bottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}>
      <div className="pointer-events-auto mx-auto max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,15,18,0.94),rgba(0,0,0,0.92))] px-2 pb-2 pt-1.5 shadow-[0_18px_60px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
        <div className="flex h-[4.25rem] items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex h-full w-full flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-medium transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-x-2 inset-y-1 rounded-2xl bg-white/[0.04]"
                />
              )}

              <item.icon
                color="currentColor"
                className={clsx(
                  "relative z-10 h-5 w-5 transition-colors",
                  isActive ? "text-pink-300" : "text-zinc-500"
                )}
              />
              {item.badge && item.badge > 0 ? (
                <span
                  className="absolute right-[24%] top-1.5 z-10 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white shadow-[0_10px_24px_rgba(219,39,119,0.35)]"
                  style={{ background: "linear-gradient(90deg, #DB2777 0%, #9333EA 100%)" }}
                >
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}

              {isActive ? (
                <motion.div
                  layoutId="nav-active-bar"
                  className="absolute -top-0.5 h-1 w-10 rounded-full shadow-[0_0_14px_rgba(236,72,153,0.6)]"
                  style={{ background: "linear-gradient(90deg, #DB2777 0%, #9333EA 100%)" }}
                />
              ) : null}

              <span className={clsx("relative z-10", isActive ? "text-white" : "text-zinc-500")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      </div>
    </div>
  );
}
