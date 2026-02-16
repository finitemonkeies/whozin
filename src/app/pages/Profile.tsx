
import { CURRENT_USER, EVENTS } from "../../data/mock";
import { Settings, ShieldCheck, Ticket, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase, getServerUrl } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function Profile() {
  const [user, setUser] = useState<any>(CURRENT_USER);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
       const { data: { session } } = await supabase.auth.getSession();
       if (session) {
          try {
              const res = await fetch(getServerUrl("/me"), { 
                  headers: { Authorization: `Bearer ${session.access_token}` } 
              });
              const data = await res.json();
              if (data.id) setUser(data);
          } catch (e) {
              console.error(e);
          }
       }
       setLoading(false);
    }
    fetchProfile();
  }, []);

  const handleLogout = async () => {
      await supabase.auth.signOut();
      toast.success("Logged out");
      navigate("/login");
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <div className="relative h-40 bg-gradient-to-r from-purple-900 via-pink-900 to-black">
        <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={() => navigate('/settings')} className="p-2 bg-black/20 backdrop-blur-md rounded-full hover:bg-black/40 transition-colors">
                <Settings className="w-5 h-5 text-white" />
            </button>
        </div>
      </div>
      
      <div className="px-6 -mt-16 flex flex-col items-center">
        <div className="relative">
            <img 
                src={user.avatar || CURRENT_USER.avatar} 
                alt={user.name} 
                className="w-32 h-32 rounded-full border-4 border-black object-cover bg-zinc-800"
            />
            {user.verified && (
                <div className="absolute bottom-1 right-1 bg-blue-500 text-white p-1.5 rounded-full border-4 border-black" title="Verified">
                    <ShieldCheck className="w-5 h-5" />
                </div>
            )}
        </div>
        
        <h1 className="text-2xl font-bold mt-3">{user.name}</h1>
        <p className="text-zinc-500 font-medium">{user.handle || `@${user.name?.toLowerCase().replace(/\s/g, '')}`}</p>

        <div className="flex gap-8 mt-6 w-full max-w-xs justify-center border-b border-white/10 pb-6">
            <div className="text-center">
                <div className="text-xl font-bold">12</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Events</div>
            </div>
            <div className="text-center">
                <div className="text-xl font-bold">48</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Squads</div>
            </div>
            <div className="text-center">
                <div className="text-xl font-bold">850</div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Karma</div>
            </div>
        </div>

        <div className="w-full mt-6">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Ticket className="w-5 h-5 text-pink-500" />
                Upcoming Events
            </h2>
            
            <div className="space-y-4">
                {EVENTS.slice(0, 2).map(event => (
                    <div key={event.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex gap-4 items-center">
                        <img src={event.image} alt={event.title} className="w-16 h-16 rounded-lg object-cover" />
                        <div>
                            <h3 className="font-bold text-sm">{event.title}</h3>
                            <p className="text-xs text-zinc-400 mt-1">{event.date}</p>
                            <div className="mt-2 inline-flex items-center gap-1 bg-green-500/10 text-green-400 px-2 py-0.5 rounded text-[10px] font-medium border border-green-500/20">
                                Confirmed
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
