import { useState, useEffect } from "react";
import { Music, CheckCircle, Loader2, Sparkles, AudioWaveform } from "lucide-react";
import { toast } from "sonner";
import { EventCard } from "../components/EventCard";
import { Event } from "../../data/mock";

// Mock data for Spotify recommendations
const RECOMMENDED_EVENTS: Event[] = [
  {
    id: "r1",
    title: "Afterlife: Tale of Us",
    date: "NOV 10 • 11:00 PM",
    location: "Avant Gardner, NY",
    image:
      "https://images.unsplash.com/photo-1666682115302-a767a7b585f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    attendees: 3200,
    price: "$95",
    description:
      "Experience the realm of consciousness. Tale of Us brings their signature melodic techno sound to Brooklyn.",
    tags: ["Melodic Techno", "Visuals", "Immersive"],
  },
  {
    id: "r2",
    title: "Laserface: Gareth Emery",
    date: "DEC 05 • 8:00 PM",
    location: "Bill Graham Civic, SF",
    image:
      "https://images.unsplash.com/photo-1574154894072-18ba0d48321b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    attendees: 5000,
    price: "$75",
    description:
      "The world's greatest laser show returns. Perfect synchronization of lasers and trance music.",
    tags: ["Trance", "Lasers", "Arena"],
  },
  {
    id: "r3",
    title: "Berlin Underground",
    date: "OCT 28 • 11:59 PM",
    location: "Secret Warehouse, LA",
    image:
      "https://images.unsplash.com/photo-1589742117142-4c08de5aabcf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    attendees: 450,
    price: "$40",
    description:
      "Strictly techno. No photos. Black attire only. The true underground experience.",
    tags: ["Hard Techno", "Underground", "Secret"],
  },
  {
    id: "r4",
    title: "Bass Canyon 2026",
    date: "AUG 20 • 2:00 PM",
    location: "The Gorge, WA",
    image:
      "https://images.unsplash.com/photo-1571900267799-debdb80d1617?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    attendees: 25000,
    price: "$250",
    description:
      "Headbangers assemble. 3 days of heavy bass at the most beautiful venue in the world.",
    tags: ["Dubstep", "Camping", "Bass"],
  },
  {
    id: "r5",
    title: "Dreamstate SoCal",
    date: "NOV 18 • 5:00 PM",
    location: "NOS Events Center, CA",
    image:
      "https://images.unsplash.com/photo-1520242739010-44e95bde329e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    attendees: 15000,
    price: "$160",
    description:
      "Your trance destination. Uplifting, psy, tech, and progressive trance across 4 stages.",
    tags: ["Trance", "Psytrance", "Festival"],
  },
];

const exploreCoverStyle = {
  background:
    "radial-gradient(1200px 520px at 20% 20%, rgba(168,85,247,0.55), transparent 55%), radial-gradient(900px 520px at 80% 10%, rgba(236,72,153,0.55), transparent 55%), linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0))",
} as const;

export function Explore() {
  const comingSoon = true;
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const isConnected = localStorage.getItem("spotify_connected") === "true";
    if (isConnected) {
      setConnected(true);
      setEvents(RECOMMENDED_EVENTS);
    }
  }, []);

  const handleConnect = () => {
    setConnecting(true);

    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      localStorage.setItem("spotify_connected", "true");
      toast.success("Spotify connected successfully!");

      setLoadingEvents(true);
      setTimeout(() => {
        setEvents(RECOMMENDED_EVENTS);
        setLoadingEvents(false);
      }, 1200);
    }, 1400);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24 relative">
      {/* Header */}
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
        {/* Spotify Connect */}
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
              We only use listening signals to recommend events — you control visibility.
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
                <div className="text-xs text-zinc-500">Based on your recent listening</div>
              </div>
            </div>
            <CheckCircle className="w-5 h-5 text-[#1DB954]" />
          </div>
        )}

        {/* Recommendations */}
        {connected && (
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  Recommended for You
                  {loadingEvents && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
                </h3>
                <div className="text-xs text-zinc-600 mt-0.5">Powered by Spotify</div>
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
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories */}
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

      {comingSoon ? (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-zinc-950/90 p-8 text-center shadow-2xl">
            <div className="text-3xl font-bold tracking-tight">Coming Soon</div>
            <p className="mt-3 text-sm text-zinc-300">
              Explore is in progress. We will unlock this soon.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
