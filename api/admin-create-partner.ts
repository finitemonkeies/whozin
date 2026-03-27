import { createClient } from "@supabase/supabase-js";

type VercelRequest = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelResponse = {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
};

function getSingle(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function isAllowedAdminEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return normalized === "hello@whozin.app" || normalized === "jvincenthallahan@gmail.com";
}

function sanitizeUsername(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function normalizePartnerSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randomPassword() {
  return `Whozin!${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if ((req.method ?? "GET").toUpperCase() !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const bearer = getSingle(req.headers.authorization).replace(/^Bearer\s+/i, "").trim();
  if (!bearer) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim() || "";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.SERVICE_ROLE_KEY?.trim() ||
    "";

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: "Missing Supabase service configuration" });
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user: adminUser },
    error: authError,
  } = await supabase.auth.getUser(bearer);
  const adminEmail = String(adminUser?.email ?? "").trim().toLowerCase();
  if (authError || !adminUser?.id || !adminEmail || !isAllowedAdminEmail(adminEmail)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const accountType = String(body.accountType ?? "partner").trim().toLowerCase() === "person" ? "person" : "partner";
  const username = sanitizeUsername(String(body.username ?? ""));
  const displayName = String(body.displayName ?? "").trim();
  const contactEmail = String(body.contactEmail ?? "").trim().toLowerCase();
  const partnerType = String(body.partnerType ?? "promoter").trim().toLowerCase() || "promoter";
  const badgeLabel = String(body.badgeLabel ?? "Partner").trim() || "Partner";
  const partnerSlug = normalizePartnerSlug(String(body.partnerSlug ?? "")) || null;
  const instagramUrl = String(body.instagramUrl ?? "").trim() || null;
  const websiteUrl = String(body.websiteUrl ?? "").trim() || null;
  const bioShort = String(body.bioShort ?? "").trim() || null;

  if (!username || username.length < 3) {
    res.status(400).json({ error: "Username must be at least 3 characters" });
    return;
  }

  if (!displayName) {
    res.status(400).json({ error: "Display name is required" });
    return;
  }

  if (!contactEmail) {
    res.status(400).json({ error: "Contact email is required" });
    return;
  }

  const existingProfile = await supabase
    .from("profiles")
    .select("id")
    .or(`username.eq.${username},email.eq.${contactEmail}`)
    .limit(1)
    .maybeSingle();

  if (existingProfile.error) {
    res.status(500).json({ error: existingProfile.error.message });
    return;
  }

  if (existingProfile.data?.id) {
    res.status(409).json({ error: "A profile with that username or email already exists" });
    return;
  }

  const createdUser = await supabase.auth.admin.createUser({
    email: contactEmail,
    password: randomPassword(),
    email_confirm: true,
    user_metadata: {
      username,
      display_name: displayName,
      account_type: accountType,
    },
  });

  if (createdUser.error || !createdUser.data.user?.id) {
    res.status(500).json({ error: createdUser.error?.message ?? "Failed to create auth user" });
    return;
  }

  const profileId = createdUser.data.user.id;
  const profileUpsert = await supabase.from("profiles").upsert(
    {
      id: profileId,
      email: contactEmail,
      username,
      display_name: displayName,
      onboarding_complete: false,
      account_type: accountType,
      partner_type: accountType === "partner" ? partnerType : null,
      partner_status: accountType === "partner" ? "active" : "none",
      partner_badge_label: accountType === "partner" ? badgeLabel : null,
      partner_slug: accountType === "partner" ? partnerSlug : null,
      partner_contact_email: accountType === "partner" ? contactEmail : null,
      partner_instagram_url: accountType === "partner" ? instagramUrl : null,
      partner_website_url: accountType === "partner" ? websiteUrl : null,
      partner_bio_short: accountType === "partner" ? bioShort : null,
    },
    { onConflict: "id" }
  );

  if (profileUpsert.error) {
    res.status(500).json({ error: profileUpsert.error.message });
    return;
  }

  res.status(200).json({
    ok: true,
    profile: {
      id: profileId,
      username,
      display_name: displayName,
      account_type: accountType,
      partner_type: accountType === "partner" ? partnerType : null,
      partner_status: accountType === "partner" ? "active" : "none",
      partner_badge_label: accountType === "partner" ? badgeLabel : null,
      partner_slug: accountType === "partner" ? partnerSlug : null,
      partner_bio_short: accountType === "partner" ? bioShort : null,
      partner_instagram_url: accountType === "partner" ? instagramUrl : null,
      partner_website_url: accountType === "partner" ? websiteUrl : null,
      partner_contact_email: accountType === "partner" ? contactEmail : null,
      avatar_url: null,
    },
  });
}
