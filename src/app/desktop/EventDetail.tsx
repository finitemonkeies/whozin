import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users, Ticket, Copy, MessageCircle, ChevronDown, Check } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

export function DesktopEventDetail() {
  const [visibility, setVisibility] = useState("Friends");
  const friends = [
    { name: "Sarae", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80" },
    { name: "Azeim", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80" },
    { name: "Melissa", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80" }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex flex-col md:flex-row">
        {/* Left Side: Event Image / Ambient */}
        <div className="md:w-1/2 h-64 md:h-screen relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-900/20 z-0" />
            <img 
                src="https://images.unsplash.com/photo-1574154894072-18ba0d48321b?auto=format&fit=crop&w=1080&q=80" 
                alt="Subtronics" 
                className="w-full h-full object-cover opacity-60 mix-blend-screen"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent md:bg-gradient-to-r md:from-transparent md:to-zinc-950" />
            
            <div className="absolute top-8 left-8">
                <Link to="/web/match" className="p-3 bg-black/40 backdrop-blur-md rounded-full hover:bg-black/60 transition-colors text-white inline-flex">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
            </div>
        </div>

        {/* Right Side: Content */}
        <div className="md:w-1/2 p-8 md:p-16 md:flex md:flex-col md:justify-center overflow-y-auto">
            <div className="max-w-md mx-auto w-full">
                
                <div className="mb-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-wider">
                    <Check className="w-3 h-3" /> Ticket Synced
                </div>

                <h1 className="text-5xl font-bold mb-2 tracking-tight">Subtronics</h1>
                
                <div className="flex items-center gap-6 text-zinc-400 mb-8 text-lg">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-zinc-500" />
                        <span>March 22</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-zinc-500" />
                        <span>The Factory</span>
                    </div>
                </div>

                <div className="h-px w-full bg-zinc-800 mb-8" />

                <div className="mb-10">
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-6 flex items-center justify-between">
                        Friends Going
                        <span className="text-white bg-zinc-800 px-2 py-0.5 rounded text-xs">3</span>
                    </h3>
                    
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {friends.map((friend) => (
                            <div key={friend.name} className="flex flex-col items-center gap-2">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-800">
                                    <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-sm font-medium">{friend.name}</span>
                            </div>
                        ))}
                    </div>

                    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                        <span className="text-sm text-zinc-400 font-medium">Who can see you're going?</span>
                        <div className="relative group">
                            <button className="flex items-center gap-2 text-white font-bold text-sm bg-black px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 transition-colors">
                                {visibility} <ChevronDown className="w-4 h-4 text-zinc-500" />
                            </button>
                            {/* Dropdown would go here, simplified for MVP */}
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">Invite friends to this event</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <button className="py-3 px-4 bg-zinc-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors border border-zinc-800">
                            <Copy className="w-4 h-4" />
                            Copy Link
                        </button>
                        <button className="py-3 px-4 bg-white text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors border border-transparent">
                            <MessageCircle className="w-4 h-4" />
                            Text Invite
                        </button>
                    </div>
                </div>

            </div>
        </div>
    </div>
  );
}
