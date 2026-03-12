import { Suspense, lazy, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { RequireAuth } from "./components/RequireAuth";
import { BottomNav } from "./components/BottomNav";

const Home = lazy(() => import("./pages/Home").then((m) => ({ default: m.Home })));
const EventDetails = lazy(() =>
  import("./pages/EventDetails").then((m) => ({ default: m.EventDetails }))
);
const Profile = lazy(() => import("./pages/Profile").then((m) => ({ default: m.Profile })));
const EditProfile = lazy(() =>
  import("./pages/EditProfile").then((m) => ({ default: m.EditProfile }))
);
const Tickets = lazy(() => import("./pages/Tickets").then((m) => ({ default: m.Tickets })));
const Login = lazy(() => import("./pages/Login"));
const Welcome = lazy(() => import("./pages/Welcome").then((m) => ({ default: m.Welcome })));
const SignUp = lazy(() => import("./pages/SignUp").then((m) => ({ default: m.SignUp })));
const Explore = lazy(() => import("./pages/Explore").then((m) => ({ default: m.Explore })));
const Onboarding = lazy(() =>
  import("./pages/Onboarding").then((m) => ({ default: m.Onboarding }))
);
const Activity = lazy(() => import("./pages/Activity").then((m) => ({ default: m.Activity })));
const TicketDetail = lazy(() =>
  import("./pages/TicketDetail").then((m) => ({ default: m.TicketDetail }))
);
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const AddByInvite = lazy(() => import("./pages/AddByInvite"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const Friends = lazy(() => import("./pages/Friends"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminHealth = lazy(() => import("./pages/AdminHealth"));
const Setup = lazy(() => import("./pages/Setup"));
const DesktopLanding = lazy(() =>
  import("./desktop/Landing").then((m) => ({ default: m.DesktopLanding }))
);
const DesktopAuth = lazy(() => import("./desktop/Auth").then((m) => ({ default: m.DesktopAuth })));
const DesktopSync = lazy(() => import("./desktop/Sync").then((m) => ({ default: m.DesktopSync })));
const DesktopScanning = lazy(() =>
  import("./desktop/Scanning").then((m) => ({ default: m.DesktopScanning }))
);
const DesktopMatch = lazy(() => import("./desktop/Match").then((m) => ({ default: m.DesktopMatch })));
const DesktopEventDetail = lazy(() =>
  import("./desktop/EventDetail").then((m) => ({ default: m.DesktopEventDetail }))
);
const DesktopNoMatch = lazy(() =>
  import("./desktop/NoMatch").then((m) => ({ default: m.DesktopNoMatch }))
);
const DesktopTickets = lazy(() =>
  import("./desktop/Tickets").then((m) => ({ default: m.DesktopTickets }))
);
const DesktopSettings = lazy(() =>
  import("./desktop/Settings").then((m) => ({ default: m.DesktopSettings }))
);

function RouteFallback() {
  const location = useLocation();
  const path = location.pathname;

  if (path === "/" || path === "/explore") {
    return (
      <div className="min-h-[100svh] bg-black text-white pb-24">
        <div className="h-48 bg-[radial-gradient(1200px_520px_at_20%_20%,rgba(168,85,247,0.35),transparent_55%),radial-gradient(900px_520px_at_80%_10%,rgba(236,72,153,0.35),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0))]" />
        <div className="space-y-4 px-5 pt-5">
          <div className="h-28 rounded-[28px] border border-white/10 bg-zinc-900/60 animate-pulse" />
          <div className="h-52 rounded-2xl border border-white/10 bg-zinc-900/50 animate-pulse" />
          <div className="h-52 rounded-2xl border border-white/10 bg-zinc-900/50 animate-pulse" />
        </div>
      </div>
    );
  }

  if (path.startsWith("/event/")) {
    return (
      <div className="min-h-[100svh] bg-black text-white pb-24">
        <div className="h-72 bg-zinc-900/60 animate-pulse" />
        <div className="space-y-4 px-5 pt-5">
          <div className="h-8 w-2/3 rounded-xl bg-zinc-900/60 animate-pulse" />
          <div className="h-4 w-1/2 rounded-xl bg-zinc-900/50 animate-pulse" />
          <div className="h-28 rounded-2xl border border-white/10 bg-zinc-900/50 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-black text-white flex items-center justify-center">
      <div className="text-sm text-white/70">Loading...</div>
    </div>
  );
}

function withSuspense(node: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{node}</Suspense>;
}

function protectedRoute(node: ReactNode) {
  return withSuspense(<RequireAuth>{node}</RequireAuth>);
}

function AppShell() {
  const location = useLocation();
  const path = location.pathname;

  const hideBottomNav =
    path.startsWith("/web") ||
    path === "/login" ||
    path === "/signup" ||
    path === "/welcome" ||
    path === "/setup" ||
    path === "/intro" ||
    path.startsWith("/auth") ||
    path.startsWith("/add");

  return (
    <div
      className={[
        "bg-black text-white font-sans antialiased selection:bg-pink-500/30",
        "min-h-[100svh]",
        "pt-[env(safe-area-inset-top)]",
        "pb-[env(safe-area-inset-bottom)]",
      ].join(" ")}
    >
      <Routes>
        <Route path="/intro" element={withSuspense(<Onboarding />)} />
        <Route path="/welcome" element={withSuspense(<Welcome />)} />
        <Route path="/signup" element={withSuspense(<SignUp />)} />
        <Route path="/login" element={withSuspense(<Login />)} />
        <Route path="/auth/callback" element={withSuspense(<AuthCallback />)} />
        <Route path="/add/:handle" element={withSuspense(<AddByInvite />)} />

        <Route path="/setup" element={protectedRoute(<Setup />)} />
        <Route path="/" element={protectedRoute(<Home />)} />
        <Route path="/onboarding" element={protectedRoute(<Onboarding />)} />
        <Route path="/activity" element={protectedRoute(<Activity />)} />
        <Route path="/event/:id" element={protectedRoute(<EventDetails />)} />
        <Route path="/friends" element={protectedRoute(<Friends />)} />
        <Route path="/admin" element={protectedRoute(<Admin />)} />
        <Route path="/admin/health" element={protectedRoute(<AdminHealth />)} />
        <Route path="/profile" element={protectedRoute(<Profile />)} />
        <Route path="/profile/edit" element={protectedRoute(<EditProfile />)} />
        <Route path="/settings" element={protectedRoute(<Settings />)} />
        <Route path="/tickets" element={protectedRoute(<Tickets />)} />
        <Route path="/tickets/:id" element={protectedRoute(<TicketDetail />)} />
        <Route path="/explore" element={protectedRoute(<Explore />)} />

        <Route path="/web" element={<Navigate to="/web/landing" replace />} />
        <Route path="/web/landing" element={withSuspense(<DesktopLanding />)} />
        <Route path="/web/auth" element={withSuspense(<DesktopAuth />)} />
        <Route path="/web/sync" element={withSuspense(<DesktopSync />)} />
        <Route path="/web/scanning" element={withSuspense(<DesktopScanning />)} />
        <Route path="/web/match" element={withSuspense(<DesktopMatch />)} />
        <Route path="/web/event/:id" element={withSuspense(<DesktopEventDetail />)} />
        <Route path="/web/no-match" element={withSuspense(<DesktopNoMatch />)} />
        <Route path="/web/tickets" element={withSuspense(<DesktopTickets />)} />
        <Route path="/web/settings" element={withSuspense(<DesktopSettings />)} />

        <Route path="*" element={<Navigate to="/intro" replace />} />
      </Routes>

      {!hideBottomNav && <BottomNav />}
      <Toaster position="top-center" theme="dark" />
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
