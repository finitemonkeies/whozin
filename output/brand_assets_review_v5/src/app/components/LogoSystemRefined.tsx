export function LogoSystemRefined() {
  // Canonical refined W SVG - used consistently everywhere in the brand system
  const WhozinW = ({ className }: { className?: string }) => (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="currentColor"
    >
      {/* Final refined W with distinctive angled cuts and premium geometric character */}
      <path d="M18 22 L38 22 L50 82 L62 22 L82 22 L94 82 L106 22 L126 22 L109 103 L89 103 L71 38 L53 103 L33 103 Z" 
        strokeLinejoin="miter" 
        strokeLinecap="square"
      />
    </svg>
  );

  return (
    <div className="w-full min-h-screen bg-[#000000] p-8">
      <div className="max-w-6xl mx-auto py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-white text-6xl font-bold tracking-tight mb-6">Logo System</h1>
          <p className="text-[#A1A1AA] text-xl max-w-3xl">
            Canonical mark for all brand applications. Bold, geometric, premium. Works at all sizes from app icon to favicon.
          </p>
        </div>

        {/* Primary Mark - The canonical app icon */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Canonical App Icon</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-20 flex justify-center relative overflow-hidden">
            {/* Ambient glow behind icon */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] opacity-35"
              style={{ background: 'radial-gradient(circle, #DB2777 0%, #9333EA 70%)' }}
            />
            <div
              className="relative w-80 h-80 rounded-[64px] flex items-center justify-center shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)',
                boxShadow: '0 48px 96px rgba(219, 39, 119, 0.6), 0 0 160px rgba(147, 51, 234, 0.4)'
              }}
            >
              <WhozinW className="w-48 h-48 text-white" />
            </div>
          </div>
          <div className="mt-8 bg-[#18181B] border border-[#27272A] rounded-2xl p-6">
            <p className="text-[#A1A1AA] text-sm leading-relaxed">
              <span className="text-white font-bold">Implementation note:</span> This is the canonical mark for iOS/Android app icons, 
              splash screens, and primary brand moments. Gradient runs 135° from #EC4899 → #A855F7 → #9333EA. 
              Corner radius: 22% of container size.
            </p>
          </div>
        </div>

        {/* Core Variations */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Core Variations</p>
          <div className="grid grid-cols-3 gap-8">
            {/* Gradient - Primary */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8 text-center">
              <div className="flex justify-center mb-6">
                <div
                  className="w-36 h-36 rounded-[30px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)',
                    boxShadow: '0 24px 48px rgba(219, 39, 119, 0.5)'
                  }}
                >
                  <WhozinW className="w-20 h-20 text-white" />
                </div>
              </div>
              <p className="text-white font-bold mb-1">Primary Gradient</p>
              <p className="text-[#71717A] text-sm mb-3">Default usage</p>
              <div className="inline-flex px-3 py-1.5 bg-[#27272A] rounded-full">
                <code className="text-[#A1A1AA] text-xs font-mono">135° gradient</code>
              </div>
            </div>

            {/* White on Dark */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-36 h-36 bg-[#18181B] rounded-[30px] flex items-center justify-center">
                  <WhozinW className="w-20 h-20 text-white" />
                </div>
              </div>
              <p className="text-white font-bold mb-1">Monochrome Light</p>
              <p className="text-[#71717A] text-sm mb-3">Dark backgrounds</p>
              <div className="inline-flex px-3 py-1.5 bg-[#27272A] rounded-full">
                <code className="text-[#A1A1AA] text-xs font-mono">#FFFFFF</code>
              </div>
            </div>

            {/* Dark on Light */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-36 h-36 bg-white rounded-[30px] flex items-center justify-center">
                  <WhozinW className="w-20 h-20 text-[#09090B]" />
                </div>
              </div>
              <p className="text-white font-bold mb-1">Monochrome Dark</p>
              <p className="text-[#71717A] text-sm mb-3">Light backgrounds</p>
              <div className="inline-flex px-3 py-1.5 bg-[#27272A] rounded-full">
                <code className="text-[#A1A1AA] text-xs font-mono">#09090B</code>
              </div>
            </div>
          </div>
        </div>

        {/* Lockups for in-app usage */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Logo Lockups</p>
          
          {/* Horizontal */}
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12 mb-6">
            <div className="flex items-center gap-6 justify-center">
              <div
                className="w-28 h-28 rounded-[22px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)' }}
              >
                <WhozinW className="w-16 h-16 text-white" />
              </div>
              <h1 className="text-white text-8xl font-bold tracking-[-0.02em]">Whozin</h1>
            </div>
            <div className="mt-8 text-center">
              <p className="text-[#52525b] text-xs uppercase tracking-widest mb-2">Horizontal Lockup</p>
              <p className="text-[#71717A] text-sm">Primary usage for onboarding, splash screens, marketing</p>
            </div>
          </div>

          {/* Stacked */}
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12">
            <div className="flex flex-col items-center gap-6">
              <div
                className="w-36 h-36 rounded-[28px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)' }}
              >
                <WhozinW className="w-20 h-20 text-white" />
              </div>
              <h1 className="text-white text-6xl font-bold tracking-tight">Whozin</h1>
            </div>
            <div className="mt-8 text-center">
              <p className="text-[#52525b] text-xs uppercase tracking-widest mb-2">Stacked Lockup</p>
              <p className="text-[#71717A] text-sm">Secondary usage for compact spaces, social avatars</p>
            </div>
          </div>
        </div>

        {/* Implementation Specs */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Implementation Specifications</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="flex justify-center mb-5">
                  <div
                    className="w-20 h-20 rounded-[16px] flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)' }}
                  >
                    <WhozinW className="w-12 h-12 text-white" />
                  </div>
                </div>
                <p className="text-white font-bold mb-2 text-lg">Icon Only</p>
                <p className="text-[#71717A] text-sm mb-4">Minimum: 64×64px</p>
                <div className="space-y-1 text-left bg-[#18181B] rounded-xl p-4">
                  <p className="text-[#A1A1AA] text-xs"><span className="text-[#71717A]">Clear space:</span> 12px</p>
                  <p className="text-[#A1A1AA] text-xs"><span className="text-[#71717A]">Corner radius:</span> 22%</p>
                  <p className="text-[#A1A1AA] text-xs"><span className="text-[#71717A]">Use for:</span> Favicon, avatar</p>
                </div>
              </div>
              <div className="text-center">
                <div className="flex justify-center items-center mb-5 gap-2">
                  <div
                    className="w-14 h-14 rounded-[14px] flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)' }}
                  >
                    <WhozinW className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-white text-3xl font-bold">Whozin</span>
                </div>
                <p className="text-white font-bold mb-2 text-lg">Horizontal</p>
                <p className="text-[#71717A] text-sm mb-4">Minimum: 160px wide</p>
                <div className="space-y-1 text-left bg-[#18181B] rounded-xl p-4">
                  <p className="text-[#A1A1AA] text-xs"><span className="text-[#71717A]">Clear space:</span> 16px</p>
                  <p className="text-[#A1A1AA] text-xs"><span className="text-[#71717A]">Ratio:</span> Maintain proportions</p>
                  <p className="text-[#A1A1AA] text-xs"><span className="text-[#71717A]">Use for:</span> Nav, headers, splash</p>
                </div>
              </div>
              <div className="text-center">
                <div className="flex flex-col items-center mb-5 gap-2">
                  <div
                    className="w-14 h-14 rounded-[14px] flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)' }}
                  >
                    <WhozinW className="w-8 h-8 text-white" />
                  </div>
                  <span className="text-white text-xl font-bold">Whozin</span>
                </div>
                <p className="text-white font-bold mb-2 text-lg">Stacked</p>
                <p className="text-[#71717A] text-sm mb-4">Minimum: 100px wide</p>
                <div className="space-y-1 text-left bg-[#18181B] rounded-xl p-4">
                  <p className="text-[#A1A1AA] text-xs"><span className="text-[#71717A]">Clear space:</span> 14px</p>
                  <p className="text-[#A1A1AA] text-xs"><span className="text-[#71717A]">Ratio:</span> Maintain proportions</p>
                  <p className="text-[#A1A1AA] text-xs"><span className="text-[#71717A]">Use for:</span> Compact spaces</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Incorrect Usage */}
        <div>
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Incorrect Usage</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Don't rotate", rotation: 'rotate-12' },
              { label: "Don't distort", skew: 'skew-x-12' },
              { label: "Don't change gradient", gradient: 'linear-gradient(135deg, #3B82F6, #10B981)' },
              { label: "Don't add effects", border: 'border-4 border-white' },
            ].map((item, i) => (
              <div key={i} className="bg-[#09090B] border border-[#27272A] rounded-2xl p-6 text-center">
                <div className="flex justify-center mb-4 opacity-30">
                  <div
                    className={`w-20 h-20 rounded-[16px] flex items-center justify-center ${
                      item.rotation || item.skew || item.border || ''
                    }`}
                    style={{
                      background: item.gradient || 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)'
                    }}
                  >
                    <WhozinW className="w-12 h-12 text-white" />
                  </div>
                </div>
                <p className="text-[#71717A] text-sm">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}