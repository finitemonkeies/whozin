export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return normalized === "hello@whozin.app" || normalized === "jvincenthallahan@gmail.com";
}

