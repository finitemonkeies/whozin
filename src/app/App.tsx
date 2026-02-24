import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

import { RequireAuth } from "./components/RequireAuth";
import { BottomNav } from "./components/BottomNav";

import { Home } from "./pages/Home";
import { EventDetails } from "./pages/EventDetails";
import { Profile } from "./pages/Profile";
import { EditProfile } from "./pages/EditProfile";
import { Tickets } from "./pages/Tickets";

import Login from "./pages/Login";
import { Welcome } from "./pages/Welcome";
import { SignUp } from "./pages/SignUp";
import { Explore } from "./pages/Explore";
import { Onboarding } from "./pages/Onboarding";
import { Activity } from "./pages/Activity";
import { TicketDetail } from "./pages/TicketDetail";
import { Settings } from "./pages/Settings";
import AddByInvite from "./pages/AddByInvite";
import AuthCallback from "./pages/AuthCallback";

import Friends from "./pages/Friends";
import Admin from "./pages/Admin";

import Setup from "./pages/Setup";

import { DesktopLanding } from "./desktop/Landing";
import { DesktopAuth } from "./desktop/Auth";
import { DesktopSync } from "./desktop/Sync";
import { DesktopScanning } from "./desktop/Scanning";
import { DesktopMatch } from "./desktop/Match";
import { DesktopEventDetail } from "./desktop/EventDetail";
import { DesktopNoMatch } from "./desktop/NoMatch";
import { DesktopTickets } from "./desktop/Tickets";
import { DesktopSettings } from "./desktop/Settings";

/**
 * Hide BottomNav on public/desktop/auth callback routes
 * so OAuth, login, and desktop flows stay clean.
 */
function AppShell() {
  const location = useLocation();
  const path = location.pathname;

  const hideBottomNav =
    path.startsWith("/web") ||
    path === "/login" ||
    path === "/signup" ||
    path === "/welcome" ||
    path === "/setup" ||
    path === "/intro" || // NEW: intro is a focused explainer
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
        {/* -------------------- */}
        {/* Public Routes        */}
        {/* -------------------- */}
        <Route path="/intro" element={<Onboarding />} />
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />

        {/* OAuth callback MUST be public */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Invite route MUST be public (it will redirect to /login if needed) */}
        <Route path="/add/:handle" element={<AddByInvite />} />

        {/* -------------------- */}
        {/* Protected Mobile     */}
        {/* -------------------- */}
        <Route
          path="/setup"
          element={
            <RequireAuth>
              <Setup />
            </RequireAuth>
          }
        />

        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />
        <Route
          path="/onboarding"
          element={
            <RequireAuth>
              <Onboarding />
            </RequireAuth>
          }
        />
        <Route
          path="/activity"
          element={
            <RequireAuth>
              <Activity />
            </RequireAuth>
          }
        />
        <Route
          path="/event/:id"
          element={
            <RequireAuth>
              <EventDetails />
            </RequireAuth>
          }
        />
        <Route
          path="/friends"
          element={
            <RequireAuth>
              <Friends />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <Admin />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route
          path="/profile/edit"
          element={
            <RequireAuth>
              <EditProfile />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <Settings />
            </RequireAuth>
          }
        />
        <Route
          path="/tickets"
          element={
            <RequireAuth>
              <Tickets />
            </RequireAuth>
          }
        />
        <Route
          path="/tickets/:id"
          element={
            <RequireAuth>
              <TicketDetail />
            </RequireAuth>
          }
        />
        <Route
          path="/explore"
          element={
            <RequireAuth>
              <Explore />
            </RequireAuth>
          }
        />

        {/* -------------------- */}
        {/* Desktop Web Routes   */}
        {/* -------------------- */}
        <Route path="/web" element={<Navigate to="/web/landing" replace />} />
        <Route path="/web/landing" element={<DesktopLanding />} />
        <Route path="/web/auth" element={<DesktopAuth />} />
        <Route path="/web/sync" element={<DesktopSync />} />
        <Route path="/web/scanning" element={<DesktopScanning />} />
        <Route path="/web/match" element={<DesktopMatch />} />
        <Route path="/web/event/:id" element={<DesktopEventDetail />} />
        <Route path="/web/no-match" element={<DesktopNoMatch />} />
        <Route path="/web/tickets" element={<DesktopTickets />} />
        <Route path="/web/settings" element={<DesktopSettings />} />

        {/* Catch-all */}
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
