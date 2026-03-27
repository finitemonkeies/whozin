export type AccountType = "person" | "partner";
export type PartnerType = "promoter" | "venue" | "collective" | "dj" | "artist" | "brand" | null;
export type PartnerStatus = "none" | "invited" | "active";

export type PartnerProfileFields = {
  account_type?: AccountType | null;
  partner_type?: PartnerType;
  partner_status?: PartnerStatus | null;
  partner_badge_label?: string | null;
  partner_slug?: string | null;
  partner_contact_email?: string | null;
  partner_instagram_url?: string | null;
  partner_website_url?: string | null;
  partner_bio_short?: string | null;
};

export function isPartnerProfile(profile?: PartnerProfileFields | null) {
  return profile?.account_type === "partner";
}

export function getPartnerBadgeLabel(profile?: PartnerProfileFields | null) {
  if (!isPartnerProfile(profile)) return "";
  return profile?.partner_badge_label?.trim() || "Partner";
}

export function getPartnerTypeLabel(partnerType?: PartnerType) {
  switch (partnerType) {
    case "promoter":
      return "Promoter";
    case "venue":
      return "Venue";
    case "collective":
      return "Collective";
    case "dj":
      return "DJ";
    case "artist":
      return "Artist";
    case "brand":
      return "Brand";
    default:
      return "Partner";
  }
}

export function normalizePartnerSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
