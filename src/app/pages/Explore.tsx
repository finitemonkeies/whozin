import { useEffect, useMemo, useState } from "react";
import { addDays, endOfDay, format, isSameDay, startOfDay } from "date-fns";
import { Loader2, Sparkles, Users, X } from "lucide-react";
import { toast } from "sonner";
import { EventCard } from "../components/EventCard";
import { ExploreDatePicker } from "@/app/components/ExploreDatePicker";
import { Event } from "../../data/mock";
import { supabase } from "@/lib/supabase";
import { useLocation, useNavigate } from "react-router-dom";
import { logProductEvent } from "@/lib/productEvents";
import { track } from "@/lib/analytics";
import { featureFlags } from "@/lib/featureFlags";
import { formatRetrySeconds, getRateLimitStatus } from "@/lib/rateLimit";
import { rankMoveCandidates } from "@/lib/theMove";
import { TheMoveHero } from "@/app/components/TheMoveHero";
import { useAuth } from "@/app/providers/AuthProvider";

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

type ExploreFeedMode = "tonight" | "upcoming";

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function eventTimestamp(event: Event): number {
  const parsed = Date.parse(event.eventDateIso ?? event.date);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function sourcePriority(source?: string) {
  const normalized = (source ?? "").trim().toLowerCase();
  if (!normalized || normalized === "internal") return 3;
  if (normalized === "19hz" || normalized === "ra") return 2;
  return 1;
}

function mergeEventCollections(...collections: Event[][]): Event[] {
  const merged = new Map<string, Event>();

  for (const collection of collections) {
    for (const event of collection) {
      const existing = merged.get(event.id);
      if (!existing) {
        merged.set(event.id, {
          ...event,
          tags: Array.isArray(event.tags) ? [...event.tags] : [],
        });
        continue;
      }

      const combinedTags = Array.from(
        new Set([...(existing.tags ?? []), ...(Array.isArray(event.tags) ? event.tags : [])].filter(Boolean))
      ).slice(0, 4);

      merged.set(event.id, {
        ...existing,
        ...event,
        attendees: Math.max(existing.attendees ?? 0, event.attendees ?? 0),
        description:
          existing.description?.trim().length > 0 ? existing.description : event.description,
        matchReason:
          existing.matchReason?.trim().length > 0 ? existing.matchReason : event.matchReason,
        tags: combinedTags,
      });
    }
  }

  return Array.from(merged.values());
}

function matchesFeedMode(event: Event, mode: ExploreFeedMode) {
  const ts = eventTimestamp(event);
  if (!Number.isFinite(ts) || ts === Number.MAX_SAFE_INTEGER) return false;

  const eventDate = new Date(ts);
  const todayStart = startOfDay(new Date());
  const tomorrowStart = addDays(todayStart, 1);
  const todayEnd = endOfDay(todayStart);

  if (mode === "tonight") {
    return eventDate >= todayStart && eventDate <= todayEnd;
  }

  return eventDate >= tomorrowStart;
}

function hasTasteSignal(event: Event) {
  const reason = (event.matchReason ?? "").toLowerCase();
  return reason.includes("because you like") || reason.includes("suggested");
}

function formatScopeSummary(mode: ExploreFeedMode) {
  if (mode === "tonight") return "Bay-wide tonight";
  return "Bay-wide upcoming";
}

function scoreForFeed(args: {
  event: Event;
  mode: ExploreFeedMode;
  friendCount: number;
  attendeeCount: number;
  recentCount: number;
  trending: boolean;
}) {
  const { event, mode, friendCount, attendeeCount, recentCount, trending } = args;
  const ts = eventTimestamp(event);
  const nowTs = Date.now();
  const diffDays = Number.isFinite(ts) ? (ts - nowTs) / (24 * 60 * 60 * 1000) : 999;
  const sourceWeight = sourcePriority(event.eventSource);
  const internalBoost = sourceWeight >= 3 ? 36 : sourceWeight === 2 ? 14 : 0;
  const friendBoost = friendCount > 0 ? 42 + Math.max(0, friendCount - 1) * 18 : 0;
  const crowdBoost = Math.log1p(Math.max(0, attendeeCount)) * 14;
  const recentBoost = Math.min(5, recentCount) * 8;
  const trendingBoost = trending ? 6 : 0;
  const tasteBoost = hasTasteSignal(event) ? 6 : 0;

  let timeBoost = 0;
  if (mode === "tonight") {
    if (Number.isFinite(ts)) {
      const hoursUntilStart = (ts - nowTs) / (1000 * 60 * 60);
      if (hoursUntilStart >= -3 && hoursUntilStart <= 4) timeBoost = 18;
      else if (hoursUntilStart <= 10) timeBoost = 12;
      else timeBoost = 6;
    }
  } else {
    if (diffDays <= 2) timeBoost = 20;
    else if (diffDays <= 7) timeBoost = 14;
    else if (diffDays <= 21) timeBoost = 9;
    else timeBoost = 4;
  }

  return internalBoost + friendBoost + crowdBoost + recentBoost + trendingBoost + tasteBoost + timeBoost;
}

export function Explore() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [friendEvents, setFriendEvents] = useState<Event[]>([]);
  const [trendingEvents, setTrendingEvents] = useState<Event[]>([]);
  const [rsvpByEventId, setRsvpByEventId] = useState<Record<string, RsvpState>>({});
  const [feedMode, setFeedMode] = useState<ExploreFeedMode>("tonight");
  const [tagFilter, setTagFilter] = useState("all");
  const [selectedUpcomingDate, setSelectedUpcomingDate] = useState<Date | undefined>();

  const onboardingMode = useMemo(
    () => new URLSearchParams(location.search).get("onboarding") === "1",
    [location.search]
  );

  const refreshRecommendations = async () => {
    setLoadingEvents(true);
    try {
      const {
        loadFriendsFallbackExplore,
        loadPersonalizedExplore,
        loadRegionalFallbackExplore,
        loadTrendingExplore,
      } = await import("@/lib/explorePersonalization");

      const [friends, personalized, regional, trending] = await Promise.all([
        loadFriendsFallbackExplore(),
        loadPersonalizedExplore(""),
        loadRegionalFallbackExplore(),
        loadTrendingExplore(""),
      ]);

      const merged = mergeEventCollections(friends, personalized, trending, regional);

      setEvents(merged);
      setFriendEvents(friends);
      setTrendingEvents(trending);
      void hydrateExploreRsvpState([...merged, ...friends, ...trending]);

      void logProductEvent({
        eventName: "explore_feed_loaded",
        source: "explore",
        metadata: {
          bay_scope: true,
          feed_mode: feedMode,
          result_count: merged.length,
          friend_count: friends.length,
          trending_count: trending.length,
          internal_count: merged.filter((event) => sourcePriority(event.eventSource) === 3).length,
        },
      });
    } catch (error: any) {
      console.error("Explore load failed:", error);
      setEvents([]);
      setFriendEvents([]);
      setTrendingEvents([]);
      toast.error("Could not refresh Explore right now.");
    } finally {
      setLoadingEvents(false);
    }
  };

  const hydrateExploreRsvpState = async (items: Event[]) => {
    const internalEventIds = Array.from(new Set(items.map((event) => event.id).filter(isUuid)));
    if (internalEventIds.length === 0) {
      setRsvpByEventId({});
      return;
    }

    const viewerId = user?.id ?? null;

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

  useEffect(() => {
    void refreshRecommendations();
  }, []);

  const friendCountByEventId = useMemo(() => {
    const next: Record<string, number> = {};
    for (const event of friendEvents) {
      next[event.id] = Math.max(next[event.id] ?? 0, event.attendees ?? 0);
    }
    return next;
  }, [friendEvents]);

  const trendingEventIds = useMemo(() => new Set(trendingEvents.map((event) => event.id)), [trendingEvents]);

  const feedScopedEvents = useMemo(
    () => events.filter((event) => matchesFeedMode(event, feedMode)),
    [events, feedMode]
  );

  const hasTonightEvents = useMemo(
    () => events.some((event) => matchesFeedMode(event, "tonight")),
    [events]
  );

  const nearestUpcomingDate = useMemo(() => {
    const upcomingTimestamps = events
      .filter((event) => matchesFeedMode(event, "upcoming"))
      .map((event) => eventTimestamp(event))
      .filter((ts) => Number.isFinite(ts) && ts !== Number.MAX_SAFE_INTEGER)
      .sort((a, b) => a - b);

    if (upcomingTimestamps.length === 0) return undefined;
    return startOfDay(new Date(upcomingTimestamps[0]));
  }, [events]);

  const availableUpcomingDateKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const event of events) {
      if (!matchesFeedMode(event, "upcoming")) continue;
      const ts = eventTimestamp(event);
      if (!Number.isFinite(ts) || ts === Number.MAX_SAFE_INTEGER) continue;
      keys.add(format(new Date(ts), "yyyy-MM-dd"));
    }
    return keys;
  }, [events]);

  useEffect(() => {
    if (feedMode !== "tonight" || hasTonightEvents) return;

    setFeedMode("upcoming");
    setSelectedUpcomingDate((current) => current ?? nearestUpcomingDate);
  }, [feedMode, hasTonightEvents, nearestUpcomingDate]);

  const activateUpcomingDate = () => {
    setFeedMode("upcoming");
    setSelectedUpcomingDate((current) => current ?? nearestUpcomingDate);
  };

  const availableTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of feedScopedEvents) {
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
  }, [feedScopedEvents]);

  const filteredFeedEvents = useMemo(
    () =>
      feedScopedEvents.filter((event) => {
        if (tagFilter !== "all" && !(Array.isArray(event.tags) ? event.tags : []).includes(tagFilter)) {
          return false;
        }

        if (feedMode === "upcoming" && selectedUpcomingDate) {
          const ts = eventTimestamp(event);
          if (!Number.isFinite(ts) || ts === Number.MAX_SAFE_INTEGER) return false;
          return isSameDay(new Date(ts), selectedUpcomingDate);
        }

        return true;
      }),
    [feedScopedEvents, feedMode, selectedUpcomingDate, tagFilter]
  );

  const friendSpotlightEvents = useMemo(() => {
    return [...friendEvents]
      .filter((event) => matchesFeedMode(event, feedMode))
      .filter((event) => tagFilter === "all" || (Array.isArray(event.tags) ? event.tags : []).includes(tagFilter))
      .sort((a, b) => {
        const aFriends = friendCountByEventId[a.id] ?? 0;
        const bFriends = friendCountByEventId[b.id] ?? 0;
        if (aFriends !== bFriends) return bFriends - aFriends;
        return eventTimestamp(a) - eventTimestamp(b);
      })
      .slice(0, 3);
  }, [feedMode, friendCountByEventId, friendEvents, tagFilter]);

  const hasFriendSignal = useMemo(
    () => Object.values(friendCountByEventId).some((count) => count > 0),
    [friendCountByEventId]
  );

  const moveRanking = useMemo(() => {
    return rankMoveCandidates(
      filteredFeedEvents.map((event) => ({
        id: event.id,
        title: event.title,
        startAt: event.eventDateIso ?? event.date,
        totalRsvps: rsvpByEventId[event.id]?.count ?? event.attendees ?? 0,
        friendRsvps: friendCountByEventId[event.id] ?? 0,
        recentRsvps: rsvpByEventId[event.id]?.recentCount ?? 0,
        quality: sourcePriority(event.eventSource) >= 2 ? 1 : 0.92,
      })),
      "circle"
    );
  }, [filteredFeedEvents, friendCountByEventId, rsvpByEventId]);

  const heroSignal = feedMode === "tonight" ? moveRanking.topSignal : null;
  const heroEvent = useMemo(
    () => (heroSignal ? filteredFeedEvents.find((event) => event.id === heroSignal.eventId) ?? null : null),
    [filteredFeedEvents, heroSignal]
  );

  const featuredEventIds = useMemo(() => {
    const ids = new Set<string>();
    if (heroEvent?.id) ids.add(heroEvent.id);
    for (const event of friendSpotlightEvents) ids.add(event.id);
    return ids;
  }, [friendSpotlightEvents, heroEvent?.id]);

  const rankedFeedEvents = useMemo(() => {
    return [...filteredFeedEvents]
      .sort((a, b) => {
        const aCount = rsvpByEventId[a.id]?.count ?? a.attendees ?? 0;
        const bCount = rsvpByEventId[b.id]?.count ?? b.attendees ?? 0;
        const aScore = scoreForFeed({
          event: a,
          mode: feedMode,
          friendCount: friendCountByEventId[a.id] ?? 0,
          attendeeCount: aCount,
          recentCount: rsvpByEventId[a.id]?.recentCount ?? 0,
          trending: trendingEventIds.has(a.id),
        });
        const bScore = scoreForFeed({
          event: b,
          mode: feedMode,
          friendCount: friendCountByEventId[b.id] ?? 0,
          attendeeCount: bCount,
          recentCount: rsvpByEventId[b.id]?.recentCount ?? 0,
          trending: trendingEventIds.has(b.id),
        });

        if (bScore !== aScore) return bScore - aScore;
        const aSource = sourcePriority(a.eventSource);
        const bSource = sourcePriority(b.eventSource);
        if (aSource !== bSource) return bSource - aSource;
        const aFriends = friendCountByEventId[a.id] ?? 0;
        const bFriends = friendCountByEventId[b.id] ?? 0;
        if (aFriends !== bFriends) return bFriends - aFriends;
        const aTs = eventTimestamp(a);
        const bTs = eventTimestamp(b);
        if (aTs !== bTs) return aTs - bTs;
        return bCount - aCount;
      })
      .filter((event) => !featuredEventIds.has(event.id));
  }, [featuredEventIds, feedMode, filteredFeedEvents, friendCountByEventId, rsvpByEventId, trendingEventIds]);

  const filtersActive = tagFilter !== "all" || (feedMode === "upcoming" && !!selectedUpcomingDate);
  const heroHeading =
    feedMode === "tonight"
      ? heroEvent
        ? "The Bay is converging here tonight."
        : "No single event has pulled away yet."
      : "Upcoming keeps the strongest Bay picks in one place.";
  const primarySectionTitle = feedMode === "tonight" ? "Best In The Bay Tonight" : "Upcoming Across The Bay";
  const primarySectionBody =
    feedMode === "tonight"
      ? heroEvent
        ? "Friends, attendance, and momentum are quietly shaping this ranking."
        : "Signal is still soft, so this is the best stack of options right now."
      : "Future events start tomorrow and stay ranked Bay-wide, with internal events first.";

  const lowDensityGuideEvent = useMemo(() => {
    if (heroEvent) return heroEvent;
    if (friendSpotlightEvents.length > 0) return friendSpotlightEvents[0];
    if (rankedFeedEvents.length > 0) return rankedFeedEvents[0];
    return null;
  }, [friendSpotlightEvents, heroEvent, rankedFeedEvents]);

  const handleQuickRsvp = async (event: Event) => {
    if (featureFlags.killSwitchRsvpWrites) {
      toast.error("RSVP is temporarily unavailable");
      return;
    }
    if (!isUuid(event.id)) {
      toast.error("Open event details to RSVP");
      return;
    }

    if (!user?.id) {
      toast.error("Sign in to RSVP");
      return;
    }

    const uid = user.id;
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

  return (
    <div className="min-h-screen bg-black pb-24 text-white relative">
      <div className="relative h-48" style={exploreCoverStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black" />
        <div className="relative px-5 pt-12">
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Sparkles className="h-6 w-6 text-purple-400" />
            Explore
          </h1>
          <p className="mt-1 text-zinc-400">Bay-wide rave discovery, built for tonight first.</p>
        </div>
      </div>

      <div className="space-y-6 px-5 pt-4">
        {onboardingMode ? (
          <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
            <div className="text-sm font-semibold text-white">Step 2: pick one night</div>
            <div className="mt-1 text-xs text-zinc-300">
              Lock one plan and we&apos;ll take you straight to the page where invites and social proof hit hardest.
            </div>
          </div>
        ) : null}

        <div className="space-y-3 rounded-2xl border border-white/10 bg-zinc-950/65 p-4 backdrop-blur-sm">
          <div>
            <div className="text-sm font-semibold text-white">Choose the lens</div>
            <div className="mt-1 text-xs text-zinc-500">
              {hasTonightEvents
                ? "Tonight helps you decide now. Upcoming starts tomorrow and keeps the next Bay events in one place."
                : "No events are live tonight, so Explore starts with the closest upcoming date instead."}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {hasTonightEvents ? (
              <button
                type="button"
                onClick={() => {
                  setFeedMode("tonight");
                  setSelectedUpcomingDate(undefined);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  feedMode === "tonight"
                    ? "border-fuchsia-300 bg-gradient-to-r from-pink-500 to-violet-500 text-white"
                    : "border-white/10 bg-zinc-900/60 text-zinc-300 hover:border-white/20 hover:text-white"
                }`}
              >
                Tonight
              </button>
            ) : null}

            <ExploreDatePicker
              selectedDate={selectedUpcomingDate}
              active={feedMode === "upcoming"}
              availableDateKeys={availableUpcomingDateKeys}
              emptyLabel="Upcoming"
              onActivate={activateUpcomingDate}
              onSelect={(date) => {
                setFeedMode("upcoming");
                setSelectedUpcomingDate(date ?? nearestUpcomingDate);
              }}
            />
          </div>

          <div className="text-xs text-zinc-500">
            Bay Area only for now. Internal events rank first, and friend activity carries the most weight.
          </div>
        </div>

        {!hasFriendSignal && lowDensityGuideEvent ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <div className="text-sm font-semibold text-white">Best next move if your graph is still thin</div>
            <div className="mt-1 text-xs text-zinc-300">
              Start with one strong room, then send it to one friend. That is the fastest way to make Explore feel alive.
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-200">Start here</div>
              <div className="mt-2 text-lg font-semibold text-white">{lowDensityGuideEvent.title}</div>
              <div className="mt-1 text-sm text-zinc-400">
                {lowDensityGuideEvent.location || "Bay Area"} · {lowDensityGuideEvent.date}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate(`/event/${lowDensityGuideEvent.id}?src=explore`)}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                >
                  Open event
                </button>
                <button
                  type="button"
                  onClick={() => void handleQuickRsvp(lowDensityGuideEvent)}
                  disabled={!isUuid(lowDensityGuideEvent.id) || !!rsvpByEventId[lowDensityGuideEvent.id]?.working}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/15 disabled:opacity-60"
                >
                  {rsvpByEventId[lowDensityGuideEvent.id]?.going ? "You're in" : "RSVP now"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/friends")}
                  className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-white/10"
                >
                  Add a friend
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {heroSignal && heroEvent ? (
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold">Top Pick Tonight</h3>
              <div className="mt-0.5 text-xs text-zinc-600">{heroHeading}</div>
            </div>
            <TheMoveHero
              eventId={heroEvent.id}
              title={heroEvent.title}
              context="Bay Area tonight"
              meta={heroEvent.location || "Location TBD"}
              signal={heroSignal}
              source="explore"
            />
          </div>
        ) : null}

        {friendSpotlightEvents.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Users className="h-4 w-4 text-fuchsia-300" />
                  Friends Are Going
                </h3>
                <div className="mt-0.5 text-xs text-zinc-600">
                  Friend activity stays visible and also boosts these events in the Bay ranking.
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              {friendSpotlightEvents.map((event) => (
                <EventCard
                  key={`friend-${event.id}`}
                  event={event}
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
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                {primarySectionTitle}
                {loadingEvents ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" /> : null}
              </h3>
              <div className="mt-0.5 text-xs text-zinc-600">{primarySectionBody}</div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-zinc-950/65 p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Refine the mix</div>
                <div className="mt-1 text-xs text-zinc-500">
                  Filter by sound while keeping the Bay-wide ranking logic intact.
                </div>
              </div>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setTagFilter("all");
                    setSelectedUpcomingDate(undefined);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-zinc-300 hover:border-white/20 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                  Reset
                </button>
              ) : null}
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
              Showing <span className="text-zinc-200">{rankedFeedEvents.length}</span> events from{" "}
              <span className="text-zinc-200">{formatScopeSummary(feedMode)}</span>
              {feedMode === "upcoming" && selectedUpcomingDate ? (
                <>
                  {" "}on <span className="text-zinc-200">{format(selectedUpcomingDate, "EEEE, MMM d")}</span>
                </>
              ) : null}
            </div>
          </div>

          {loadingEvents ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-2xl border border-white/10 bg-zinc-900/50"
                />
              ))}
            </div>
          ) : rankedFeedEvents.length > 0 ? (
            <div className="grid gap-6">
              {rankedFeedEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
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
            <div className="rounded-2xl border border-white/10 bg-zinc-900/40 p-5 text-sm text-zinc-400">
              {feedMode === "tonight"
                ? "Nothing strong is landing in the Bay tonight yet. Check upcoming or loosen the sound filter."
                : "No upcoming events fit this filter yet. Reset the sound filter and try again."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
