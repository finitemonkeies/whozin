import { useState, useEffect } from "react";
import { Music, CheckCircle, Loader2, Sparkles, AudioWaveform } from "lucide-react";
import { toast } from "sonner";
import { EventCard } from "../components/EventCard";
import { Event } from "../../data/mock";
import { loadPersonalizedExplore } from "@/lib/explorePersonalization";
import { supabase } from "@/lib/supabase";
import { logProductEvent } from "@/lib/productEvents";
import {
  getSpotifyConnectionStatus,
  startSpotifyOAuthRedirect,
  syncSpotifyTasteFromSession,
} from "@/lib/spotify";

const exploreCoverStyle = {
  background:
    "radial-gradient(1200px 520px at 20% 20%, rgba(168,85,247,0.55), transparent 55%), radial-gradient(900px 520px at 80% 10%, rgba(236,72,153,0.55), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0))",
} as const;

type StoredSpotifyTaste = {
  genres?: string[];
};

function toTitleCase(value: string): string {
  return value
    .split(/\s+/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function loadTasteGenresFromStorage(): string[] {
  try {
    const raw = localStorage.getItem("whozin_spotify_taste");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredSpotifyTaste;
    if (!Array.isArray(parsed.genres)) return [];
    return parsed.genres
      .map((g) => g.trim())
      .filter(Boolean)
      .slice(0, 6)
      .map(toTitleCase);
  } catch {
    return [];
  }
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

export function Explore() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);

  const [cityInput, setCityInput] = useState(localStorage.getItem("whozin_explore_city") || "");
  const [autoCityHint, setAutoCityHint] = useState(
    localStorage.getItem("whozin_explore_auto_city") || ""
  );
  const [activeCity, setActiveCity] = useState(localStorage.getItem("whozin_explore_city") || "");
  const [tasteGenres, setTasteGenres] = useState<string[]>(loadTasteGenresFromStorage());

  const effectiveCity = activeCity.trim() || autoCityHint.trim();

  useEffect(() => {
    const resolveAutoCity = async () => {
      if (cityInput.trim()) return;
      if (autoCityHint.trim()) return;

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
        return;
      }

      try {
        const { lat, lon } = await getBrowserPosition();
        const city = await reverseGeocodeCity(lat, lon);
        if (city) {
          setAutoCityHint(city);
          localStorage.setItem("whozin_explore_auto_city", city);
          if (!activeCity.trim()) setActiveCity(city);
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
    };

    void resolveAutoCity();
  }, [cityInput, autoCityHint, activeCity]);

  const refreshRecommendations = async (city: string) => {
    setLoadingEvents(true);
    try {
      const ranked = await loadPersonalizedExplore(city);
      setEvents(ranked);

      void logProductEvent({
        eventName: "explore_feed_loaded",
        source: "explore",
        metadata: {
          city: city || null,
          spotify_connected: connected,
          result_count: ranked.length,
          artist_matched_count: ranked.filter(
            (e) =>
              (e.matchReason ?? "").toLowerCase().includes("because you like") ||
              (e.matchReason ?? "").toLowerCase().includes("suggested")
          ).length,
          ticketed_count: ranked.filter((e) => !!e.ticketUrl).length,
        },
      });
    } catch (e: any) {
      console.error("Explore personalization failed:", e);
      setEvents([]);
      toast.error("Could not refresh personalized events right now.");
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      const status = await getSpotifyConnectionStatus().catch(() => ({
        linked: false,
        hasToken: false,
      }));

      if (!status.linked) {
        localStorage.removeItem("spotify_connected");
        localStorage.removeItem("whozin_spotify_taste");
        localStorage.removeItem("whozin_spotify_last_sync");
        setConnected(false);
        setTasteGenres([]);
        return;
      }

      setConnected(true);

      if (status.hasToken) {
        const taste = await syncSpotifyTasteFromSession().catch(() => null);
        if (!taste) {
          toast.error("Spotify connected, but taste sync failed. Try reconnecting.");
        }
      }

      setTasteGenres(loadTasteGenresFromStorage());
      await refreshRecommendations(effectiveCity);
    };

    void run();
  }, [effectiveCity]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await startSpotifyOAuthRedirect("/explore");
    } catch (e: any) {
      console.error("Spotify OAuth failed:", e);
      toast.error(e?.message ?? "Could not start Spotify connection");
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 relative">
      <div className="relative h-48" style={exploreCoverStyle}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/10 to-black" />
        <div className="relative px-5 pt-12">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            Explore
          </h1>
          <p className="text-zinc-400 mt-1">Discover events based on your vibe.</p>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-6">
        {!connected ? (
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 text-center space-y-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-green-500/10 to-transparent pointer-events-none" />

            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full bg-[#1DB954] blur-xl opacity-25" />
              <div className="relative w-16 h-16 bg-[#1DB954] rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(29,185,84,0.22)]">
                <Music className="w-8 h-8 text-black fill-black" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold">Sync Your Sound</h2>
              <p className="text-sm text-zinc-400 mt-1">
                Connect Spotify to find raves matching your listening history.
              </p>
            </div>

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70 disabled:scale-100"
            >
              {connecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Music className="w-5 h-5 fill-black" />
                  Connect Spotify
                </>
              )}
            </button>

            <div className="text-[11px] text-zinc-500">
              We only use listening signals to recommend events - you control visibility.
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-zinc-900/30 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 rounded-full bg-[#1DB954] blur-xl opacity-20" />
                <div className="relative w-10 h-10 bg-[#1DB954]/15 rounded-full flex items-center justify-center border border-white/10">
                  <AudioWaveform className="w-5 h-5 text-[#1DB954]" />
                </div>
              </div>

              <div>
                <div className="font-medium text-sm">Spotify Connected</div>
                <div className="text-xs text-zinc-500">Top + suggested artists, matched to your city</div>
              </div>
            </div>
            <CheckCircle className="w-5 h-5 text-[#1DB954]" />
          </div>
        )}

        {connected && (
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Recommended for You
                  {loadingEvents && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
                </h3>
                <div className="text-xs text-zinc-600 mt-0.5">Nearby concerts from your top and suggested artists</div>
              </div>
            </div>

            {tasteGenres.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.16em] text-zinc-500">Your Taste</div>
                <div className="flex flex-wrap gap-2">
                  {tasteGenres.map((genre) => (
                    <span
                      key={genre}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-zinc-800/70 border border-white/10 text-zinc-200"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="flex gap-2">
              <input
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                placeholder="City for nearby events (ex: Chicago)"
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
                  setActiveCity(city);
                  void refreshRecommendations(city);
                }}
                className="px-3 py-2 rounded-xl text-sm bg-white/10 border border-white/10 hover:bg-white/15"
              >
                Refresh
              </button>
            </div>

            {!cityInput.trim() && autoCityHint.trim() ? (
              <div className="text-xs text-zinc-500">
                Using nearby fallback city: <span className="text-zinc-300">{autoCityHint}</span>
              </div>
            ) : null}

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
                {events.length > 0 ? (
                  events.map((event) => <EventCard key={event.id} event={event} />)
                ) : (
                  <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-5 text-sm text-zinc-400">
                    No artist-matched concerts found yet. Try a nearby city for fallback events.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!connected && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Browse by Vibe</h3>

            <div className="grid grid-cols-2 gap-3">
              {["Techno", "House", "Dubstep", "Trance"].map((genre) => (
                <button
                  key={genre}
                  type="button"
                  className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 text-center hover:bg-zinc-900 transition-colors active:scale-[0.99]"
                >
                  <span className="font-medium">{genre}</span>
                </button>
              ))}
            </div>

            <div className="text-xs text-zinc-600">
              Tip: connecting Spotify gives you higher-signal recommendations.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
