import { supabase } from "@/lib/supabase";

export type AttendanceVisibility = "friends" | "public" | "private";

export type PrivacySettings = {
  attendanceVisibility: AttendanceVisibility;
  confirmBeforeNotify: boolean;
  smsNotificationsEnabled: boolean;
};

export type BlockedUserRow = {
  user_id: string;
  created_at?: string | null;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
};

const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  attendanceVisibility: "friends",
  confirmBeforeNotify: true,
  smsNotificationsEnabled: false,
};

function normalizeVisibility(value: string | null | undefined): AttendanceVisibility {
  if (value === "public" || value === "private") return value;
  return "friends";
}

export async function loadPrivacySettings(userId: string): Promise<PrivacySettings> {
  const { data, error } = await supabase
    .from("profiles")
    .select("attendance_visibility,confirm_before_notify,sms_notifications_enabled")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  return {
    attendanceVisibility: normalizeVisibility(data?.attendance_visibility),
    confirmBeforeNotify:
      typeof data?.confirm_before_notify === "boolean"
        ? data.confirm_before_notify
        : DEFAULT_PRIVACY_SETTINGS.confirmBeforeNotify,
    smsNotificationsEnabled:
      typeof data?.sms_notifications_enabled === "boolean"
        ? data.sms_notifications_enabled
        : DEFAULT_PRIVACY_SETTINGS.smsNotificationsEnabled,
  };
}

export async function savePrivacySettings(userId: string, settings: PrivacySettings, email?: string | null) {
  const timestamp = new Date().toISOString();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: email ?? null,
      attendance_visibility: settings.attendanceVisibility,
      confirm_before_notify: settings.confirmBeforeNotify,
      sms_notifications_enabled: settings.smsNotificationsEnabled,
      updated_at: timestamp,
    },
    { onConflict: "id" }
  );

  if (error) throw error;
}

export async function getBlockedUserIds(): Promise<Set<string>> {
  const { data, error } = await supabase.rpc("get_blocked_user_ids");
  if (error) throw error;
  const ids = Array.isArray(data) ? data.map((value) => String(value)).filter(Boolean) : [];
  return new Set(ids);
}

export async function fetchBlockedUsers(): Promise<BlockedUserRow[]> {
  const { data, error } = await supabase
    .from("user_blocks")
    .select("blocked_user_id,created_at, profile:profiles!user_blocks_blocked_user_id_fkey(display_name,username,avatar_url)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as Array<{
    blocked_user_id: string;
    created_at?: string | null;
    profile?: BlockedUserRow["profile"];
  }>).map((row) => ({
    user_id: row.blocked_user_id,
    created_at: row.created_at ?? null,
    profile: row.profile ?? null,
  }));
}

export async function blockUser(blockedUserId: string) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.id) throw new Error("Please sign in again.");
  if (user.id === blockedUserId) throw new Error("You cannot block yourself.");

  const { error } = await supabase.from("user_blocks").insert({
    blocker_user_id: user.id,
    blocked_user_id: blockedUserId,
  });
  if (error) throw error;

  // Best-effort cleanup so blocked users leave the social graph immediately.
  await supabase
    .from("friendships")
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${blockedUserId}),and(user_id.eq.${blockedUserId},friend_id.eq.${user.id})`);
}

export async function unblockUser(blockedUserId: string) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.id) throw new Error("Please sign in again.");

  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_user_id", user.id)
    .eq("blocked_user_id", blockedUserId);
  if (error) throw error;
}

export async function reportUser(args: { targetUserId: string; reason: string; details?: string | null }) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.id) throw new Error("Please sign in again.");

  const { error } = await supabase.from("safety_reports").insert({
    reporter_user_id: user.id,
    target_type: "user",
    target_user_id: args.targetUserId,
    reason: args.reason,
    details: args.details?.trim() || null,
  });
  if (error) throw error;
}

export async function reportEvent(args: { targetEventId: string; reason: string; details?: string | null }) {
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user?.id) throw new Error("Please sign in again.");

  const { error } = await supabase.from("safety_reports").insert({
    reporter_user_id: user.id,
    target_type: "event",
    target_event_id: args.targetEventId,
    reason: args.reason,
    details: args.details?.trim() || null,
  });
  if (error) throw error;
}

