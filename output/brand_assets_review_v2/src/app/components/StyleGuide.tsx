export function StyleGuide() {
  return (
    <div className="w-full min-h-screen bg-[#09090B] p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-white text-5xl font-bold mb-4 tracking-tight">Brand Toolkit</h1>
        <p className="text-[#A1A1AA] text-lg mb-16">
          Badges, background treatments, and UI elements
        </p>

        {/* Brand Badges & Pills */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">Brand Badges & Pills</h2>
          <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A]">
            <div className="space-y-8">
              {/* Private by Default badge */}
              <div>
                <p className="text-[#71717A] text-sm mb-4 uppercase tracking-wide">Status Pill</p>
                <div className="flex flex-wrap gap-4">
                  <div className="px-6 py-3 bg-[#27272A] border border-[#3f3f46] rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#22C55E]" />
                    <span className="text-[#A1A1AA] tracking-wide uppercase text-sm font-medium">
                      Private by Default
                    </span>
                  </div>
                  <div className="px-6 py-3 bg-[#27272A]/60 backdrop-blur-sm border border-[#3f3f46] rounded-full">
                    <span className="text-[#71717A] tracking-wide uppercase text-sm font-medium">
                      Invite Only
                    </span>
                  </div>
                  <div className="px-6 py-3 bg-[#27272A] border border-[#3f3f46] rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                    <span className="text-[#A1A1AA] tracking-wide uppercase text-sm font-medium">
                      Live Now
                    </span>
                  </div>
                </div>
              </div>

              {/* The Move badge */}
              <div>
                <p className="text-[#71717A] text-sm mb-4 uppercase tracking-wide">Premium Badge</p>
                <div className="flex flex-wrap gap-4">
                  <div
                    className="px-6 py-3 rounded-full border"
                    style={{
                      background: 'linear-gradient(to right, #DB2777, #9333EA)',
                      borderColor: 'transparent'
                    }}
                  >
                    <span className="text-white tracking-wide uppercase text-sm font-bold">
                      The Move
                    </span>
                  </div>
                  <div
                    className="px-6 py-3 rounded-full backdrop-blur-sm border"
                    style={{
                      background: 'linear-gradient(to right, rgba(219, 39, 119, 0.2), rgba(147, 51, 234, 0.2))',
                      borderColor: '#DB2777'
                    }}
                  >
                    <span className="text-white tracking-wide uppercase text-sm font-bold">
                      The Move
                    </span>
                  </div>
                </div>
              </div>

              {/* Social proof chips */}
              <div>
                <p className="text-[#71717A] text-sm mb-4 uppercase tracking-wide">Social Proof Chips</p>
                <div className="flex flex-wrap gap-3">
                  <div className="px-4 py-2 bg-[#27272A] border border-[#3f3f46] rounded-full">
                    <span className="text-[#A1A1AA] text-sm">12 friends going</span>
                  </div>
                  <div className="px-4 py-2 bg-[#27272A] border border-[#3f3f46] rounded-full">
                    <span className="text-[#A1A1AA] text-sm">Your crew is here</span>
                  </div>
                  <div className="px-4 py-2 bg-[#DB2777]/10 border border-[#DB2777]/30 rounded-full">
                    <span className="text-[#DB2777] text-sm font-medium">Trending tonight</span>
                  </div>
                  <div className="px-4 py-2 bg-[#9333EA]/10 border border-[#9333EA]/30 rounded-full">
                    <span className="text-[#A855F7] text-sm font-medium">Sold out</span>
                  </div>
                </div>
              </div>

              {/* Micro labels */}
              <div>
                <p className="text-[#71717A] text-sm mb-4 uppercase tracking-wide">Micro Labels</p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-lg text-[#71717A] text-xs tracking-widest uppercase">
                    Club
                  </span>
                  <span className="px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-lg text-[#71717A] text-xs tracking-widest uppercase">
                    Concert
                  </span>
                  <span className="px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-lg text-[#71717A] text-xs tracking-widest uppercase">
                    Festival
                  </span>
                  <span className="px-3 py-1.5 bg-[#18181B] border border-[#27272A] rounded-lg text-[#71717A] text-xs tracking-widest uppercase">
                    Afterparty
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Background Treatments */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">Background Treatments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gradient Glow */}
            <div className="rounded-3xl overflow-hidden border border-[#27272A]">
              <div
                className="h-64 relative"
                style={{ background: '#09090B' }}
              >
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[100px] opacity-50"
                  style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                />
                <div className="relative z-10 h-full flex items-center justify-center">
                  <p className="text-white text-xl font-bold">Gradient Glow</p>
                </div>
              </div>
              <div className="bg-[#18181B] p-4">
                <p className="text-[#71717A] text-xs">Ambient glow with blur-[100px]</p>
              </div>
            </div>

            {/* Dual Glow */}
            <div className="rounded-3xl overflow-hidden border border-[#27272A]">
              <div
                className="h-64 relative"
                style={{ background: '#09090B' }}
              >
                <div
                  className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-40"
                  style={{ background: '#EC4899' }}
                />
                <div
                  className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-[80px] opacity-40"
                  style={{ background: '#9333EA' }}
                />
                <div className="relative z-10 h-full flex items-center justify-center">
                  <p className="text-white text-xl font-bold">Dual Glow</p>
                </div>
              </div>
              <div className="bg-[#18181B] p-4">
                <p className="text-[#71717A] text-xs">Corner ambient lighting</p>
              </div>
            </div>

            {/* Glassmorphism */}
            <div className="rounded-3xl overflow-hidden border border-[#27272A]">
              <div
                className="h-64 relative"
                style={{ background: 'linear-gradient(135deg, #09090B, #18181B)' }}
              >
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[60px] opacity-30"
                  style={{ background: '#9333EA' }}
                />
                <div className="relative z-10 h-full flex items-center justify-center p-8">
                  <div className="bg-[#18181B]/40 backdrop-blur-xl border border-[#27272A]/60 rounded-2xl p-6 w-full">
                    <p className="text-white text-xl font-bold">Glassmorphism</p>
                    <p className="text-[#A1A1AA] text-sm mt-2">Smoked acrylic surface</p>
                  </div>
                </div>
              </div>
              <div className="bg-[#18181B] p-4">
                <p className="text-[#71717A] text-xs">backdrop-blur-xl with opacity</p>
              </div>
            </div>

            {/* Gradient Overlay */}
            <div className="rounded-3xl overflow-hidden border border-[#27272A]">
              <div
                className="h-64 relative"
                style={{
                  background: 'linear-gradient(135deg, #000000 0%, #09090B 50%, #18181B 100%)'
                }}
              >
                <div className="relative z-10 h-full flex items-center justify-center">
                  <p className="text-white text-xl font-bold">Gradient Overlay</p>
                </div>
              </div>
              <div className="bg-[#18181B] p-4">
                <p className="text-[#71717A] text-xs">Subtle dark gradient progression</p>
              </div>
            </div>
          </div>
        </div>

        {/* UI Components */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">UI Components</h2>
          <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A]">
            <div className="space-y-8">
              {/* Buttons */}
              <div>
                <p className="text-[#71717A] text-sm mb-4 uppercase tracking-wide">Buttons</p>
                <div className="flex flex-wrap gap-4">
                  <button
                    className="px-8 py-3 rounded-full text-white font-bold"
                    style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                  >
                    Primary CTA
                  </button>
                  <button className="px-8 py-3 rounded-full text-white font-bold bg-[#27272A] border border-[#3f3f46] hover:bg-[#3f3f46] transition">
                    Secondary
                  </button>
                  <button className="px-8 py-3 rounded-full text-[#A1A1AA] font-bold hover:text-white transition">
                    Tertiary
                  </button>
                </div>
              </div>

              {/* Cards */}
              <div>
                <p className="text-[#71717A] text-sm mb-4 uppercase tracking-wide">Cards</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#27272A] rounded-2xl p-6 border border-[#3f3f46]">
                    <h3 className="text-white font-bold mb-2">Standard Card</h3>
                    <p className="text-[#A1A1AA] text-sm">Surface with border</p>
                  </div>
                  <div className="bg-[#27272A]/60 backdrop-blur-sm rounded-2xl p-6 border border-[#3f3f46]">
                    <h3 className="text-white font-bold mb-2">Glass Card</h3>
                    <p className="text-[#A1A1AA] text-sm">Translucent surface</p>
                  </div>
                  <div
                    className="rounded-2xl p-6 border relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(219, 39, 119, 0.1), rgba(147, 51, 234, 0.1))',
                      borderColor: '#DB2777'
                    }}
                  >
                    <h3 className="text-white font-bold mb-2">Accent Card</h3>
                    <p className="text-[#A1A1AA] text-sm">Gradient highlight</p>
                  </div>
                </div>
              </div>

              {/* Avatars with Social Proof */}
              <div>
                <p className="text-[#71717A] text-sm mb-4 uppercase tracking-wide">Avatar Stack</p>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-12 h-12 rounded-full border-2 border-[#18181B] flex items-center justify-center"
                        style={{
                          background: `linear-gradient(${135 + i * 30}deg, #EC4899, #9333EA)`
                        }}
                      >
                        <span className="text-white text-sm font-bold">+</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-white font-bold">12 friends going</p>
                    <p className="text-[#71717A] text-sm">Including Sarah, Mike, and 10 others</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Typography Samples */}
        <div>
          <h2 className="text-white text-2xl font-bold mb-8">Typography in Use</h2>
          <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A]">
            <div className="space-y-8">
              <div>
                <h1 className="text-white text-6xl font-bold tracking-tight mb-2">
                  Bold Headline
                </h1>
                <p className="text-[#71717A] text-xs font-mono">text-6xl font-bold tracking-tight</p>
              </div>
              <div>
                <h2 className="text-white text-4xl font-bold mb-2">
                  Subheadline Style
                </h2>
                <p className="text-[#71717A] text-xs font-mono">text-4xl font-bold</p>
              </div>
              <div>
                <p className="text-white text-xl mb-2">
                  Body text for descriptions and longer content passages.
                </p>
                <p className="text-[#71717A] text-xs font-mono">text-xl</p>
              </div>
              <div>
                <p className="text-[#A1A1AA] text-base mb-2">
                  Secondary text with reduced emphasis for supporting information.
                </p>
                <p className="text-[#71717A] text-xs font-mono">text-base text-[#A1A1AA]</p>
              </div>
              <div>
                <p className="text-[#71717A] text-sm tracking-widest uppercase mb-2">
                  MICRO LABEL UPPERCASE
                </p>
                <p className="text-[#71717A] text-xs font-mono">text-sm tracking-widest uppercase</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
