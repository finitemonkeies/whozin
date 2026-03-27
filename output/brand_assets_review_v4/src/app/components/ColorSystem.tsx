export function ColorSystem() {
  return (
    <div className="w-full min-h-screen bg-[#000000] p-8">
      <div className="max-w-6xl mx-auto py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-white text-6xl font-bold tracking-tight mb-6">Color System</h1>
          <p className="text-[#A1A1AA] text-xl max-w-3xl">
            Dark surfaces with controlled bursts of signature pink, fuchsia, and violet. 
            Other colors are situational, not co-equal brand colors.
          </p>
        </div>

        {/* Signature Brand Colors */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-2 uppercase tracking-widest">Signature Brand Colors</p>
          <p className="text-[#52525b] text-sm mb-8 italic">These are the unmistakable Whozin colors</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { name: 'Hot Pink', hex: '#DB2777', usage: 'Primary brand accent, CTAs, energy' },
              { name: 'Electric Purple', hex: '#9333EA', usage: 'Primary brand accent, gradients' },
              { name: 'Violet', hex: '#A855F7', usage: 'Secondary accent, glows, premium badges' },
            ].map(({ name, hex, usage }) => (
              <div key={hex} className="bg-[#09090B] border border-[#18181B] rounded-3xl overflow-hidden">
                <div className="h-48" style={{ backgroundColor: hex }} />
                <div className="p-8">
                  <h3 className="text-white text-2xl font-bold mb-2">{name}</h3>
                  <p className="text-[#71717A] text-sm font-mono mb-4">{hex}</p>
                  <p className="text-[#A1A1AA] text-sm">{usage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Signature Gradients */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-2 uppercase tracking-widest">Signature Gradients</p>
          <p className="text-[#52525b] text-sm mb-8 italic">Use these for CTAs, icons, and premium moments</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#09090B] border border-[#18181B] rounded-3xl overflow-hidden">
              <div
                className="h-48"
                style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
              />
              <div className="p-8">
                <h3 className="text-white text-xl font-bold mb-2">Brand CTA Gradient</h3>
                <p className="text-[#71717A] text-xs font-mono mb-4">
                  linear-gradient(to right, #DB2777, #9333EA)
                </p>
                <p className="text-[#A1A1AA] text-sm">Primary buttons, "The Move" badges, hero CTAs</p>
              </div>
            </div>
            <div className="bg-[#09090B] border border-[#18181B] rounded-3xl overflow-hidden">
              <div
                className="h-48"
                style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
              />
              <div className="p-8">
                <h3 className="text-white text-xl font-bold mb-2">Icon Gradient</h3>
                <p className="text-[#71717A] text-xs font-mono mb-4">
                  linear-gradient(135deg, #EC4899, #9333EA)
                </p>
                <p className="text-[#A1A1AA] text-sm">App icon, logo mark, feature highlights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Surface Colors */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-2 uppercase tracking-widest">Surface Colors</p>
          <p className="text-[#52525b] text-sm mb-8 italic">Foundation: Black, ink, charcoal, graphite</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'True Black', hex: '#000000', usage: 'Canvas, backgrounds' },
              { name: 'Ink', hex: '#09090B', usage: 'Primary surface' },
              { name: 'Charcoal', hex: '#18181B', usage: 'Elevated surface' },
              { name: 'Graphite', hex: '#27272A', usage: 'Borders, cards' },
            ].map(({ name, hex, usage }) => (
              <div key={hex} className="bg-[#09090B] border border-[#18181B] rounded-2xl overflow-hidden">
                <div className="h-32" style={{ backgroundColor: hex }} />
                <div className="p-4">
                  <p className="text-white font-bold text-sm mb-1">{name}</p>
                  <p className="text-[#71717A] text-xs font-mono mb-2">{hex}</p>
                  <p className="text-[#71717A] text-xs">{usage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Text Hierarchy */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-2 uppercase tracking-widest">Text Hierarchy</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-10 space-y-6">
            <div className="flex items-center justify-between border-b border-[#18181B] pb-6">
              <span className="text-white text-2xl">Primary text</span>
              <div className="flex items-center gap-4">
                <div className="w-16 h-8 rounded" style={{ backgroundColor: '#FFFFFF' }} />
                <span className="text-[#71717A] text-sm font-mono">#FFFFFF</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-[#18181B] pb-6">
              <span className="text-[#A1A1AA] text-2xl">Secondary text</span>
              <div className="flex items-center gap-4">
                <div className="w-16 h-8 rounded" style={{ backgroundColor: '#A1A1AA' }} />
                <span className="text-[#71717A] text-sm font-mono">#A1A1AA</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-b border-[#18181B] pb-6">
              <span className="text-[#71717A] text-2xl">Muted text</span>
              <div className="flex items-center gap-4">
                <div className="w-16 h-8 rounded" style={{ backgroundColor: '#71717A' }} />
                <span className="text-[#71717A] text-sm font-mono">#71717A</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#52525b] text-2xl">Disabled text</span>
              <div className="flex items-center gap-4">
                <div className="w-16 h-8 rounded" style={{ backgroundColor: '#52525b' }} />
                <span className="text-[#71717A] text-sm font-mono">#52525B</span>
              </div>
            </div>
          </div>
        </div>

        {/* Situational Accent Colors */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-2 uppercase tracking-widest">Situational Accent Colors</p>
          <p className="text-[#52525b] text-sm mb-8 italic">Use sparingly for specific UI states, not as co-equal brand colors</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Signal Blue', hex: '#3B82F6', usage: 'Live indicators' },
              { name: 'Success Green', hex: '#22C55E', usage: 'Confirmations' },
              { name: 'Rose', hex: '#F43F5E', usage: 'Alerts' },
              { name: 'Orange', hex: '#F97316', usage: 'Trending' },
            ].map(({ name, hex, usage }) => (
              <div key={hex} className="bg-[#09090B] border border-[#18181B] rounded-2xl overflow-hidden">
                <div className="h-24" style={{ backgroundColor: hex }} />
                <div className="p-4">
                  <p className="text-white font-bold text-sm mb-1">{name}</p>
                  <p className="text-[#71717A] text-xs font-mono mb-2">{hex}</p>
                  <p className="text-[#71717A] text-xs">{usage}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Usage Ratios */}
        <div>
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Color Usage Ratios</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-10">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-bold">Dark surfaces</span>
                  <span className="text-[#A1A1AA]">~80%</span>
                </div>
                <div className="w-full h-3 bg-[#18181B] rounded-full overflow-hidden">
                  <div className="h-full bg-[#27272A]" style={{ width: '80%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-bold">Signature pink/purple</span>
                  <span className="text-[#A1A1AA]">~15%</span>
                </div>
                <div className="w-full h-3 bg-[#18181B] rounded-full overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: '15%',
                      background: 'linear-gradient(to right, #DB2777, #9333EA)'
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-bold">Situational accents</span>
                  <span className="text-[#A1A1AA]">~5%</span>
                </div>
                <div className="w-full h-3 bg-[#18181B] rounded-full overflow-hidden">
                  <div className="h-full bg-[#3B82F6]" style={{ width: '5%' }} />
                </div>
              </div>
            </div>
            <p className="text-[#71717A] text-sm mt-8 italic">
              The brand should feel predominantly dark with controlled, intentional bursts of signature color.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
