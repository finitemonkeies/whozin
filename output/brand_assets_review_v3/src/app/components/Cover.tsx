export function Cover() {
  return (
    <div className="w-full h-screen bg-[#000000] relative overflow-hidden flex items-center">
      {/* Layered ambient glows - more asymmetric and atmospheric */}
      <div
        className="absolute top-1/4 right-1/3 w-[700px] h-[700px] rounded-full blur-[160px] opacity-20"
        style={{ background: 'radial-gradient(circle, #DB2777 0%, #9333EA 60%, transparent 100%)' }}
      />
      <div
        className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[140px] opacity-15"
        style={{ background: 'radial-gradient(circle, #A855F7 0%, transparent 70%)' }}
      />
      
      {/* Content - asymmetric layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-16 w-full">
        <div className="grid grid-cols-2 gap-24 items-center">
          {/* Left - Logo and identity */}
          <div>
            {/* Icon with more distinctive presence */}
            <div
              className="w-40 h-40 rounded-[32px] flex items-center justify-center mb-8 shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                boxShadow: '0 32px 64px rgba(219, 39, 119, 0.5), 0 0 120px rgba(147, 51, 234, 0.3)'
              }}
            >
              {/* Refined W with distinctive cut/angle */}
              <svg
                viewBox="0 0 120 120"
                className="w-24 h-24"
                fill="white"
              >
                {/* More distinctive W with angled cuts and premium feel */}
                <path d="M20 25 L35 25 L48 80 L60 25 L75 25 L87 80 L100 25 L115 25 L98 100 L82 100 L67.5 45 L53 100 L37 100 Z" 
                  strokeLinejoin="miter" 
                  strokeLinecap="square"
                />
              </svg>
            </div>

            {/* Wordmark with stronger hierarchy */}
            <h1 className="text-white text-[120px] font-bold tracking-tighter leading-none mb-6">
              Whozin
            </h1>
            
            {/* Date badge */}
            <div className="inline-flex px-6 py-3 bg-[#18181B]/60 backdrop-blur-md border border-[#27272A] rounded-full">
              <span className="text-[#71717A] text-sm tracking-wider uppercase">Brand Book — 2026</span>
            </div>
          </div>

          {/* Right - Hero message with product specificity */}
          <div>
            <div className="space-y-8">
              {/* Lead with product-native language, not generic tagline */}
              <div>
                <h2 className="text-white text-7xl font-bold tracking-tight leading-[0.95] mb-6">
                  See who's going<br />before you go.
                </h2>
                <p className="text-[#A1A1AA] text-3xl leading-relaxed">
                  Private, social, nightlife-native.
                </p>
              </div>

              {/* Social proof example - show the mechanic */}
              <div className="bg-[#09090B]/60 backdrop-blur-sm border border-[#18181B] rounded-2xl p-8">
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex -space-x-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full border-2 border-[#09090B] flex items-center justify-center text-sm font-bold"
                        style={{
                          background: `linear-gradient(${120 + i * 40}deg, #EC4899, #9333EA)`
                        }}
                      >
                        <span className="text-white opacity-90">
                          {['S', 'M', 'A', 'J'][i - 1]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <span className="text-white text-lg font-bold">4 friends are going</span>
                </div>
                <p className="text-[#71717A] text-sm">Your crew is going to Subtronics tonight.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle grain texture overlay */}
      <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")'
        }}
      />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#000000] to-transparent pointer-events-none" />
    </div>
  );
}