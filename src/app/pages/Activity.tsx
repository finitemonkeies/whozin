import { Users, Ticket, MessageCircle, Share2, Plus } from "lucide-react";
import { EVENTS } from "../../data/mock";

export function Activity() {
  const activities = [
    { id: 1, user: "Sarah", action: "is going to", event: "Afterlife", time: "2m ago", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80" },
    { id: 2, user: "Mike", action: "synced a ticket for", event: "Bass Canyon", time: "1h ago", avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=150&q=80" },
    { id: 3, user: "Jessica", action: "is going to", event: "Dreamstate", time: "3h ago", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Activity</h1>
        <button className="bg-zinc-900 border border-white/10 p-2 rounded-full hover:bg-zinc-800 transition-colors">
            <Plus className="w-5 h-5 text-white" />
        </button>
      </div>

      <div className="space-y-4">
        {activities.map(activity => (
            <div key={activity.id} className="bg-zinc-900/50 border border-white/5 p-4 rounded-xl flex gap-4">
                <img src={activity.avatar} alt={activity.user} className="w-12 h-12 rounded-full object-cover border border-black" />
                <div className="flex-1">
                    <p className="text-sm">
                        <span className="font-bold text-white">{activity.user}</span> <span className="text-zinc-400">{activity.action}</span> <span className="font-bold text-pink-400">{activity.event}</span>
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-zinc-600">{activity.time}</span>
                        <button className="text-xs font-bold text-zinc-400 hover:text-white transition-colors">Say hi 👋</button>
                    </div>
                </div>
            </div>
        ))}

        {/* Empty State / Call to Action */}
        <div className="mt-8 bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="font-bold text-lg mb-2">Invite your rave squad</h3>
            <p className="text-zinc-500 text-sm mb-6">Whozin is better with friends. Invite them to see where they're going.</p>
            
            <div className="grid grid-cols-2 gap-3">
                <button className="py-3 bg-white text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    Text Invite
                </button>
                <button className="py-3 bg-zinc-800 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors">
                    <Share2 className="w-4 h-4" />
                    Share Link
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
