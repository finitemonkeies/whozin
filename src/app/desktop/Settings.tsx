import { Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Bell, Shield, LogOut, ChevronRight, Settings } from "lucide-react";
import { motion } from "motion/react";

export function DesktopSettings() {
  const sections = [
    { icon: User, title: "Account", desc: "Profile details & avatar" },
    { icon: Mail, title: "Connected Email", desc: "Manage ticket sync" },
    { icon: Shield, title: "Default Visibility", desc: "Who sees your events" },
    { icon: Bell, title: "Notifications", desc: "SMS & email alerts" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex justify-center items-center">
      <div className="max-w-[600px] w-full p-8 md:p-16">
        <header className="flex items-center gap-4 mb-12 border-b border-zinc-900 pb-8">
            <Link to="/web/tickets" className="p-2 hover:bg-zinc-900 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            <div>
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-zinc-500 text-sm">Manage your account and preferences.</p>
            </div>
        </header>

        <div className="space-y-4">
            {sections.map((section, i) => {
                const Icon = section.icon;
                return (
                    <motion.div 
                        key={section.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between hover:bg-zinc-900 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                                <Icon className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm text-zinc-200 group-hover:text-white transition-colors">{section.title}</h3>
                                <p className="text-xs text-zinc-500">{section.desc}</p>
                            </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                    </motion.div>
                );
            })}

            <div className="h-px bg-zinc-900 my-8" />

            <button className="w-full text-left p-4 rounded-2xl text-red-500 font-bold text-sm hover:bg-red-500/10 transition-colors flex items-center gap-4">
                <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                    <LogOut className="w-5 h-5" />
                </div>
                Log Out
            </button>
            
            <button className="w-full text-left p-4 rounded-2xl text-zinc-600 font-medium text-sm hover:bg-zinc-900 transition-colors flex items-center gap-4">
                <div className="w-10 h-10 flex items-center justify-center">
                </div>
                Delete Account
            </button>
        </div>
      </div>
    </div>
  );
}
