import { Link } from "react-router-dom";
import { Ticket, Calendar, MapPin, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export function DesktopTickets() {
  const events = [
    {
      id: "subtronics",
      title: "Subtronics",
      date: "Mar 22",
      venue: "The Factory",
      image: "https://images.unsplash.com/photo-1574154894072-18ba0d48321b?auto=format&fit=crop&w=800&q=80"
    },
    {
      id: "excision",
      title: "Excision",
      date: "Apr 15",
      venue: "First Bank Center",
      image: "https://images.unsplash.com/photo-1470229722913-7ea05107f5b3?auto=format&fit=crop&w=800&q=80"
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-8 md:p-16">
      <div className="max-w-[1080px] mx-auto">
        <header className="flex justify-between items-end mb-12 border-b border-zinc-900 pb-8">
            <div>
                <h1 className="text-4xl font-bold mb-2">My Tickets</h1>
                <p className="text-zinc-500">Upcoming events you're attending.</p>
            </div>
            <Link to="/web/settings" className="text-sm font-bold text-zinc-500 hover:text-white transition-colors">
                Settings
            </Link>
        </header>

        <div className="grid grid-cols-1 gap-6">
            {events.map((event, i) => (
                <motion.div 
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="group bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 hover:bg-zinc-900 transition-colors hover:border-zinc-700"
                >
                    {/* Event Image */}
                    <div className="w-full md:w-48 h-32 md:h-32 rounded-2xl overflow-hidden relative flex-shrink-0">
                        <img 
                            src={event.image} 
                            alt={event.title} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    </div>

                    {/* Event Details */}
                    <div className="flex-1 w-full text-center md:text-left">
                        <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-400 transition-colors">{event.title}</h2>
                        <div className="flex flex-col md:flex-row items-center gap-4 text-zinc-400 text-sm font-medium">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>{event.date}</span>
                            </div>
                            <div className="hidden md:block w-1 h-1 bg-zinc-700 rounded-full" />
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{event.venue}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Link 
                            to={`/web/event/${event.id}`}
                            className="flex-1 md:flex-none py-3 px-6 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors text-sm flex items-center justify-center gap-2"
                        >
                            View Ticket
                        </Link>
                        <button className="flex-1 md:flex-none py-3 px-6 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors text-sm border border-zinc-700">
                            Add to Calendar
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
}
