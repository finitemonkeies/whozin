
import { EVENTS } from "../../data/mock";
import { EventCard } from "../components/EventCard";
import { Bell, Zap } from "lucide-react";

export function Home() {
  return (
    <div className="pb-24 pt-4 px-4 max-w-md mx-auto min-h-screen bg-black text-white">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-pink-500 to-purple-600 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(236,72,153,0.5)]">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tighter">Whozin</h1>
        </div>
        <button className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <Bell className="w-5 h-5 text-zinc-400" />
        </button>
      </header>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Trending Events</h2>
          <button className="text-xs font-medium text-pink-500 hover:text-pink-400">See All</button>
        </div>
        
        <div className="flex flex-col gap-6">
          {EVENTS.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>
    </div>
  );
}
