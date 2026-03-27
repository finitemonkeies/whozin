import { useState } from 'react';
import { Cover } from './components/Cover';
import { BrandFoundation } from './components/BrandFoundation';
import { VoiceMessaging } from './components/VoiceMessaging';
import { ColorSystem } from './components/ColorSystem';
import { LogoSystemRefined } from './components/LogoSystemRefined';
import { ProductExpression } from './components/ProductExpression';
import { SocialAssets } from './components/SocialAssets';
import { DosAndDonts } from './components/DosAndDonts';
import { BrandSystemSpec } from './components/BrandSystemSpec';

const tabs = [
  { id: 'cover', label: 'Cover', component: Cover },
  { id: 'spec', label: 'Brand System Spec', component: BrandSystemSpec },
  { id: 'foundation', label: 'Brand Foundation', component: BrandFoundation },
  { id: 'voice', label: 'Voice & Messaging', component: VoiceMessaging },
  { id: 'color', label: 'Color System', component: ColorSystem },
  { id: 'logo', label: 'Logo System', component: LogoSystemRefined },
  { id: 'product', label: 'Product Expression', component: ProductExpression },
  { id: 'social', label: 'Social & Marketing', component: SocialAssets },
  { id: 'dos', label: 'Dos & Don\'ts', component: DosAndDonts },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('cover');
  
  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Cover;

  return (
    <div className="min-h-screen bg-[#000000]">
      {/* Header - only show if not on cover */}
      {activeTab !== 'cover' && (
        <header className="sticky top-0 z-50 bg-[#000000]/90 backdrop-blur-xl border-b border-[#18181B]">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-[12px] flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)' }}
                >
                  <svg
                    viewBox="0 0 120 120"
                    className="w-7 h-7"
                    fill="white"
                  >
                    <path d="M18 22 L38 22 L50 82 L62 22 L82 22 L94 82 L106 22 L126 22 L109 103 L89 103 L71 38 L53 103 L33 103 Z" 
                      strokeLinejoin="miter" 
                      strokeLinecap="square"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-white text-xl font-bold tracking-tight">Whozin</h1>
                  <p className="text-[#52525b] text-xs">Brand Book 2026</p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex gap-2 overflow-x-auto pb-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-[#DB2777] to-[#9333EA] text-white'
                      : 'bg-[#09090B] text-[#71717A] hover:text-white hover:bg-[#18181B] border border-[#18181B]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </header>
      )}

      {/* Cover navigation - show only on cover */}
      {activeTab === 'cover' && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => setActiveTab('spec')}
            className="px-8 py-4 rounded-full text-white font-bold backdrop-blur-xl border border-[#27272A] transition-all hover:border-[#DB2777]"
            style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
          >
            Explore Brand System
          </button>
        </div>
      )}

      {/* Content */}
      <main>
        <ActiveComponent />
      </main>

      {/* Footer - only show if not on cover */}
      {activeTab !== 'cover' && (
        <footer className="bg-[#000000] border-t border-[#18181B] py-12">
          <div className="max-w-7xl mx-auto px-8 text-center">
            <p className="text-[#52525b] text-sm mb-2">
              Whozin Brand Book • 2026
            </p>
            <p className="text-[#3f3f46] text-xs">
              Private, social, nightlife-native
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}