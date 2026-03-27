export function Cover() {
  // Final refined W component - used consistently everywhere
  const WhozinW = ({ className }: { className?: string }) => (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="currentColor"
    >
      {/* Refined W with distinctive angled cuts and premium geometric character */}
      <path d="M18 22 L38 22 L50 82 L62 22 L82 22 L94 82 L106 22 L126 22 L109 103 L89 103 L71 38 L53 103 L33 103 Z" 
        strokeLinejoin="miter" 
        strokeLinecap="square"
      />
    </svg>
  );

  return (
    <div className="w-full h-screen bg-[#000000] relative overflow-hidden flex items-center">
      {/* Layered ambient glows - asymmetric and atmospheric */}
      <div
        className="absolute top-[15%] right-[30%] w-[800px] h-[800px] rounded-full blur-[180px] opacity-25"
        style={{ background: 'radial-gradient(circle, #DB2777 0%, #9333EA 60%, transparent 100%)' }}
      />
      <div
        className="absolute bottom-[20%] left-[25%] w-[600px] h-[600px] rounded-full blur-[160px] opacity-20"
        style={{ background: 'radial-gradient(circle, #A855F7 0%, #EC4899 50%, transparent 100%)' }}
      />
      
      {/* Content - bold asymmetric layout */}
      <div className="relative z-10 max-w-[1600px] mx-auto px-20 w-full">
        <div className="grid grid-cols-5 gap-20 items-center">
          {/* Left - Identity (2 columns) */}
          <div className="col-span-2">
            {/* Canonical app icon */}
            <div
              className="w-48 h-48 rounded-[36px] flex items-center justify-center mb-12 shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)',
                boxShadow: '0 40px 80px rgba(219, 39, 119, 0.6), 0 0 160px rgba(147, 51, 234, 0.4)'
              }}
            >
              <WhozinW className="w-28 h-28 text-white" />
            </div>

            {/* Wordmark with maximum impact */}
            <h1 className="text-white text-[140px] font-bold tracking-[-0.04em] leading-[0.85] mb-8">
              Whozin
            </h1>
            
            {/* Meta badge */}
            <div className="inline-flex px-7 py-3.5 bg-[#18181B]/70 backdrop-blur-xl border border-[#27272A] rounded-full">
              <span className="text-[#71717A] text-sm tracking-widest uppercase font-medium">Brand System — 2026</span>
            </div>
          </div>

          {/* Right - Product story (3 columns) */}
          <div className="col-span-3">
            <div className="space-y-10">
              {/* Lead with the core product promise */}
              <div>
                <h2 className="text-white text-8xl font-bold tracking-[-0.02em] leading-[0.9] mb-8">
                  See who's going<br />before you go.
                </h2>
                <p className="text-[#A1A1AA] text-4xl leading-relaxed font-medium tracking-tight">
                  Private, social, nightlife-native.
                </p>
              </div>

              {/* Show the mechanic - elevated design, no emojis */}
              <div className="bg-gradient-to-br from-[#18181B]/80 to-[#09090B]/90 backdrop-blur-xl border border-[#27272A] rounded-3xl p-10 max-w-2xl">
                <div className="flex items-center gap-5 mb-4">
                  {/* Avatar stack - premium gradient treatment */}
                  <div className="flex -space-x-4">
                    {[
                      { letter: 'S', gradient: '120deg, #EC4899, #A855F7' },
                      { letter: 'M', gradient: '135deg, #DB2777, #9333EA' },
                      { letter: 'A', gradient: '150deg, #EC4899, #8B5CF6' },
                      { letter: 'J', gradient: '165deg, #A855F7, #9333EA' },
                    ].map((item, i) => (
                      <div
                        key={i}
                        className="w-14 h-14 rounded-full border-3 border-[#09090B] flex items-center justify-center text-base font-bold shadow-lg"
                        style={{
                          background: `linear-gradient(${item.gradient})`
                        }}
                      >
                        <span className="text-white">{item.letter}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-white text-2xl font-bold mb-1">12 friends are going</p>
                    <p className="text-[#71717A] text-base">to Subtronics tonight</p>
                  </div>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-[#27272A] to-transparent my-5" />
                <p className="text-[#A1A1AA] text-lg leading-relaxed">
                  Your crew is here. The night is forming. This is the move.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle grain texture overlay */}
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")'
        }}
      />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#000000] to-transparent pointer-events-none" />
    </div>
  );
}