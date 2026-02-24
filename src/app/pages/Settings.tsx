import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User, Phone, Music, Ticket, Shield, Bell, HelpCircle, LogOut, ChevronRight, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export function Settings() {
  const navigate = useNavigate();
  const [spotifyConnected, setSpotifyConnected] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [confirmNotify, setConfirmNotify] = useState(true);
  const [visibility, setVisibility] = useState("friends");

  const handleLogout = async () => {
      await supabase.auth.signOut();
      toast.success("Logged out");
      navigate("/welcome");
  };

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-black/80 backdrop-blur-md z-10 p-4 border-b border-white/5 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="p-6 space-y-8">
        
        {/* Account Section */}
        <section>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 px-2">Account</h2>
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
                <div 
                    onClick={() => navigate("/profile/edit")}
                    className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors cursor-pointer border-b border-white/5"
                >
                    <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-zinc-400" />
                        <div>
                            <div className="font-medium">Profile Details</div>
                            <div className="text-xs text-zinc-500">Name, Handle, Avatar</div>
                        </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
                <div className="p-4 flex items-center justify-between hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-zinc-400" />
                        <div>
                            <div className="font-medium">Phone Number</div>
                            <div className="text-xs text-zinc-500">+1 (555) 123-4567</div>
                        </div>
                    </div>
                    <div className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-0.5 rounded">Verified</div>
                </div>
            </div>
        </section>

        {/* Integrations Section */}
        <section>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 px-2">Integrations</h2>
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Music className="w-5 h-5 text-[#1DB954]" />
                        <div className="font-medium">Spotify</div>
                    </div>
                    <button 
                        onClick={() => setSpotifyConnected(!spotifyConnected)}
                        className={`text-sm font-bold px-3 py-1.5 rounded-lg transition-colors ${spotifyConnected ? "bg-zinc-800 text-white border border-white/10" : "bg-[#1DB954] text-black"}`}
                    >
                        {spotifyConnected ? "Disconnect" : "Connect"}
                    </button>
                </div>
                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Ticket className="w-5 h-5 text-blue-500" />
                        <div className="font-medium">Ticketmaster</div>
                    </div>
                    <button className="text-sm font-bold px-3 py-1.5 rounded-lg bg-zinc-800 text-white border border-white/10 hover:bg-zinc-700 transition-colors">
                        Manage
                    </button>
                </div>
            </div>
        </section>

        {/* Privacy Section */}
        <section>
            <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4 px-2">Privacy & Notifications</h2>
            <div className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-zinc-400" />
                        <div>
                            <div className="font-medium">Default Visibility</div>
                            <div className="text-xs text-zinc-500">Who sees your events</div>
                        </div>
                    </div>
                    <select 
                        value={visibility}
                        onChange={(e) => setVisibility(e.target.value)}
                        className="bg-zinc-800 text-white text-sm rounded-lg px-2 py-1 border border-white/10 focus:outline-none focus:border-pink-500"
                    >
                        <option value="friends">Friends Only</option>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                    </select>
                </div>
                
                <div className="p-4 flex items-center justify-between border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-zinc-400" />
                        <div>
                            <div className="font-medium">Confirm before notifying</div>
                            <div className="text-xs text-zinc-500">Ask before sharing new tickets</div>
                        </div>
                    </div>
                    <Toggle checked={confirmNotify} onChange={() => setConfirmNotify(!confirmNotify)} />
                </div>

                <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center">
                            <span className="text-lg">💬</span>
                        </div>
                        <div>
                            <div className="font-medium">Allow SMS Notifications</div>
                            <div className="text-xs text-zinc-500">Receive texts about friends</div>
                        </div>
                    </div>
                    <Toggle checked={smsEnabled} onChange={() => setSmsEnabled(!smsEnabled)} />
                </div>
            </div>
        </section>

        {/* Support Section */}
        <section>
            <div className="space-y-2">
                <button className="w-full p-4 flex items-center justify-between bg-zinc-900/30 border border-white/5 rounded-2xl hover:bg-zinc-800/50 transition-colors text-left">
                    <div className="flex items-center gap-3">
                        <HelpCircle className="w-5 h-5 text-zinc-400" />
                        <span className="font-medium">Help & Support</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                </button>
                
                <button 
                    onClick={handleLogout}
                    className="w-full p-4 flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-colors text-left group"
                >
                    <div className="flex items-center gap-3">
                        <LogOut className="w-5 h-5 text-red-500" />
                        <span className="font-medium text-red-500">Log Out</span>
                    </div>
                </button>
            </div>
            
            <div className="text-center mt-8">
                <p className="text-xs text-zinc-700">Whozin v1.0.0 (MVP)</p>
            </div>
        </section>

      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean, onChange: () => void }) {
    return (
        <button 
            onClick={onChange}
            className={`w-12 h-7 rounded-full relative transition-colors ${checked ? "bg-pink-500" : "bg-zinc-700"}`}
        >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${checked ? "right-1" : "left-1"}`} />
        </button>
    );
}
