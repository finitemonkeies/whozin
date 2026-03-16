import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Shield,
  Bell,
  LogOut,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { setPendingMarketingEmailOptIn } from "@/lib/emailPreferences";
import {
  fetchBlockedUsers,
  loadPrivacySettings,
  savePrivacySettings,
  unblockUser,
  type AttendanceVisibility,
  type BlockedUserRow,
} from "@/lib/privacySafety";
import {
  disablePushNotifications,
  enablePushNotifications,
  loadPushStatus,
  type PushStatus,
} from "@/lib/pushNotifications";

export function Settings() {
  const navigate = useNavigate();
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [confirmNotify, setConfirmNotify] = useState(true);
  const [visibility, setVisibility] = useState<AttendanceVisibility>("friends");
  const [marketingEmailsEnabled, setMarketingEmailsEnabled] = useState(false);
  const [loadingMarketingPreference, setLoadingMarketingPreference] = useState(true);
  const [savingMarketingPreference, setSavingMarketingPreference] = useState(false);
  const [loadingPrivacySettings, setLoadingPrivacySettings] = useState(true);
  const [savingPrivacySettings, setSavingPrivacySettings] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRow[]>([]);
  const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(true);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<PushStatus>({
    supported: false,
    permission: "unsupported",
    subscribed: false,
    needsStandaloneIosPrompt: false,
  });
  const [loadingPushStatus, setLoadingPushStatus] = useState(true);
  const [savingPushStatus, setSavingPushStatus] = useState(false);
  const [showPushInstallHint, setShowPushInstallHint] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("whozin:push-install-hint-dismissed") !== "1";
  });

  useEffect(() => {
    let cancelled = false;

    async function loadMarketingPreference() {
      setLoadingMarketingPreference(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        if (!cancelled) setLoadingMarketingPreference(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("email_product_updates_opt_in,email_retention_opt_in,email_unsubscribed_at")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        if (!cancelled) {
          setLoadingMarketingPreference(false);
          toast.error("Could not load email preferences", { description: error.message });
        }
        return;
      }

      if (!cancelled) {
        const enabled =
          !!data?.email_product_updates_opt_in &&
          !!data?.email_retention_opt_in &&
          !data?.email_unsubscribed_at;
        setMarketingEmailsEnabled(enabled);
        setPendingMarketingEmailOptIn(enabled);
        setLoadingMarketingPreference(false);
      }
    }

    async function loadSafetySettings() {
      setLoadingPrivacySettings(true);
      setLoadingBlockedUsers(true);

      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        if (!cancelled) {
          setLoadingPrivacySettings(false);
          setLoadingBlockedUsers(false);
        }
        return;
      }

      try {
        const [privacySettings, blocked] = await Promise.all([
          loadPrivacySettings(user.id),
          fetchBlockedUsers(),
        ]);

        if (!cancelled) {
          setVisibility(privacySettings.attendanceVisibility);
          setConfirmNotify(privacySettings.confirmBeforeNotify);
          setSmsEnabled(privacySettings.smsNotificationsEnabled);
          setBlockedUsers(blocked);
        }
      } catch (error: any) {
        if (!cancelled) {
          toast.error("Could not load privacy settings", {
            description: error?.message ?? "Please try again.",
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingPrivacySettings(false);
          setLoadingBlockedUsers(false);
        }
      }
    }

    async function loadBrowserPushStatus() {
      setLoadingPushStatus(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      try {
        const status = await loadPushStatus(user?.id ?? null);
        if (!cancelled) setPushStatus(status);
      } catch {
        if (!cancelled) {
          setPushStatus({
            supported: false,
            permission: "unsupported",
            subscribed: false,
            needsStandaloneIosPrompt: false,
          });
        }
      } finally {
        if (!cancelled) setLoadingPushStatus(false);
      }
    }

    void loadMarketingPreference();
    void loadSafetySettings();
    void loadBrowserPushStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateMarketingEmails = async (nextValue: boolean) => {
    if (savingMarketingPreference) return;

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      toast.error("Please sign in again to update email preferences.");
      return;
    }

    const timestamp = new Date().toISOString();
    setSavingMarketingPreference(true);

    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          email_retention_opt_in: nextValue,
          email_product_updates_opt_in: nextValue,
          email_marketing_consent_at: nextValue ? timestamp : null,
          email_marketing_consent_source: "settings",
          email_unsubscribed_at: nextValue ? null : timestamp,
          updated_at: timestamp,
        },
        { onConflict: "id" }
      );

    setSavingMarketingPreference(false);

    if (error) {
      toast.error("Could not update email preferences", { description: error.message });
      return;
    }

    setMarketingEmailsEnabled(nextValue);
    setPendingMarketingEmailOptIn(nextValue);
    toast.success(nextValue ? "Marketing emails enabled" : "Marketing emails turned off");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out");
    navigate("/welcome", { replace: true });
  };

  const persistPrivacySettings = async (next: {
    visibility?: AttendanceVisibility;
    confirmNotify?: boolean;
    smsEnabled?: boolean;
  }) => {
    if (savingPrivacySettings) return;

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      toast.error("Please sign in again to update privacy settings.");
      return;
    }

    const nextSettings = {
      attendanceVisibility: next.visibility ?? visibility,
      confirmBeforeNotify: next.confirmNotify ?? confirmNotify,
      smsNotificationsEnabled: next.smsEnabled ?? smsEnabled,
    };

    setSavingPrivacySettings(true);

    try {
      await savePrivacySettings(user.id, nextSettings, user.email ?? null);
      setVisibility(nextSettings.attendanceVisibility);
      setConfirmNotify(nextSettings.confirmBeforeNotify);
      setSmsEnabled(nextSettings.smsNotificationsEnabled);
      toast.success("Privacy settings updated");
    } catch (error: any) {
      toast.error("Could not update privacy settings", {
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setSavingPrivacySettings(false);
    }
  };

  const handleUnblockUser = async (blockedUserId: string) => {
    if (unblockingUserId) return;
    setUnblockingUserId(blockedUserId);
    try {
      await unblockUser(blockedUserId);
      setBlockedUsers((prev) => prev.filter((row) => row.user_id !== blockedUserId));
      toast.success("User unblocked");
    } catch (error: any) {
      toast.error("Could not unblock user", {
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setUnblockingUserId(null);
    }
  };

  const handleTogglePush = async () => {
    if (savingPushStatus) return;
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      toast.error("Please sign in again to update push alerts.");
      return;
    }

    setSavingPushStatus(true);
    try {
      if (pushStatus.subscribed) {
        await disablePushNotifications(user.id);
        toast.success("Browser push alerts turned off");
      } else {
        await enablePushNotifications(user.id);
        toast.success("Browser push alerts enabled");
      }
      const nextStatus = await loadPushStatus(user.id);
      setPushStatus(nextStatus);
    } catch (error: any) {
      toast.error("Could not update push alerts", {
        description: error?.message ?? "Please try again.",
      });
    } finally {
      setSavingPushStatus(false);
    }
  };

  const dismissPushInstallHint = () => {
    setShowPushInstallHint(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("whozin:push-install-hint-dismissed", "1");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 p-4 border-b border-white/5 flex items-center gap-4">
        <button onClick={() => navigate("/profile")} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="p-6 space-y-8">
        {/* Account Section */}
        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 px-2">Account</h2>
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
            <div
              onClick={() => navigate("/profile/edit")}
              className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-zinc-400" />
                <div>
                  <div className="font-medium">Profile Details</div>
                  <div className="text-xs text-zinc-500">Name, Handle, Avatar</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-zinc-600" />
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 px-2">Privacy & Notifications</h2>
          {pushStatus.needsStandaloneIosPrompt && showPushInstallHint ? (
            <div className="mb-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-amber-100">Add Whozin to Home Screen for push</div>
                  <div className="mt-1 text-xs text-amber-200/80">
                    On iPhone, web push only works from the Home Screen app.
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-amber-50/90">
                    <div>1. Tap the Share button in Safari</div>
                    <div>2. Choose `Add to Home Screen`</div>
                    <div>3. Open Whozin from the new Home Screen icon</div>
                    <div>4. Come back here and turn on `Browser Push Alerts`</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={dismissPushInstallHint}
                  className="rounded-lg border border-amber-400/20 bg-black/20 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-black/30"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ) : null}
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-zinc-400" />
                <div>
                  <div className="font-medium">Default Visibility</div>
                  <div className="text-xs text-zinc-500">Who sees your events</div>
                </div>
              </div>
              <select
                value={visibility}
                onChange={(e) =>
                  void persistPrivacySettings({ visibility: e.target.value as AttendanceVisibility })
                }
                disabled={loadingPrivacySettings || savingPrivacySettings}
                className="bg-zinc-800 text-white text-sm rounded-lg px-2 py-1 border border-white/10 focus:outline-none focus:border-pink-500 disabled:opacity-60"
              >
                <option value="friends">Friends Only</option>
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-zinc-400" />
                <div>
                  <div className="font-medium">Confirm before notifying</div>
                  <div className="text-xs text-zinc-500">Ask before sharing new tickets</div>
                </div>
              </div>
              <Toggle
                checked={confirmNotify}
                disabled={loadingPrivacySettings || savingPrivacySettings}
                onChange={() => void persistPrivacySettings({ confirmNotify: !confirmNotify })}
              />
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-zinc-400" />
                <div>
                  <div className="font-medium">Allow SMS Notifications</div>
                  <div className="text-xs text-zinc-500">Receive texts about friends</div>
                </div>
              </div>
              <Toggle
                checked={smsEnabled}
                disabled={loadingPrivacySettings || savingPrivacySettings}
                onChange={() => void persistPrivacySettings({ smsEnabled: !smsEnabled })}
              />
            </div>

            <div className="p-4 flex items-center justify-between border-t border-white/5">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-zinc-400" />
                <div>
                  <div className="font-medium">Marketing Emails</div>
                  <div className="text-xs text-zinc-500">
                    Optional updates about events, friends, features, and offers
                  </div>
                </div>
              </div>
              <Toggle
                checked={marketingEmailsEnabled}
                disabled={loadingMarketingPreference || savingMarketingPreference}
                onChange={() => void updateMarketingEmails(!marketingEmailsEnabled)}
              />
            </div>

            <div className="p-4 flex items-center justify-between border-t border-white/5">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-zinc-400" />
                <div>
                  <div className="font-medium">Browser Push Alerts</div>
                  <div className="text-xs text-zinc-500">
                    {pushStatus.needsStandaloneIosPrompt
                      ? "On iPhone, add Whozin to your Home Screen first."
                      : pushStatus.permission === "denied"
                        ? "Notifications are blocked in browser settings right now."
                      : "Get heads up when your people start moving."}
                  </div>
                </div>
              </div>
              <Toggle
                checked={pushStatus.subscribed}
                disabled={!pushStatus.supported || loadingPushStatus || savingPushStatus}
                onChange={() => void handleTogglePush()}
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 px-2">Safety</h2>
          <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/5">
              <div className="font-medium">Blocked Users</div>
              <div className="text-xs text-zinc-500 mt-1">
                Blocking removes them from your circle and hides each other&apos;s attendance.
              </div>
            </div>

            {loadingBlockedUsers ? (
              <div className="p-4 text-sm text-zinc-500">Loading blocked users...</div>
            ) : blockedUsers.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500">No blocked users right now.</div>
            ) : (
              blockedUsers.map((row, index) => {
                const displayName =
                  row.profile?.display_name?.trim() || row.profile?.username || "Blocked user";
                const handle = row.profile?.username ? `@${row.profile.username}` : "";
                const avatar = row.profile?.avatar_url ?? "";
                return (
                  <div
                    key={row.user_id}
                    className={`p-4 flex items-center justify-between gap-3 ${
                      index < blockedUsers.length - 1 ? "border-b border-white/5" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {avatar ? (
                        <img src={avatar} alt={displayName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-800" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{displayName}</div>
                        {handle ? <div className="text-xs text-zinc-500 truncate">{handle}</div> : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleUnblockUser(row.user_id)}
                      disabled={unblockingUserId === row.user_id}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 disabled:opacity-60"
                    >
                      {unblockingUserId === row.user_id ? "Unblocking..." : "Unblock"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section>
          <div className="rounded-2xl border border-white/5 bg-zinc-900/30 p-4">
            <div className="text-sm font-medium text-white">More controls are coming.</div>
            <p className="mt-1 text-xs text-zinc-500">
              We are keeping Settings focused on the parts that already work end-to-end.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="mt-3 w-full p-4 flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-red-500" />
              <span className="font-medium text-red-500">Log Out</span>
            </div>
          </button>

          <div className="text-center mt-8">
            <p className="text-xs text-zinc-700">Whozin v1.0.0 (MVP)</p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`w-12 h-7 rounded-full relative transition-colors disabled:opacity-50 ${checked ? "bg-pink-500" : "bg-zinc-700"}`}
    >
      <div
        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${checked ? "right-1" : "left-1"}`}
      />
    </button>
  );
}
