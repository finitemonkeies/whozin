import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2, Camera } from "lucide-react";
import { supabase, getServerUrl } from "../../lib/supabase";
import { toast } from "sonner";
import { CURRENT_USER } from "../../data/mock";

export function EditProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    handle: "",
    avatar: ""
  });

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Fallback to mock if no session (though user should be logged in)
        setFormData({
            name: CURRENT_USER.name,
            handle: CURRENT_USER.handle,
            avatar: CURRENT_USER.avatar
        });
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(getServerUrl("/me"), { 
            headers: { Authorization: `Bearer ${session.access_token}` } 
        });
        const data = await res.json();
        if (data.id) {
            setFormData({
                name: data.name || "",
                handle: data.handle || "",
                avatar: data.avatar || ""
            });
        }
      } catch (e) {
        console.error(e);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        toast.error("You must be logged in to save changes");
        setSaving(false);
        return;
    }

    try {
        const res = await fetch(getServerUrl("/me"), {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`
            },
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            toast.success("Profile updated!");
            navigate("/profile");
        } else {
            throw new Error("Failed to update");
        }
    } catch (e) {
        console.error(e);
        toast.error("Failed to update profile");
    } finally {
        setSaving(false);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-pink-500 animate-spin" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-white/10 sticky top-0 bg-black/80 backdrop-blur-md z-10">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Edit Profile</h1>
      </div>

      <div className="p-6 max-w-md mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Avatar Section */}
            <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer">
                    <img 
                        src={formData.avatar || "https://api.dicebear.com/9.x/avataaars/svg?seed=fallback"} 
                        alt="Avatar" 
                        className="w-24 h-24 rounded-full object-cover border-2 border-white/20 group-hover:border-pink-500 transition-colors bg-zinc-800"
                    />
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                    </div>
                </div>
                <div className="w-full">
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Avatar URL</label>
                    <input 
                        type="text" 
                        value={formData.avatar}
                        onChange={e => setFormData({...formData, avatar: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-pink-500 transition-colors text-sm"
                        placeholder="https://..."
                    />
                    <p className="text-[10px] text-zinc-500 mt-1">Paste an image URL for your avatar.</p>
                </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Display Name</label>
                    <input 
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-pink-500 transition-colors"
                        placeholder="Your Name"
                    />
                </div>

                <div>
                    <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1.5 block">Handle</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            value={formData.handle}
                            onChange={e => setFormData({...formData, handle: e.target.value})}
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-pink-500 transition-colors pl-9"
                            placeholder="@username"
                        />
                        <span className="absolute left-3 top-3.5 text-zinc-500 font-medium">@</span>
                    </div>
                </div>
            </div>

            <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 mt-8"
            >
                {saving ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save className="w-5 h-5" />
                        Save Changes
                    </>
                )}
            </button>
        </form>
      </div>
    </div>
  );
}
