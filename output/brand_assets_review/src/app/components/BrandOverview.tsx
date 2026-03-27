export function BrandOverview() {
  return (
    <div className="w-full min-h-screen bg-[#09090B] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-white text-5xl font-bold mb-4 tracking-tight">Whozin</h1>
          <p className="text-white text-xl mb-2">See who's going before you go.</p>
          <p className="text-[#A1A1AA] text-lg">The private social layer for nights out and live events.</p>
        </div>

        {/* Brand Essence */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          <div className="bg-[#18181B] rounded-3xl p-8 border border-[#27272A]">
            <h2 className="text-white text-2xl font-bold mb-6">Brand Feeling</h2>
            <div className="flex flex-wrap gap-2">
              {[
                'dark', 'immersive', 'nightlife-native', 'private by default',
                'high-signal', 'selective', 'social-first', 'premium',
                'modern', 'energetic without chaos'
              ].map((tag) => (
                <span
                  key={tag}
                  className="px-4 py-2 bg-[#27272A] text-[#A1A1AA] rounded-full text-sm tracking-wide"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-[#18181B] rounded-3xl p-8 border border-[#27272A]">
            <h2 className="text-white text-2xl font-bold mb-6">What We Communicate</h2>
            <ul className="space-y-3">
              {[
                'Social proof first',
                'Private confidence',
                'Late-night energy',
                'Fast decisions',
                'Premium but accessible',
                'Not a generic event marketplace'
              ].map((item) => (
                <li key={item} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-[#DB2777] to-[#9333EA]" />
                  <span className="text-[#A1A1AA]">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Color Palette */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'Black', color: '#000000', text: 'white' },
              { name: 'Canvas', color: '#09090B', text: 'white' },
              { name: 'Surface', color: '#18181B', text: 'white' },
              { name: 'Elevated', color: '#27272A', text: 'white' },
              { name: 'Primary Text', color: '#FFFFFF', text: 'black' },
              { name: 'Secondary Text', color: '#A1A1AA', text: 'black' },
              { name: 'Muted Text', color: '#71717A', text: 'white' },
              { name: 'Hot Pink', color: '#DB2777', text: 'white' },
              { name: 'Electric Purple', color: '#9333EA', text: 'white' },
              { name: 'Signal Blue', color: '#3B82F6', text: 'white' },
              { name: 'Violet', color: '#A855F7', text: 'white' },
              { name: 'Success Green', color: '#22C55E', text: 'black' },
              { name: 'Rose', color: '#F43F5E', text: 'white' },
              { name: 'Orange', color: '#F97316', text: 'white' },
            ].map(({ name, color, text }) => (
              <div key={name} className="rounded-2xl overflow-hidden border border-[#27272A]">
                <div className="h-32" style={{ backgroundColor: color }} />
                <div className="bg-[#18181B] p-4">
                  <p className="text-white text-sm font-bold mb-1">{name}</p>
                  <p className="text-[#71717A] text-xs font-mono">{color}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gradients */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">Primary Gradients</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl overflow-hidden border border-[#27272A]">
              <div
                className="h-32"
                style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
              />
              <div className="bg-[#18181B] p-4">
                <p className="text-white text-sm font-bold mb-1">Brand CTA Gradient</p>
                <p className="text-[#71717A] text-xs font-mono">
                  linear-gradient(to right, #DB2777, #9333EA)
                </p>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden border border-[#27272A]">
              <div
                className="h-32"
                style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
              />
              <div className="bg-[#18181B] p-4">
                <p className="text-white text-sm font-bold mb-1">Icon Gradient</p>
                <p className="text-[#71717A] text-xs font-mono">
                  linear-gradient(135deg, #EC4899, #9333EA)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Visual Language */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-[#18181B] rounded-3xl p-8 border border-[#27272A]">
            <h2 className="text-white text-2xl font-bold mb-6">Shape Language</h2>
            <ul className="space-y-2 text-[#A1A1AA]">
              <li>• Rounded square geometry</li>
              <li>• Premium, not cute</li>
              <li>• Generous corner radius</li>
              <li>• Soft but structured</li>
              <li>• Glassmorphism and smoked acrylic surfaces</li>
              <li>• Subtle translucent borders</li>
              <li>• Ambient glow and blur behind elements</li>
            </ul>
          </div>

          <div className="bg-[#18181B] rounded-3xl p-8 border border-[#27272A]">
            <h2 className="text-white text-2xl font-bold mb-6">Typography</h2>
            <ul className="space-y-2 text-[#A1A1AA]">
              <li>• Bold, compact sans-serif headlines</li>
              <li>• Clean, neutral sans-serif UI text</li>
              <li>• Tight tracking for headlines</li>
              <li>• Wide tracking for micro-labels, pills, and status tags</li>
              <li>• Tone is confident, warm, short, and in-the-know</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
