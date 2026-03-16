const DEFAULT_REDIRECTS = new Set(["/", "/intro", "/welcome"]);

export function decideFirstSessionRoute(redirect, counts) {
  if (!DEFAULT_REDIRECTS.has(redirect)) return redirect;
  if (counts.friendCount === 0) return "/friends?onboarding=1";
  if (counts.rsvpCount === 0) return "/explore?onboarding=1";
  if (counts.inviteCount === 0) return "/profile?onboarding=1";
  return redirect;
}
