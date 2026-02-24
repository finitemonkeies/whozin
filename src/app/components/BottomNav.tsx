import { Home, Ticket, User, Search, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import clsx from "clsx";

export function BottomNav() {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: "Feed", path: "/" },
    { icon: Search, label: "Explore", path: "/explore" },
    { icon: Users, label: "Friends", path: "/friends" },
    { icon: Ticket, label: "Tickets", path: "/tickets" },
    { icon: User, label: "Profile", path: "/profile" },
  ];

  if (location.pathname.startsWith("/web")) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 backdrop-blur-xl pb-6 pt-2">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className="relative flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute -top-px h-0.5 w-8 bg-pink-500 rounded-full shadow-[0_0_10px_rgba(236,72,153,0.7)]"
                />
              )}

              <item.icon
                className={clsx(
                  "w-6 h-6 mb-1 transition-colors",
                  isActive ? "text-pink-500" : "text-zinc-500"
                )}
              />

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
