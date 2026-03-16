import { createReferralInviteLink } from "@/lib/referrals";
import { logProductEvent } from "@/lib/productEvents";
import { track } from "@/lib/analytics";

type InviteShareArgs = {
  eventId?: string | null;
  eventTitle?: string | null;
  source: "rsvp_share" | "profile_share" | "event_detail_share" | "share_link";
};

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to the legacy copy path for iOS/webview cases.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("Could not copy that link in this browser.");
  }
}

function buildShareText(eventTitle?: string | null) {
  const title = (eventTitle ?? "").trim();
  if (!title) {
    return {
      title: "Join me on Whozin",
      text: "Get on Whozin so we can see who is actually going before we commit.",
    };
  }

  return {
    title: `${title} might be the move`,
    text: `I am thinking ${title} might be the move. Check who is in on Whozin:`,
  };
}

function buildShareTextForSource(source: InviteShareArgs["source"], eventTitle?: string | null) {
  const title = (eventTitle ?? "").trim();

  if (!title) {
    if (source === "profile_share") {
      return {
        title: "Get on Whozin",
        text: "Join my circle on Whozin so we can figure out the move faster.",
      };
    }

    return buildShareText(eventTitle);
  }

  if (source === "rsvp_share") {
    return {
      title: `${title} might be the move`,
      text: `I locked into ${title}. Get on Whozin and see who else is going:`,
    };
  }

  if (source === "event_detail_share" || source === "share_link") {
    return {
      title: `${title} might be the move`,
      text: `This looks like the move tonight. See who is actually in on Whozin:`,
    };
  }

  return buildShareText(eventTitle);
}

export async function copyInviteLink({
  eventId,
  eventTitle,
  source,
}: InviteShareArgs): Promise<string> {
  const created = await createReferralInviteLink({ eventId, source });
  await copyText(created.url);

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
  const sharePayload = buildShareTextForSource(source, eventTitle);
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
    await copyText(created.url);
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
