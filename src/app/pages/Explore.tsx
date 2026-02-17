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
    image: "https://images.unsplash.com/photo-1666682115302-a767a7b585f8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    attendees: 3200,
    price: "$95",
    description: "Experience the realm of consciousness. Tale of Us brings their signature melodic techno sound to Brooklyn.",
    tags: ["Melodic Techno", "Visuals", "Immersive"],
  },
  {
    id: "r2",
    title: "Laserface: Gareth Emery",
    date: "DEC 05 • 8:00 PM",
    location: "Bill Graham Civic, SF",
    image: "https://images.unsplash.com/photo-1574154894072-18ba0d48321b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    attendees: 5000,
    price: "$75",
    description: "The world's greatest laser show returns. Perfect synchronization of lasers and trance music.",
    tags: ["Trance", "Lasers", "Arena"],
  },
  {
    id: "r3",
    title: "Berlin Underground",
    date: "OCT 28 • 11:59 PM",
    location: "Secret Warehouse, LA",
    image: "https://images.unsplash.com/photo-1589742117142-4c08de5aabcf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    attendees: 450,
    price: "$40",
    description: "Strictly techno. No photos. Black attire only. The true underground experience.",
    tags: ["Hard Techno", "Underground", "Secret"],
  },
  {
    id: "r4",
    title: "Bass Canyon 2026",
    date: "AUG 20 • 2:00 PM",
    location: "The Gorge, WA",
    image: "https://images.unsplash.com/photo-1571900267799-debdb80d1617?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    attendees: 25000,
    price: "$250",
    description: "Headbangers assemble. 3 days of heavy bass at the most beautiful venue in the world.",
    tags: ["Dubstep", "Camping", "Bass"],
  },
  {
    id: "r5",
    title: "Dreamstate SoCal",
    date: "NOV 18 • 5:00 PM",
    location: "NOS Events Center, CA",
    image: "https://images.unsplash.com/photo-1520242739010-44e95bde329e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    attendees: 15000,
    price: "$160",
    description: "Your trance destination. Uplifting, psy, tech, and progressive trance across 4 stages.",
    tags: ["Trance", "Psytrance", "Festival"],
  },
];

export function Explore() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);

  // Check if previously connected
  useEffect(() => {
    const isConnected = localStorage.getItem("spotify_connected") === "true";
    if (isConnected) {
      setConnected(true);
      setEvents(RECOMMENDED_EVENTS);
    }
  }, []);

  const handleConnect = () => {
    setConnecting(true);
    
    // Simulate API delay
    setTimeout(() => {
      setConnecting(false);
      setConnected(true);
      localStorage.setItem("spotify_connected", "true");
      toast.success("Spotify connected successfully!");
      
      // Simulate fetching events based on listening habits
      setLoadingEvents(true);
      setTimeout(() => {
        setEvents(RECOMMENDED_EVENTS);
        setLoadingEvents(false);
      }, 1500);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="p-6 pt-12 pb-2 bg-gradient-to-b from-purple-900/20 to-black">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            Explore
        </h1>
        <p className="text-zinc-400">Discover events based on your vibe.</p>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Spotify Connect Section */}
        {!connected ? (
            <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 text-center space-y-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-green-500/10 to-transparent pointer-events-none" />
                
                <div className="w-16 h-16 bg-[#1DB954] rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(29,185,84,0.3)]">
                    <Music className="w-8 h-8 text-black fill-black" />
                </div>
                
                <div>
                    <h2 className="text-xl font-bold mb-1">Sync Your Sound</h2>
                    <p className="text-sm text-zinc-400">Connect Spotify to find raves matching your listening history.</p>
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
            </div>
        ) : (
            <div className="flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1DB954]/20 rounded-full flex items-center justify-center">
                        <AudioWaveform className="w-5 h-5 text-[#1DB954]" />
                    </div>
                    <div>
                        <div className="font-medium text-sm">Spotify Connected</div>
                        <div className="text-xs text-zinc-500">Based on your recent listening</div>
                    </div>
                </div>
                <CheckCircle className="w-5 h-5 text-[#1DB954]" />
            </div>
        )}

        {/* Recommendations Grid */}
        {connected && (
            <div className="space-y-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                    Recommended for You
                    {loadingEvents && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
                </h3>

                {loadingEvents ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-zinc-900/50 h-64 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {events.map(event => (
                            <EventCard key={event.id} event={event} />
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* Categories (Always visible) */}
        {!connected && (
            <div className="space-y-4">
                <h3 className="font-bold text-lg">Browse by Vibe</h3>
                <div className="grid grid-cols-2 gap-3">
                    {['Techno', 'House', 'Dubstep', 'Trance'].map(genre => (
                        <div key={genre} className="bg-zinc-900 border border-white/5 rounded-xl p-4 text-center hover:bg-zinc-800 transition-colors cursor-pointer">
                            <span className="font-medium">{genre}</span>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
