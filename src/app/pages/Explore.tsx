import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { endOfWeek, format, isSameDay, startOfDay } from "date-fns";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { EventCard } from "../components/EventCard";
import { Event } from "../../data/mock";
import { supabase } from "@/lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";
import { logProductEvent } from "@/lib/productEvents";
import { track } from "@/lib/analytics";
import { featureFlags } from "@/lib/featureFlags";
import { formatRetrySeconds, getRateLimitStatus } from "@/lib/rateLimit";
import { rankMoveCandidates } from "@/lib/theMove";
import { TheMoveHero } from "@/app/components/TheMoveHero";

const ExploreDatePicker = lazy(() =>
  import("@/app/components/ExploreDatePicker").then((m) => ({ default: m.ExploreDatePicker }))
);

const exploreCoverStyle = {
  background:
    "radial-gradient(1200px 520px at 20% 20%, rgba(168,85,247,0.55), transparent 55%), radial-gradient(900px 520px at 80% 10%, rgba(236,72,153,0.55), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0))",
} as const;

type RsvpState = {
  going: boolean;
  working: boolean;
  count: number;
  recentCount?: number;
};

type ExploreTimeFilter = "all" | "tonight" | "thisWeek" | "weekend" | "pickDate";
type ExploreDiscoveryMode = "city" | "friends" | "bayArea";
type ExploreSnapshotRow = {
  id: string;
  title: string;
  location?: string | null;
  city?: string | null;
  event_date?: string | null;
  event_end_date?: string | null;
  image_url?: string | null;
  description?: string | null;
  event_source?: string | null;
  ticket_url?: string | null;
  move_explainer?: string | null;
  move_secondary?: string | null;
  move_status?: string | null;
  move_score?: number | null;
  total_rsvps?: number | null;
  recent_rsvps_6h?: number | null;
  viewer_going?: boolean | null;
};

type ExploreSnapshotPayload = {
  ok?: boolean;
  city_pulse?: ExploreSnapshotRow[];
  all_picks?: ExploreSnapshotRow[];
};

type ExploreModeCopy = {
  scanTitle: string;
  scanBody: string;
  heroContext: string;
  pulseTitle: string;
  pulseBody: string;
  pulseEmpty: string;
  picksTitle: string;
  picksBody: string;
  scopeLabel: string;
  locationHint?: string;
  emptyState: string;
};

const exploreRpcEnabled =
  ((import.meta.env.VITE_ENABLE_EXPLORE_RPC as string | undefined)?.trim() || "").toLowerCase() ===
  "true";

function getExploreModeCopy(args: {
  mode: ExploreDiscoveryMode;
  city: string;
  nearbyCity: string;
}): ExploreModeCopy {
  const city = args.city.trim();
  const nearbyCity = args.nearbyCity.trim();

  if (args.mode === "friends") {
    return {
      scanTitle: "Follow Your People",
      scanBody: "Start with where your circle already has motion, then widen out if you need more.",
      heroContext: "Your people are moving here",
      pulseTitle: "Your Circle",
      pulseBody: "Where your people are already leaning.",
      pulseEmpty: "Your people have not separated around one plan yet.",
      picksTitle: "Circle Picks",
      picksBody: "Friend-led first, with a wider fallback behind it.",
      scopeLabel: "your circle",
      locationHint: nearbyCity
        ? `Nearby city looks like ${nearbyCity}, but the stronger read right now is your circle.`
        : "City is still loose, so Explore is starting with your circle first.",
      emptyState: "Your circle is quiet right now. Try another date or switch cities.",
    };
  }

  if (args.mode === "bayArea") {
    return {
      scanTitle: "Scan the Bay",
      scanBody: "No clean city read yet, so Explore is pulling the strongest Bay Area options.",
      heroContext: "Bay Area read",
      pulseTitle: "Bay Area Now",
      pulseBody: "The strongest nearby motion while your city settles.",
      pulseEmpty: "Nothing nearby is breaking away from the pack yet.",
      picksTitle: "Bay Area Picks",
      picksBody: "A wider Bay Area browse until your city comes through.",
      scopeLabel: "the Bay Area",
      locationHint: nearbyCity
        ? `Nearby city looks like ${nearbyCity}, but the cleaner signal right now is across the Bay Area.`
        : "No city yet, so Explore is starting with a Bay Area read.",
      emptyState: "Nothing strong is landing in the Bay yet. Try another night or set a city.",
    };
  }

  return {
    scanTitle: "Scan the City",
    scanBody: "Trim the noise, then follow what fits tonight.",
    heroContext: city ? `${city} city read` : "City read",
    pulseTitle: "City Pulse",
    pulseBody: "Fast movers, cleaned up by your filters.",
    pulseEmpty: "Nothing is clearly separating yet. Try loosening one filter or switching nights.",
    picksTitle: "All Picks",
    picksBody: "Wider city browse, with a little more control.",
    scopeLabel: city || "your city",
    locationHint: nearbyCity ? `Locked to nearby city: ${nearbyCity}` : undefined,
    emptyState: "Nothing fits this setup yet. Try another date, genre, or nearby city.",
  };
}

