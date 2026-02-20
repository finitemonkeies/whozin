import { sanitizeRedirectTarget as sanitizeRedirectTargetImpl } from "./redirect.shared.js";

export function sanitizeRedirectTarget(input: string | null | undefined): string {
  return sanitizeRedirectTargetImpl(input);
}
