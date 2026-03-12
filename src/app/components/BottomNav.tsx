import { Home, User, Search, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { getUnreadNotificationCount } from "@/lib/notifications";

export function BottomNav() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

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

    void load();
    window.addEventListener("whozin:notifications-updated", onUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("whozin:notifications-updated", onUpdated);
    };
  }, []);

  const navItems = [
    { icon: Home, label: "Feed", path: "/" },
    { icon: Search, label: "Explore", path: "/explore" },
    { icon: Users, label: "Friends", path: "/friends" },
    { icon: User, label: "Profile", path: "/profile", badge: unreadCount },
  ];

  if (location.pathname.startsWith("/web")) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/90 backdrop-blur-xl pb-[calc(0.9rem+env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto flex h-[4.5rem] max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex h-full w-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.7)]"
                />
              )}

              <item.icon
                className={clsx(
                  "h-5 w-5 transition-colors",
                  isActive ? "text-pink-500" : "text-zinc-500"
                )}
              />
              {item.badge && item.badge > 0 ? (
                <span className="absolute right-[24%] top-2 inline-flex min-w-5 items-center justify-center rounded-full bg-pink-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}

              <span className={isActive ? "text-white" : "text-zinc-500"}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