function getBrowserPosition(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

async function reverseGeocodeCity(lat: number, lon: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    String(lat)
  )}&lon=${encodeURIComponent(String(lon))}`;
  const res = await fetch(url);
  if (!res.ok) return "";
  const json = await res.json();
  const addr = json?.address ?? {};
  return (
    addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? ""
  )
    .toString()
    .trim();
}

async function inferCityFromIp(): Promise<string> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) return "";
    const json = await res.json();
    return (json?.city ?? "").toString().trim();
  } catch {
    return "";
  }
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function eventTimestamp(event: Event): number {
  const parsed = Date.parse(event.eventDateIso ?? event.date);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function normalizeCityToken(value: string): string {
  return value.trim().toLowerCase();
}

function formatEventLocation(location?: string | null, city?: string | null): string {
  const cleanLocation = (location ?? "").trim();
  const cleanCity = (city ?? "").trim();

  if (cleanLocation && cleanCity) {
    const lowerLocation = cleanLocation.toLowerCase();
    const lowerCity = cleanCity.toLowerCase();
    if (lowerLocation.includes(lowerCity)) return cleanLocation;
    return `${cleanLocation}, ${cleanCity}`;
  }

  return cleanLocation || cleanCity || "Location TBD";
}

function matchesCityFilter(event: Event, cityHint: string): boolean {
  const hint = normalizeCityToken(cityHint);
  if (!hint) return true;

  const city = normalizeCityToken(event.city ?? "");
  if (city) {
    if (city.includes(hint)) return true;
  }

  const location = normalizeCityToken(event.location ?? "");
  if (location && location.includes(hint)) return true;

  const cityTokens = hint.split(/[^a-z0-9]+/g).filter(Boolean);
  if (cityTokens.length === 0) return true;

  const haystackTokens = new Set([...city.split(/[^a-z0-9]+/g), ...location.split(/[^a-z0-9]+/g)].filter(Boolean));
  const overlap = cityTokens.filter((token) => haystackTokens.has(token)).length;
  return overlap / cityTokens.length >= 0.5;
}

function matchesTimeFilter(event: Event, filter: ExploreTimeFilter, selectedDate?: Date) {
  if (filter === "all") return true;

  const ts = eventTimestamp(event);
  if (!Number.isFinite(ts) || ts === Number.MAX_SAFE_INTEGER) return false;

  const eventDate = new Date(ts);
  const now = new Date();
  const today = startOfDay(now);

  if (filter === "tonight") {
    return isSameDay(eventDate, now);
  }

  if (filter === "thisWeek") {
    return eventDate >= today && eventDate <= endOfWeek(now, { weekStartsOn: 1 });
  }

  if (filter === "weekend") {
    const day = eventDate.getDay();
    return eventDate >= today && [5, 6, 0].includes(day);
  }

  if (filter === "pickDate") {
    return !!selectedDate && isSameDay(eventDate, selectedDate);
  }

  return true;
}

function dedupeEventsById(events: Event[]) {
  return Array.from(new Map(events.map((event) => [event.id, event])).values());
}

function buildMoveCandidates(items: Event[], rsvpByEventId: Record<string, RsvpState>) {
  return dedupeEventsById(items).map((event) => ({
    id: event.id,
    title: event.title,
    startAt: event.eventDateIso ?? event.date,
    totalRsvps: rsvpByEventId[event.id]?.count ?? event.attendees ?? 0,
    recentRsvps: rsvpByEventId[event.id]?.recentCount ?? 0,
    quality: event.ticketUrl ? 1 : 0.9,
  }));
}

function mapSnapshotRowToEvent(row: ExploreSnapshotRow): Event {
  const eventDateIso = row.event_date ?? undefined;
  const eventDateLabel = eventDateIso
    ? new Date(eventDateIso).toLocaleString(undefined, {
        month: "short",
        day: "2-digit",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Date TBD";

  const moveReason =
    row.move_explainer?.trim() ||
    (row.move_status === "the_move"
      ? "This is where the night is building fastest."
      : row.move_status === "building_fast"
        ? "Momentum is climbing right now."
        : row.move_status === "might_be_the_move"
          ? "Not fully there yet, but the energy is real."
          : "Momentum is building.");

  const tags: string[] = [];
  if (row.move_status === "the_move") tags.push("The Move");
  if (row.move_status === "building_fast") tags.push("Building Fast");
  if (row.move_status === "might_be_the_move") tags.push("Might Be The Move");

  return {
    id: row.id,
    title: row.title,
    date: eventDateLabel,
    eventDateIso,
    eventEndDateIso: row.event_end_date ?? undefined,
    location: formatEventLocation(row.location, row.city),
    city: row.city ?? undefined,
    image: row.image_url ?? "",
    attendees: row.total_rsvps ?? 0,
    price: row.ticket_url ? "Tickets" : "RSVP",
    description: row.description?.trim() || moveReason,
    tags,
    ticketUrl: row.ticket_url ?? undefined,
    eventSource: row.event_source ?? "internal",
    matchReason: moveReason,
  };
}

async function fetchExploreSnapshot(args: {
  city: string;
  timeFilter: ExploreTimeFilter;
  selectedDate?: Date;
}) {
  const { data, error } = await supabase.rpc("get_explore_snapshot", {
    p_city: args.city || null,
    p_time_filter: args.timeFilter,
    p_selected_date: args.selectedDate ? format(args.selectedDate, "yyyy-MM-dd") : null,
    p_limit: 80,
    p_tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Chicago",
  });

  if (error) throw error;
  const payload = (data ?? {}) as ExploreSnapshotPayload;
  if (!payload || payload.ok === false) {
    throw new Error("Explore snapshot unavailable");
  }

  return {
    ranked: Array.isArray(payload.all_picks) ? payload.all_picks.map(mapSnapshotRowToEvent) : [],
    trending: Array.isArray(payload.city_pulse) ? payload.city_pulse.map(mapSnapshotRowToEvent) : [],
  };
}

export function Explore() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([]);
  const [discoveryMode, setDiscoveryMode] = useState<ExploreDiscoveryMode>("city");
  const [rsvpByEventId, setRsvpByEventId] = useState<Record<string, RsvpState>>({});
  const [eventSort, setEventSort] = useState<"theMove" | "soonest" | "thisWeek" | "mostGoing">(
    "theMove"
  );
  const [timeFilter, setTimeFilter] = useState<ExploreTimeFilter>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [tagFilter, setTagFilter] = useState("all");

  const [cityInput, setCityInput] = useState(localStorage.getItem("whozin_explore_city") || "");
  const [autoCityHint, setAutoCityHint] = useState(
    localStorage.getItem("whozin_explore_auto_city") || ""
  );
  const [activeCity, setActiveCity] = useState(localStorage.getItem("whozin_explore_city") || "");
  const onboardingMode = useMemo(
    () => new URLSearchParams(location.search).get("onboarding") === "1",
    [location.search]
  );
  const [locationReady, setLocationReady] = useState(
    Boolean(localStorage.getItem("whozin_explore_city") || localStorage.getItem("whozin_explore_auto_city"))
  );

  const effectiveCity = activeCity.trim() || autoCityHint.trim();

  const loadExploreFallback = async () => {
    const { loadFriendsFallbackExplore, loadRegionalFallbackExplore } = await import(
      "@/lib/explorePersonalization"
    );

    const [socialFallback, regionalFallback] = await Promise.all([
      loadFriendsFallbackExplore(),
      loadRegionalFallbackExplore(),
    ]);

    if (socialFallback.length > 0) {
      return {
        mode: "friends" as ExploreDiscoveryMode,
        ranked: dedupeEventsById([...socialFallback, ...regionalFallback]),
        trending: socialFallback.slice(0, 6),
      };
    }

    return {
      mode: "bayArea" as ExploreDiscoveryMode,
      ranked: regionalFallback,
      trending: regionalFallback.slice(0, 6),
    };
  };

  useEffect(() => {
    const resolveAutoCity = async () => {
      if (cityInput.trim()) {
        setLocationReady(true);
        return;
      }
      if (autoCityHint.trim()) {
        setLocationReady(true);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const profileCity =
        (user?.user_metadata?.city as string | undefined)?.trim() ||
        (user?.user_metadata?.location as string | undefined)?.trim() ||
        "";

      if (profileCity) {
        setAutoCityHint(profileCity);
        localStorage.setItem("whozin_explore_auto_city", profileCity);
        if (!activeCity.trim()) setActiveCity(profileCity);
        setLocationReady(true);
        return;
      }

      try {
        const { lat, lon } = await getBrowserPosition();
        const city = await reverseGeocodeCity(lat, lon);
        if (city) {
          setAutoCityHint(city);
          localStorage.setItem("whozin_explore_auto_city", city);
          if (!activeCity.trim()) setActiveCity(city);
          setLocationReady(true);
          return;
        }
      } catch {
        // User denied geolocation or unavailable.
      }

      const ipCity = await inferCityFromIp();
      if (ipCity) {
        setAutoCityHint(ipCity);
        localStorage.setItem("whozin_explore_auto_city", ipCity);
        if (!activeCity.trim()) setActiveCity(ipCity);
      }
      setLocationReady(true);
    };

    void resolveAutoCity();
  }, [cityInput, autoCityHint, activeCity]);

  const refreshRecommendations = async (city: string) => {
    setLoadingEvents(true);
    setLoadingTrending(true);
    try {
      let ranked: Event[] = [];
      let trending: Event[] = [];
      let nextDiscoveryMode: ExploreDiscoveryMode = city.trim() ? "city" : "bayArea";

      if (!city.trim()) {
        const fallback = await loadExploreFallback();
        nextDiscoveryMode = fallback.mode;
        ranked = fallback.ranked;
        trending = fallback.trending;
      } else {
        try {
          if (!exploreRpcEnabled) {
            throw new Error("Explore RPC disabled");
          }
          const snapshot = await fetchExploreSnapshot({
            city,
            timeFilter,
            selectedDate,
          });
          ranked = snapshot.ranked;
          trending = snapshot.trending;
        } catch (snapshotError) {
          console.info("[explore] snapshot fallback", snapshotError);
          const { loadPersonalizedExplore, loadTrendingExplore } = await import(
            "@/lib/explorePersonalization"
          );
          [ranked, trending] = await Promise.all([
            loadPersonalizedExplore(city),
            loadTrendingExplore(city),
          ]);
        }

        if (ranked.length === 0 && trending.length === 0) {
          const fallback = await loadExploreFallback();
          nextDiscoveryMode = fallback.mode;
          ranked = fallback.ranked;
          trending = fallback.trending;
        }
      }

      setDiscoveryMode(nextDiscoveryMode);
      setEvents(ranked);
      setTrendingEvents(trending);
      void hydrateExploreRsvpState([...ranked, ...trending]);

      void logProductEvent({
        eventName: "explore_feed_loaded",
        source: "explore",
        metadata: {
          city: city || null,
          discovery_mode: nextDiscoveryMode,
          spotify_connected: false,
          result_count: ranked.length,
          trending_count: trending.length,
          artist_matched_count: ranked.filter(
            (event) =>
              (event.matchReason ?? "").toLowerCase().includes("because you like") ||
              (event.matchReason ?? "").toLowerCase().includes("suggested")
          ).length,
          ticketed_count: ranked.filter((event) => !!event.ticketUrl).length,
        },
      });
    } catch (error: any) {
      console.error("Explore personalization failed:", error);
      setEvents([]);
      setTrendingEvents([]);
      toast.error("Could not refresh the night right now.");
    } finally {
      setLoadingEvents(false);
      setLoadingTrending(false);
    }
  };

  const hydrateExploreRsvpState = async (items: Event[]) => {
    const internalEventIds = Array.from(new Set(items.map((event) => event.id).filter(isUuid)));
    if (internalEventIds.length === 0) {
      setRsvpByEventId({});
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const viewerId = session?.user?.id ?? null;

    const { data: rows, error } = await supabase
      .from("attendees")
      .select("event_id,user_id,created_at")
      .in("event_id", internalEventIds);
    if (error) {
      console.error("Failed loading explore RSVP state:", error);
      return;
    }

    const next: Record<string, RsvpState> = {};
    for (const id of internalEventIds) {
      next[id] = { going: false, working: false, count: 0 };
    }

    for (const row of (rows ?? []) as Array<{ event_id: string; user_id: string; created_at?: string | null }>) {
      const state = next[row.event_id];
      if (!state) continue;
      state.count += 1;
      if (viewerId && row.user_id === viewerId) state.going = true;
      if (row.created_at) {
        const createdAt = new Date(row.created_at).getTime();
        if (!Number.isNaN(createdAt) && Date.now() - createdAt <= 6 * 60 * 60 * 1000) {
          state.recentCount = (state.recentCount ?? 0) + 1;
        }
      }
    }

    for (const item of items) {
      if (!isUuid(item.id)) continue;
      const state = next[item.id];
      if (!state) continue;
      if (state.count <= 0 && typeof item.attendees === "number") {
        state.count = item.attendees;
      }
    }

    setRsvpByEventId(next);
  };

  const cityScopedTrendingEvents = useMemo(
    () =>
      discoveryMode === "city"
        ? trendingEvents.filter((event) => matchesCityFilter(event, effectiveCity))
        : trendingEvents,
    [discoveryMode, effectiveCity, trendingEvents]
  );

  const cityScopedEvents = useMemo(
    () =>
      discoveryMode === "city"
        ? events.filter((event) => matchesCityFilter(event, effectiveCity))
        : events,
    [discoveryMode, effectiveCity, events]
  );

  const availableDateKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const event of dedupeEventsById([...cityScopedTrendingEvents, ...cityScopedEvents])) {
      const ts = eventTimestamp(event);
      if (!Number.isFinite(ts) || ts === Number.MAX_SAFE_INTEGER) continue;
      keys.add(format(new Date(ts), "yyyy-MM-dd"));
    }
    return keys;
  }, [cityScopedEvents, cityScopedTrendingEvents]);

  const timeScopedTrendingEvents = useMemo(
    () => cityScopedTrendingEvents.filter((event) => matchesTimeFilter(event, timeFilter, selectedDate)),
    [cityScopedTrendingEvents, selectedDate, timeFilter]
  );

  const timeScopedEvents = useMemo(
    () => cityScopedEvents.filter((event) => matchesTimeFilter(event, timeFilter, selectedDate)),
    [cityScopedEvents, selectedDate, timeFilter]
  );

  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of dedupeEventsById([...timeScopedTrendingEvents, ...timeScopedEvents])) {
      for (const tag of Array.isArray(event.tags) ? event.tags : []) {
        const cleanTag = tag.trim();
        if (!cleanTag) continue;
        counts.set(cleanTag, (counts.get(cleanTag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([tag]) => tag);
  }, [timeScopedEvents, timeScopedTrendingEvents]);

  const filteredTrendingEvents = useMemo(
    () =>
      timeScopedTrendingEvents.filter(
        (event) => tagFilter === "all" || (Array.isArray(event.tags) ? event.tags : []).includes(tagFilter)
      ),
    [tagFilter, timeScopedTrendingEvents]
  );

  const filteredEventPool = useMemo(
    () =>
      timeScopedEvents.filter(
        (event) => tagFilter === "all" || (Array.isArray(event.tags) ? event.tags : []).includes(tagFilter)
      ),
    [tagFilter, timeScopedEvents]
  );

  const activeMoveRanking = useMemo(
    () =>
      rankMoveCandidates(
        buildMoveCandidates([...filteredTrendingEvents, ...filteredEventPool], rsvpByEventId),
        "city"
      ),
    [filteredEventPool, filteredTrendingEvents, rsvpByEventId]
  );

  const filteredSortedEvents = useMemo(() => {
    return [...filteredEventPool].sort((a, b) => {
      const aCount = rsvpByEventId[a.id]?.count ?? a.attendees ?? 0;
      const bCount = rsvpByEventId[b.id]?.count ?? b.attendees ?? 0;
      const aMove = activeMoveRanking.signalsById[a.id]?.score ?? -999;
      const bMove = activeMoveRanking.signalsById[b.id]?.score ?? -999;
      const nowTs = Date.now();
      const weekEndTs = nowTs + 7 * 24 * 60 * 60 * 1000;
      const aTs = eventTimestamp(a);
      const bTs = eventTimestamp(b);
      const aThisWeek = aTs >= nowTs && aTs <= weekEndTs ? 1 : 0;
      const bThisWeek = bTs >= nowTs && bTs <= weekEndTs ? 1 : 0;

      if (eventSort === "theMove") {
        if (bMove !== aMove) return bMove - aMove;
        if (bCount !== aCount) return bCount - aCount;
        return aTs - bTs;
      }

      if (eventSort === "mostGoing") {
        if (bCount !== aCount) return bCount - aCount;
        return aTs - bTs;
      }

      if (eventSort === "thisWeek") {
        if (aThisWeek !== bThisWeek) return bThisWeek - aThisWeek;
        if (aTs !== bTs) return aTs - bTs;
        return bCount - aCount;
      }

      const dateDelta = aTs - bTs;
      if (dateDelta !== 0) return dateDelta;
      return bCount - aCount;
    });
  }, [activeMoveRanking.signalsById, eventSort, filteredEventPool, rsvpByEventId]);

  const filtersActive = timeFilter !== "all" || tagFilter !== "all" || !!selectedDate;
  const filteredSignalsById = activeMoveRanking.signalsById;
  const heroSignal = activeMoveRanking.topSignal;
  const modeCopy = useMemo(
    () =>
      getExploreModeCopy({
        mode: discoveryMode,
        city: effectiveCity,
        nearbyCity: autoCityHint,
      }),
    [autoCityHint, discoveryMode, effectiveCity]
  );
  const heroEvent = useMemo(
    () =>
      heroSignal
        ? dedupeEventsById([...filteredTrendingEvents, ...filteredSortedEvents]).find(
            (event) => event.id === heroSignal.eventId
          ) ?? null
        : null,
    [filteredSortedEvents, filteredTrendingEvents, heroSignal]
  );

  const cityPulseEvents = useMemo(
    () =>
      [...filteredTrendingEvents]
        .filter((event) => event.id !== heroEvent?.id)
        .sort((a, b) => {
          const aMove = filteredSignalsById[a.id]?.score ?? -999;
          const bMove = filteredSignalsById[b.id]?.score ?? -999;
          if (aMove !== bMove) return bMove - aMove;
          const aCount = rsvpByEventId[a.id]?.count ?? a.attendees ?? 0;
          const bCount = rsvpByEventId[b.id]?.count ?? b.attendees ?? 0;
          if (aCount !== bCount) return bCount - aCount;
          return eventTimestamp(a) - eventTimestamp(b);
        })
        .slice(0, 3),
    [filteredSignalsById, filteredTrendingEvents, heroEvent?.id, rsvpByEventId]
  );

  const handleQuickRsvp = async (event: Event) => {
    if (featureFlags.killSwitchRsvpWrites) {
      toast.error("RSVP is temporarily unavailable");
      return;
    }
    if (!isUuid(event.id)) {
      toast.error("Open event details to RSVP");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      toast.error("Sign in to RSVP");
      return;
    }

    const uid = session.user.id;
    const rl = getRateLimitStatus(`rsvp_explore:${uid}:${event.id}`, 2000);
    if (!rl.allowed) {
      const seconds = formatRetrySeconds(rl.retryAfterMs);
      toast.error(`Please wait ${seconds}s before trying again.`);
      track("rsvp_rate_limited", { source: "explore", eventId: event.id, seconds });
      return;
    }

    const prev = rsvpByEventId[event.id] ?? {
      going: false,
      working: false,
      count: typeof event.attendees === "number" ? event.attendees : 0,
    };
    const nextGoing = !prev.going;
    const nextCount = Math.max(0, prev.count + (nextGoing ? 1 : -1));
    setRsvpByEventId((map) => ({
      ...map,
      [event.id]: { going: nextGoing, working: true, count: nextCount },
    }));

    void logProductEvent({
      eventName: "explore_rsvp_click",
      eventId: event.id,
      source: "explore",
      metadata: { action: nextGoing ? "add" : "remove" },
    });

    try {
      if (nextGoing) {
        const { error } = await supabase.from("attendees").insert({
          event_id: event.id,
          user_id: uid,
          rsvp_source: "explore",
        });
        if (error) throw error;
        track("rsvp_success", { source: "explore", action: "add", eventId: event.id });
      } else {
        const { error } = await supabase
          .from("attendees")
          .delete()
          .eq("event_id", event.id)
          .eq("user_id", uid);
        if (error) throw error;
        track("rsvp_success", { source: "explore", action: "remove", eventId: event.id });
      }

      setRsvpByEventId((map) => ({
        ...map,
        [event.id]: {
          ...(map[event.id] ?? { going: nextGoing, count: nextCount }),
          going: nextGoing,
          count: nextCount,
          working: false,
        },
      }));
      toast.success(nextGoing ? "You're going!" : "RSVP removed");
      if (onboardingMode && nextGoing) {
        navigate(`/event/${event.id}?src=explore&onboarding=1`, { replace: true });
      }
    } catch (error: any) {
      setRsvpByEventId((map) => ({
        ...map,
        [event.id]: { ...prev, working: false },
      }));
      track("rsvp_failed", {
        source: "explore",
        action: nextGoing ? "add" : "remove",
        eventId: event.id,
        message: error?.message ?? "unknown_error",
      });
      toast.error(error?.message ?? "Failed to update RSVP");
    }
  };

  useEffect(() => {
    if (!locationReady) return;
    void refreshRecommendations(effectiveCity);
  }, [effectiveCity, locationReady, selectedDate, timeFilter]);

  return (
    <div className="min-h-screen bg-black text-white pb-24 relative">
      <div className="relative h-48" style={exploreCoverStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black" />
        <div className="relative px-5 pt-12">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            Explore
          </h1>
          <p className="text-zinc-400 mt-1">What's the move tonight?</p>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-6">
        {onboardingMode ? (
          <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
            <div className="text-sm font-semibold text-white">Step 2: pick one night</div>
            <div className="mt-1 text-xs text-zinc-300">
              Lock one plan and we'll take you straight to the page where invites and social proof hit hardest.
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold">{modeCopy.scanTitle}</h3>
            <div className="text-xs text-zinc-600 mt-0.5">{modeCopy.scanBody}</div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEventSort("theMove")}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                eventSort === "theMove"
                  ? "border-fuchsia-300 bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                  : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20 hover:text-white"
              }`}
            >
              The Move
            </button>
            <button
              type="button"
              onClick={() => setEventSort("soonest")}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                eventSort === "soonest"
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20 hover:text-white"
              }`}
            >
              Up next
            </button>
            <button
              type="button"
              onClick={() => setEventSort("thisWeek")}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                eventSort === "thisWeek"
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20 hover:text-white"
              }`}
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => setEventSort("mostGoing")}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                eventSort === "mostGoing"
                  ? "border-white bg-white text-black"
                  : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20 hover:text-white"
              }`}
            >
              Most heads
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {heroSignal && heroEvent ? (
            <TheMoveHero
              eventId={heroEvent.id}
              title={heroEvent.title}
              context={modeCopy.heroContext}
              meta={heroEvent.location || "Location TBD"}
              signal={heroSignal}
              source="explore"
            />
          ) : null}

          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {modeCopy.pulseTitle}
                {loadingTrending && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
              </h3>
              <div className="text-xs text-zinc-600 mt-0.5">{modeCopy.pulseBody}</div>
            </div>
          </div>

          {loadingTrending ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={`trending-skeleton-${i}`}
                  className="bg-zinc-900/50 border border-white/10 h-56 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : cityPulseEvents.length > 0 ? (
            <div className="grid gap-6">
              {cityPulseEvents.map((event) => (
                <EventCard
                  key={`trending-${event.id}`}
                  event={event}
                  moveSignal={filteredSignalsById[event.id]}
                  surface="explore"
                  inviteSource="share_link"
                  quickRsvp={
                    isUuid(event.id)
                      ? {
                          going: rsvpByEventId[event.id]?.going ?? false,
                          working: rsvpByEventId[event.id]?.working ?? false,
                          count: rsvpByEventId[event.id]?.count ?? event.attendees,
                          onToggle: () => void handleQuickRsvp(event),
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 text-sm text-zinc-400">
              {modeCopy.pulseEmpty}
            </div>
          )}

          <div id="all-picks" className="flex items-end justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {modeCopy.picksTitle}
                {loadingEvents && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
              </h3>
              <div className="text-xs text-zinc-600 mt-0.5">{modeCopy.picksBody}</div>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              value={cityInput}
              onChange={(event) => setCityInput(event.target.value)}
              placeholder="Change city (ex: Chicago)"
              className="flex-1 bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => {
                const city = cityInput.trim() || autoCityHint.trim();
                if (cityInput.trim()) {
                  localStorage.setItem("whozin_explore_city", cityInput.trim());
                } else {
                  localStorage.removeItem("whozin_explore_city");
                }
                setLocationReady(true);
                setActiveCity(city);
              }}
              className="px-3 py-2 rounded-xl text-sm bg-white/10 border border-white/10 hover:bg-white/15"
            >
              Update
            </button>
          </div>

          {!cityInput.trim() && modeCopy.locationHint ? (
            <div className="text-xs text-zinc-500">
              {discoveryMode === "city" && autoCityHint.trim() ? (
                <>
                  Locked to nearby city: <span className="text-zinc-300">{autoCityHint}</span>
                </>
              ) : (
                modeCopy.locationHint
              )}
            </div>
          ) : null}

          <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/65 p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Filter the night</div>
                <div className="mt-1 text-xs text-zinc-500">
                  Narrow by timing, sound, or one date.
                </div>
              </div>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setTimeFilter("all");
                    setSelectedDate(undefined);
                    setTagFilter("all");
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-zinc-300 hover:border-white/20 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  Reset
                </button>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All nights"],
                ["tonight", "Tonight"],
                ["thisWeek", "This week"],
                ["weekend", "Weekend"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setTimeFilter(value as ExploreTimeFilter);
                    if (value !== "pickDate") setSelectedDate(undefined);
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    timeFilter === value
                      ? "border-fuchsia-300 bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                      : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}

              <Suspense
                fallback={
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/60 px-3 py-1.5 text-xs font-semibold text-zinc-300"
                  >
                    {selectedDate ? format(selectedDate, "EEE, MMM d") : "Pick a date"}
                  </button>
                }
              >
                <ExploreDatePicker
                  selectedDate={selectedDate}
                  active={timeFilter === "pickDate"}
                  availableDateKeys={availableDateKeys}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setTimeFilter(date ? "pickDate" : "all");
                  }}
                />
              </Suspense>
            </div>

            {availableTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTagFilter("all")}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    tagFilter === "all"
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  All sounds
                </button>
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setTagFilter(tag)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      tagFilter === tag
                        ? "border-fuchsia-300 bg-fuchsia-500/15 text-fuchsia-100"
                        : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20 hover:text-white"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="text-xs text-zinc-500">
              Showing <span className="text-zinc-200">{filteredSortedEvents.length}</span> events
              {discoveryMode === "city" && effectiveCity ? (
                <>
                  {" "}
                  for <span className="text-zinc-200">{effectiveCity}</span>
                </>
              ) : (
                <>
                  {" "}
                  from <span className="text-zinc-200">{modeCopy.scopeLabel}</span>
                </>
              )}
              {selectedDate ? (
                <>
                  {" "}
                  on <span className="text-zinc-200">{format(selectedDate, "EEEE, MMM d")}</span>
                </>
              ) : null}
            </div>
          </div>

          {loadingEvents ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-zinc-900/50 border border-white/10 h-64 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-6">
              {filteredSortedEvents.length > 0 ? (
                filteredSortedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    moveSignal={filteredSignalsById[event.id]}
                    surface="explore"
                    inviteSource="share_link"
                    quickRsvp={
                      isUuid(event.id)
                        ? {
                            going: rsvpByEventId[event.id]?.going ?? false,
                            working: rsvpByEventId[event.id]?.working ?? false,
                            count: rsvpByEventId[event.id]?.count ?? event.attendees,
                            onToggle: () => void handleQuickRsvp(event),
                          }
                        : undefined
                    }
                  />
                ))
              ) : (
                <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 text-sm text-zinc-400">
                  {modeCopy.emptyState}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
