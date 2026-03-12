import { createReferralInviteLink } from "@/lib/referrals";
import { logProductEvent } from "@/lib/productEvents";
import { track } from "@/lib/analytics";

type InviteShareArgs = {
  eventId?: string | null;
  eventTitle?: string | null;
  source: "rsvp_share" | "profile_share" | "event_detail_share" | "share_link";
};

function buildShareText(eventTitle?: string | null) {
  const title = (eventTitle ?? "").trim();
  if (!title) {
    return {
      title: "Join me on Whozin",
      text: "See who is going and make the night the move on Whozin.",
    };
  }

  return {
    title: `Join me at ${title}`,
    text: `I found ${title} on Whozin. Come through:`,
  };
}

export async function copyInviteLink({
  eventId,
  eventTitle,
  source,
}: InviteShareArgs): Promise<string> {
  const created = await createReferralInviteLink({ eventId, source });
  await navigator.clipboard.writeText(created.url);

  await logProductEvent({
    eventName: "invite_link_copied",
    eventId,
    source,
    metadata: { channel: "copy" },
  });
  track("invite_copy", { source, eventId, channel: "copy", eventTitle });

  await logProductEvent({
    eventName: "invite_sent",
    eventId,
    source,
    metadata: { channel: "copy" },
  });
  track("invite_share", { source, eventId, channel: "copy", eventTitle });

  return created.url;
}

export async function shareInviteLink({
  eventId,
  eventTitle,
  source,
}: InviteShareArgs): Promise<"native_share" | "copy_fallback" | "share_canceled"> {
  const created = await createReferralInviteLink({ eventId, source });
  const sharePayload = buildShareText(eventTitle);
  let channel: "native_share" | "copy_fallback" | "share_canceled" = "share_canceled";

  if (navigator.share) {
    try {
      await navigator.share({
        title: sharePayload.title,
        text: sharePayload.text,
        url: created.url,
      });
      channel = "native_share";
    } catch {
      channel = "share_canceled";
    }
  } else {
    await navigator.clipboard.writeText(created.url);
    channel = "copy_fallback";
    await logProductEvent({
      eventName: "invite_link_copied",
      eventId,
      source,
      metadata: { channel: "copy_fallback" },
    });
    track("invite_copy", { source, eventId, channel: "copy_fallback", eventTitle });
  }

  if (channel === "share_canceled") return channel;

  await logProductEvent({
    eventName: "invite_sent",
    eventId,
    source,
    metadata: { channel },
  });
  track("invite_share", { source, eventId, channel, eventTitle });

  return channel;
}
