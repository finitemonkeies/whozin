
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Home } from "./pages/Home";
import { EventDetails } from "./pages/EventDetails";
import { Profile } from "./pages/Profile";
import { EditProfile } from "./pages/EditProfile";
import { Tickets } from "./pages/Tickets";
import { BottomNav } from "./components/BottomNav";
import { Toaster } from "sonner";

import { Login } from "./pages/Login";
import { Welcome } from "./pages/Welcome";
import { SignUp } from "./pages/SignUp";
import { Explore } from "./pages/Explore";
import { Onboarding } from "./pages/Onboarding";
import { Activity } from "./pages/Activity";
import { TicketDetail } from "./pages/TicketDetail";
import { Settings } from "./pages/Settings";
import { DesktopLanding } from "./desktop/Landing";
import { DesktopAuth } from "./desktop/Auth";
import { DesktopSync } from "./desktop/Sync";
import { DesktopScanning } from "./desktop/Scanning";
import { DesktopMatch } from "./desktop/Match";
import { DesktopEventDetail } from "./desktop/EventDetail";
import { DesktopNoMatch } from "./desktop/NoMatch";
import { DesktopTickets } from "./desktop/Tickets";
import { DesktopSettings } from "./desktop/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-black min-h-screen text-white font-sans antialiased selection:bg-pink-500/30">
        <Routes>
          {/* Mobile Routes */}
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/" element={<Home />} />
          <Route path="/event/:id" element={<EventDetails />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/edit" element={<EditProfile />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/tickets" element={<Tickets />} />
          <Route path="/tickets/:id" element={<TicketDetail />} />
          <Route path="/explore" element={<Explore />} />

          {/* Desktop Web Routes */}
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

          <Route path="*" element={<Navigate to="/web/landing" replace />} />
        </Routes>
        <BottomNav />
        <Toaster position="top-center" theme="dark" />
      </div>
    </BrowserRouter>
  );
}
