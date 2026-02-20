export function sanitizeRedirectTarget(input) {
  if (!input) return "/";

  const candidate = input.trim();
  if (!candidate.startsWith("/")) return "/";
  if (candidate.startsWith("//")) return "/";
  if (candidate.includes("\\") || candidate.includes("\r") || candidate.includes("\n")) return "/";
  if (candidate.startsWith("/setup")) return "/";

  return candidate;
}
