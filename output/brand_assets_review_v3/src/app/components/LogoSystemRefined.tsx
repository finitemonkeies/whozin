export function LogoSystemRefined() {
  // Refined W SVG component with distinctive design
  const RefinedW = ({ className }: { className?: string }) => (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="currentColor"
    >
      <path d="M20 25 L35 25 L48 80 L60 25 L75 25 L87 80 L100 25 L115 25 L98 100 L82 100 L67.5 45 L53 100 L37 100 Z" 
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
            A custom W glyph with distinctive geometric character. Rounded-square gradient tile. Bold, premium, nightlife signal.
          </p>
        </div>

        {/* Primary Mark - Larger showcase */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Primary Mark</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-20 flex justify-center relative overflow-hidden">
            {/* Subtle ambient glow behind icon */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[100px] opacity-30"
              style={{ background: 'radial-gradient(circle, #DB2777 0%, #9333EA 70%)' }}
            />
            <div
              className="relative w-72 h-72 rounded-[64px] flex items-center justify-center shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                boxShadow: '0 40px 80px rgba(219, 39, 119, 0.5), 0 0 140px rgba(147, 51, 234, 0.3)'
              }}
            >
              <RefinedW className="w-44 h-44 text-white" />
            </div>
          </div>
          <p className="text-[#71717A] text-sm text-center mt-6 italic">
            The W features angled terminals and geometric precision for a more ownable, memorable glyph.
          </p>
        </div>

        {/* Icon Variations */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Icon Variations</p>
          <div className="grid grid-cols-3 gap-8">
            {/* Gradient */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8 text-center">
              <div className="flex justify-center mb-6">
                <div
                  className="w-32 h-32 rounded-[28px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 24px 48px rgba(219, 39, 119, 0.4)'
                  }}
                >
                  <RefinedW className="w-20 h-20 text-white" />
                </div>
              </div>
              <p className="text-white font-bold mb-1">Gradient</p>
              <p className="text-[#71717A] text-sm">Primary usage</p>
            </div>

            {/* White on Dark */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 bg-[#18181B] rounded-[28px] flex items-center justify-center">
                  <RefinedW className="w-20 h-20 text-white" />
                </div>
              </div>
              <p className="text-white font-bold mb-1">Monochrome Light</p>
              <p className="text-[#71717A] text-sm">Dark backgrounds</p>
            </div>

            {/* Dark on Light */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 bg-white rounded-[28px] flex items-center justify-center">
                  <RefinedW className="w-20 h-20 text-[#09090B]" />
                </div>
              </div>
              <p className="text-white font-bold mb-1">Monochrome Dark</p>
              <p className="text-[#71717A] text-sm">Light backgrounds</p>
            </div>
          </div>
        </div>

        {/* Lockups */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Lockups</p>
          
          {/* Horizontal */}
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12 mb-6">
            <div className="flex items-center gap-6 justify-center">
              <div
                className="w-24 h-24 rounded-[20px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
              >
                <RefinedW className="w-16 h-16 text-white" />
              </div>
              <h1 className="text-white text-7xl font-bold tracking-tight">Whozin</h1>
            </div>
            <p className="text-[#71717A] text-xs text-center mt-6 uppercase tracking-widest">Horizontal Lockup</p>
          </div>

          {/* Stacked */}
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12">
            <div className="flex flex-col items-center gap-6">
              <div
                className="w-32 h-32 rounded-[24px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
              >
                <RefinedW className="w-20 h-20 text-white" />
              </div>
              <h1 className="text-white text-5xl font-bold tracking-tight">Whozin</h1>
            </div>
            <p className="text-[#71717A] text-xs text-center mt-6 uppercase tracking-widest">Stacked Lockup</p>
          </div>
        </div>

        {/* Clear Space & Minimum Sizes */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Clear Space & Minimum Sizes</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div
                    className="w-16 h-16 rounded-[14px] flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                  >
                    <RefinedW className="w-10 h-10 text-white" />
                  </div>
                </div>
                <p className="text-white font-bold mb-1">Icon Only</p>
                <p className="text-[#71717A] text-sm">64×64px minimum</p>
                <p className="text-[#52525b] text-xs mt-2">Clear space: 12px all sides</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center items-center mb-4 gap-2">
                  <div
                    className="w-12 h-12 rounded-[12px] flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                  >
                    <RefinedW className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white text-2xl font-bold">Whozin</span>
                </div>
                <p className="text-white font-bold mb-1">Horizontal</p>
                <p className="text-[#71717A] text-sm">140px wide minimum</p>
                <p className="text-[#52525b] text-xs mt-2">Clear space: 16px all sides</p>
              </div>
              <div className="text-center">
                <div className="flex flex-col items-center mb-4 gap-1">
                  <div
                    className="w-12 h-12 rounded-[12px] flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                  >
                    <RefinedW className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-white text-lg font-bold">Whozin</span>
                </div>
                <p className="text-white font-bold mb-1">Stacked</p>
                <p className="text-[#71717A] text-sm">90px wide minimum</p>
                <p className="text-[#52525b] text-xs mt-2">Clear space: 14px all sides</p>
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
              { label: "Don't change colors", gradient: 'bg-[#3B82F6]' },
              { label: "Don't add outlines", border: 'border-4 border-white' },
            ].map((item, i) => (
              <div key={i} className="bg-[#09090B] border border-[#27272A] rounded-2xl p-6 text-center">
                <div className="flex justify-center mb-4 opacity-30">
                  <div
                    className={`w-16 h-16 rounded-[14px] flex items-center justify-center ${
                      item.rotation || item.skew || item.border || ''
                    }`}
                    style={{
                      background: item.gradient || 'linear-gradient(135deg, #EC4899, #9333EA)'
                    }}
                  >
                    <RefinedW className="w-10 h-10 text-white" />
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