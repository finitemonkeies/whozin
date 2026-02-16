
import { Calendar, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { Event } from "../../data/mock";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <Link to={`/event/${event.id}`} className="block group relative">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-zinc-900 border border-white/10">
        <img
          src={event.image}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-80 group-hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        
        {/* Price Tag */}
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-sm font-semibold text-white">
          {event.price}
        </div>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex gap-2 mb-2">
            {event.tags.map(tag => (
              <span key={tag} className="text-[10px] uppercase tracking-wider font-bold bg-pink-500/20 text-pink-400 px-2 py-0.5 rounded-sm border border-pink-500/20">
                {tag}
              </span>
            ))}
          </div>
          <h3 className="text-xl font-bold text-white mb-2 leading-tight shadow-black drop-shadow-lg">
            {event.title}
          </h3>
          
          <div className="flex flex-col gap-1.5 text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-400" />
              <span>{event.location}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex -space-x-2 overflow-hidden">
               {/* Mock attendees avatars */}
               {[1,2,3].map((_, i) => (
                 <div key={i} className="inline-block h-6 w-6 rounded-full ring-2 ring-black bg-zinc-800" />
               ))}
               <div className="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-black bg-zinc-800 text-[10px] text-white font-medium pl-1">
                 +{event.attendees > 100 ? '1k' : event.attendees}
               </div>
            </div>
            <span className="text-xs font-medium text-purple-400 group-hover:text-purple-300 transition-colors flex items-center gap-1">
              Who's in <Users className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
