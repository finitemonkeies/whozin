import { useState } from 'react';
import { BrandOverview } from './components/BrandOverview';
import { LogoSystem } from './components/LogoSystem';
import { AppIconSystem } from './components/AppIconSystem';
import { SocialCards } from './components/SocialCards';
import { StyleGuide } from './components/StyleGuide';

const tabs = [
  { id: 'overview', label: 'Brand Overview', component: BrandOverview },
  { id: 'logo', label: 'Logo System', component: LogoSystem },
  { id: 'icons', label: 'App Icons', component: AppIconSystem },
  { id: 'social', label: 'Social Cards', component: SocialCards },
  { id: 'toolkit', label: 'Brand Toolkit', component: StyleGuide },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || BrandOverview;

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#000000]/80 backdrop-blur-xl border-b border-[#27272A]">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-[14px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-9 h-9"
                  fill="white"
                >
                  <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-white text-2xl font-bold tracking-tight">Whozin Brand Assets</h1>
                <p className="text-[#71717A] text-sm">See who's going before you go.</p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 rounded-xl font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#DB2777] to-[#9333EA] text-white'
                    : 'bg-[#18181B] text-[#A1A1AA] hover:text-white hover:bg-[#27272A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main>
        <ActiveComponent />
      </main>

      {/* Footer */}
      <footer className="bg-[#000000] border-t border-[#27272A] py-12">
        <div className="max-w-7xl mx-auto px-8 text-center">
          <p className="text-[#71717A] text-sm mb-2">
            Whozin Brand Asset System • 2026
          </p>
          <p className="text-[#71717A] text-xs">
            Dark, immersive, nightlife-native • Private by default
          </p>
        </div>
      </footer>
    </div>
  );
}