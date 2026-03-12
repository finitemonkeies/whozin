import { supabase } from "@/lib/supabase";
import { buildSiteUrl } from "@/lib/site";
import { logProductEvent } from "@/lib/productEvents";
import { featureFlags } from "@/lib/featureFlags";

type InviteSource = "rsvp_share" | "profile_share" | "event_detail_share" | "share_link";

type PendingReferral = {
  token: string;
  eventId: string | null;
  source: string | null;
  openedWhileLoggedOut: boolean;
  seenAt: string;
};

type ClaimReferralResult = {
  claimed: boolean;
  inviterUserId: string | null;
  eventId: string | null;
};

const PENDING_REFERRAL_KEY = "whozin_pending_referral";
const HOURLY_INVITE_LIMIT = 8;
const DAILY_INVITE_LIMIT = 30;

function randomToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

function isUuid(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toNullableTrimmed(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function storePendingReferral(params: {
  token: string;
  eventId?: string | null;
  source?: string | null;
  openedWhileLoggedOut?: boolean;
}) {
  const payload: PendingReferral = {
    token: params.token,
    eventId: isUuid(params.eventId) ? params.eventId : null,
    source: toNullableTrimmed(params.source),
    openedWhileLoggedOut: params.openedWhileLoggedOut === true,
    seenAt: new Date().toISOString(),
  };
  localStorage.setItem(PENDING_REFERRAL_KEY, JSON.stringify(payload));
}

export function getPendingReferral(): PendingReferral | null {
  try {
    const raw = localStorage.getItem(PENDING_REFERRAL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingReferral;
    if (!parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPendingReferral() {
  localStorage.removeItem(PENDING_REFERRAL_KEY);
}

async function getCurrentUserAndHandle() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("You need to sign in first.");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  const username = (profile?.username ?? "").trim();
  if (!username) throw new Error("Set your username first.");

  return { userId: user.id, username };
}

async function enforceInviteRateLimit(userId: string) {
  const now = Date.now();
  const hourAgoIso = new Date(now - 60 * 60 * 1000).toISOString();
  const dayAgoIso = new Date(now - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: hourCount, error: hourErr }, { count: dayCount, error: dayErr }] =
    await Promise.all([
      supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("inviter_user_id", userId)
        .gte("created_at", hourAgoIso),
      supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("inviter_user_id", userId)
        .gte("created_at", dayAgoIso),
    ]);

  if (hourErr) throw hourErr;
  if (dayErr) throw dayErr;

  if ((hourCount ?? 0) >= HOURLY_INVITE_LIMIT) {
    throw new Error("Invite limit reached. Please wait before sharing more links.");
  }
  if ((dayCount ?? 0) >= DAILY_INVITE_LIMIT) {
    throw new Error("Daily invite limit reached. Try again tomorrow.");
  }
}

export async function createReferralInviteLink(args: {
  eventId?: string | null;
  source: InviteSource;
}): Promise<{ token: string; url: string }> {
  if (featureFlags.killSwitchInvites) {
    throw new Error("Invites are temporarily unavailable.");
  }
  const { userId, username } = await getCurrentUserAndHandle();
  await enforceInviteRateLimit(userId);

  const token = randomToken();
  const cleanEventId = isUuid(args.eventId) ? args.eventId : null;

  const { error } = await supabase.from("referrals").insert({
    token,
    inviter_user_id: userId,
    event_id: cleanEventId,
    source: args.source,
  });
  if (error) throw error;

  const url = new URL(buildSiteUrl(`/share/@${username}`));
  url.searchParams.set("ref", token);
  url.searchParams.set("src", args.source);
  if (cleanEventId) url.searchParams.set("event", cleanEventId);

  return { token, url: url.toString() };
}

export async function claimPendingReferral(
  sourceOverride?: string
): Promise<ClaimReferralResult | null> {
  const pending = getPendingReferral();
  if (!pending) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) return null;

  const source = toNullableTrimmed(sourceOverride) ?? pending.source ?? "share_link";
  const cleanEventId = isUuid(pending.eventId) ? pending.eventId : null;

  const { data, error } = await supabase.rpc("claim_referral", {
    p_token: pending.token,
    p_event_id: cleanEventId,
    p_source: source,
  });
  if (error) throw error;

  const row = Array.isArray(data) && data.length > 0 ? data[0] : null;
  if (!row) {
    clearPendingReferral();
    return null;
  }

  const claimed = row.claimed === true;
  const inviterUserId = (row.inviter_user_id as string | null) ?? null;
  const eventId = (row.event_id as string | null) ?? null;

  await logProductEvent({
    eventName: "invite_link_opened",
    eventId: eventId,
    source: source,
    metadata: {
      token: pending.token,
      claimed,
      inviter_user_id: inviterUserId,
    },
  });

  if (claimed) {
    await logProductEvent({
      eventName: "invite_signup_completed",
      eventId: eventId,
      source: source,
      metadata: {
        token: pending.token,
        inviter_user_id: inviterUserId,
        opened_while_logged_out: pending.openedWhileLoggedOut,
      },
    });
  }

  clearPendingReferral();
  return {
    claimed,
    inviterUserId,
    eventId,
  };
}

export async function registerReferralOpen(params: {
  token: string;
  eventId?: string | null;
  source?: string | null;
}) {
  const source = toNullableTrimmed(params.source) ?? "share_link";
  const cleanEventId = isUuid(params.eventId) ? params.eventId : null;

  const { error } = await supabase.rpc("claim_referral", {
    p_token: params.token,
    p_event_id: cleanEventId,
    p_source: source,
  });

  if (error) throw error;
}
