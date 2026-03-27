import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, ExternalLink, Globe, Instagram, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { EventCard } from "@/app/components/EventCard";
import type { Event } from "@/data/mock";
import { formatEventDateTimeRange, isEventPast, isEventUpcomingOrOngoing } from "@/lib/eventDates";
import {
  getPartnerBadgeLabel,
  getPartnerTypeLabel,
  normalizePartnerSlug,
  type PartnerProfileFields,
} from "@/lib/partnerProfiles";
import { supabase } from "@/lib/supabase";
import { isEventVisible } from "@/lib/eventVisibility";

type PartnerRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
} & PartnerProfileFields;

type HostedEventRow = {
  id: string;
  title: string;
  location: string | null;
  city?: string | null;
  venue_name?: string | null;
  event_date: string | null;
  event_end_date: string | null;
  image_url: string | null;
  description?: string | null;
  ticket_url?: string | null;
  event_source?: string | null;
  moderation_status?: string | null;
};

function toCardEvent(event: HostedEventRow): Event {
  return {
    id: event.id,
    title: event.title,
    date: formatEventDateTimeRange(event),
    eventDateIso: event.event_date ?? undefined,
    eventEndDateIso: event.event_end_date ?? undefined,
    location: event.venue_name ?? event.location ?? event.city ?? "Location TBD",
    city: event.city ?? undefined,
    image: event.image_url ?? "",
    attendees: 0,
    price: "",
    description: event.description?.trim() || "",
    tags: [],
    ticketUrl: event.ticket_url ?? undefined,
    eventSource: event.event_source ?? undefined,
  };
}

export function PartnerProfile() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<PartnerRow | null>(null);
  const [upcoming, setUpcoming] = useState<HostedEventRow[]>([]);
  const [past, setPast] = useState<HostedEventRow[]>([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const normalizedSlug = normalizePartnerSlug(slug ?? "");
      if (!normalizedSlug) {
        toast.error("Missing organizer link");
        setPartner(null);
        setUpcoming([]);
        setPast([]);
        setLoading(false);
        return;
      }

      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select(
          "id,username,display_name,avatar_url,account_type,partner_type,partner_status,partner_badge_label,partner_slug,partner_bio_short,partner_instagram_url,partner_website_url"
        )
        .eq("partner_slug", normalizedSlug)
        .eq("account_type", "partner")
        .eq("partner_status", "active")
        .maybeSingle();

      if (profileErr) {
        console.error(profileErr);
        toast.error("Could not load organizer", { description: profileErr.message });
        setPartner(null);
        setUpcoming([]);
        setPast([]);
        setLoading(false);
        return;
      }

      if (!profile) {
        setPartner(null);
        setUpcoming([]);
        setPast([]);
        setLoading(false);
        return;
      }

      setPartner(profile as PartnerRow);

      const { data: events, error: eventsErr } = await supabase
        .from("events")
        .select(
          "id,title,location,city,venue_name,event_date,event_end_date,image_url,description,ticket_url,event_source,moderation_status"
        )
        .eq("organizer_profile_id", profile.id)
        .order("event_date", { ascending: true });

      if (eventsErr) {
        console.error(eventsErr);
        toast.error("Could not load hosted events", { description: eventsErr.message });
        setUpcoming([]);
        setPast([]);
        setLoading(false);
        return;
      }

      const visibleEvents = ((events ?? []) as HostedEventRow[]).filter((event) => isEventVisible(event));
      const nowTs = Date.now();
      setUpcoming(visibleEvents.filter((event) => isEventUpcomingOrOngoing(event, nowTs)));
      setPast(
        visibleEvents
          .filter((event) => isEventPast(event, nowTs))
          .sort((a, b) => {
            const aTs = new Date(a.event_end_date || a.event_date || 0).getTime();
            const bTs = new Date(b.event_end_date || b.event_date || 0).getTime();
            return bTs - aTs;
          })
      );
      setLoading(false);
    };

    void load();
  }, [slug]);

  const title = useMemo(() => {
    const displayName = partner?.display_name?.trim();
    if (displayName) return displayName;
    const username = partner?.username?.trim();
    if (username) return `@${username}`;
    return "Organizer";
  }, [partner?.display_name, partner?.username]);

  const handle = useMemo(
    () => (partner?.username?.trim() ? `@${partner.username.trim()}` : ""),
    [partner?.username]
  );
  const totalHosted = upcoming.length + past.length;

  const coverStyle = {
    background:
      "radial-gradient(1200px 520px at 20% 20%, rgba(168,85,247,0.55), transparent 55%), radial-gradient(900px 520px at 80% 10%, rgba(236,72,153,0.55), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0))",
  } as const;

  if (loading) {
    return (
      <div className="min-h-screen bg-black px-5 pt-6 text-white">
        <div className="text-zinc-400">Loading organizer...</div>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="min-h-screen bg-black px-5 pt-6 text-white">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <div className="mt-10 rounded-3xl border border-white/10 bg-zinc-900/60 p-6">
          <div className="text-xl font-semibold">Organizer not found</div>
          <div className="mt-2 text-sm text-zinc-400">
            That partner page is missing or not live yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-28 text-white">
      <div className="relative h-56" style={coverStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/10 to-black" />
        <Link
          to="/"
          className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-sm text-zinc-100 backdrop-blur-md"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="relative -mt-16 px-5">
        <div className="rounded-[30px] border border-white/10 bg-zinc-950/92 p-6 shadow-2xl shadow-fuchsia-950/20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              {partner.avatar_url ? (
                <img
                  src={partner.avatar_url}
                  alt={title}
                  className="h-20 w-20 rounded-[24px] border border-white/10 object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-sm font-semibold text-zinc-300">
                  Host
                </div>
              )}

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-2xl font-semibold">{title}</div>
                  <div className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                    {getPartnerBadgeLabel(partner)}
                  </div>
                </div>
                {handle ? <div className="mt-1 text-sm text-zinc-500">{handle}</div> : null}
                <div className="mt-3 text-xs uppercase tracking-[0.18em] text-zinc-500">
                  {getPartnerTypeLabel(partner.partner_type)}
                </div>
                {partner.partner_bio_short ? (
                  <div className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
                    {partner.partner_bio_short}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[220px]">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-2xl font-semibold">{upcoming.length}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Upcoming
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-2xl font-semibold">{totalHosted}</div>
                <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  Hosted
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {partner.partner_instagram_url ? (
              <a
                href={partner.partner_instagram_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10"
              >
                <Instagram className="h-3.5 w-3.5" />
                Instagram
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
            {partner.partner_website_url ? (
              <a
                href={partner.partner_website_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-100 hover:bg-white/10"
              >
                <Globe className="h-3.5 w-3.5" />
                Website
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="mt-8">
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-zinc-500" />
            <h2 className="text-xl font-semibold">Upcoming events</h2>
          </div>

          {upcoming.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-900/50 p-5 text-zinc-400">
              No live hosted events yet.
            </div>
          ) : (
            <div className="space-y-4">
              {upcoming.map((event) => (
                <EventCard key={event.id} event={toCardEvent(event)} surface="partner_profile" />
              ))}
            </div>
          )}
        </div>

        {past.length > 0 ? (
          <div className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-zinc-500" />
              <h2 className="text-xl font-semibold">Past events</h2>
            </div>
            <div className="space-y-4 opacity-90">
              {past.slice(0, 6).map((event) => (
                <EventCard key={event.id} event={toCardEvent(event)} surface="partner_profile" />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
