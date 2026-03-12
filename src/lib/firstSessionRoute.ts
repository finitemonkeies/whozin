import { supabase } from "@/lib/supabase";

const DEFAULT_REDIRECTS = new Set(["/", "/intro", "/welcome"]);

export async function resolveFirstSessionRoute(redirect: string): Promise<string> {
  if (!DEFAULT_REDIRECTS.has(redirect)) return redirect;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) return redirect;

  const [friendIdsRes, attendeeCountRes, inviteCountRes] = await Promise.all([
    supabase.rpc("get_friend_ids"),
    supabase.from("attendees").select("user_id", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("product_events")
      .select("user_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("event_name", "invite_sent"),
  ]);

  const friendCount = Array.isArray(friendIdsRes.data) ? friendIdsRes.data.length : 0;
  const rsvpCount = attendeeCountRes.count ?? 0;
  const inviteCount = inviteCountRes.count ?? 0;

  if (friendCount === 0) return "/friends?onboarding=1";
  if (rsvpCount === 0) return "/explore?onboarding=1";
  if (inviteCount === 0) return "/profile?onboarding=1";

  return redirect;
}
