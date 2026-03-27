export function Cover() {
  // Final canonical W component - use everywhere
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
    <div className="w-full h-screen bg-[#000000] relative overflow-hidden">
      {/* Layered atmospheric glows - more dramatic and cinematic */}
      <div
        className="absolute top-[10%] right-[25%] w-[900px] h-[900px] rounded-full blur-[200px] opacity-30"
        style={{ background: 'radial-gradient(circle, #DB2777 0%, #9333EA 50%, transparent 100%)' }}
      />
      <div
        className="absolute bottom-[15%] left-[20%] w-[700px] h-[700px] rounded-full blur-[180px] opacity-25"
        style={{ background: 'radial-gradient(circle, #EC4899 0%, #A855F7 60%, transparent 100%)' }}
      />
      <div
        className="absolute top-[40%] left-[50%] w-[500px] h-[500px] rounded-full blur-[160px] opacity-15"
        style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 80%)' }}
      />
      
      {/* Content Grid - Maximum Impact */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-[1800px] mx-auto px-24 w-full">
          <div className="grid grid-cols-2 gap-32 items-center">
            
            {/* Left Column - Brand Identity */}
            <div>
              {/* Canonical App Icon - Hero Scale */}
              <div className="mb-16">
                <div
                  className="w-64 h-64 rounded-[48px] flex items-center justify-center shadow-2xl inline-flex"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)',
                    boxShadow: '0 50px 100px rgba(219, 39, 119, 0.7), 0 0 200px rgba(147, 51, 234, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <WhozinW className="w-40 h-40 text-white drop-shadow-2xl" />
                </div>
              </div>

              {/* Wordmark - Maximum Scale & Confidence */}
              <div className="mb-12">
                <h1 className="text-white text-[160px] font-bold tracking-[-0.05em] leading-[0.85] mb-4">
                  Whozin
                </h1>
              </div>
              
              {/* Meta Information */}
              <div className="flex items-center gap-4">
                <div className="inline-flex px-8 py-4 bg-[#18181B]/80 backdrop-blur-xl border border-[#27272A] rounded-full">
                  <span className="text-[#A1A1AA] text-base tracking-widest uppercase font-medium">Brand System</span>
                </div>
                <div className="inline-flex px-8 py-4 bg-[#18181B]/80 backdrop-blur-xl border border-[#27272A] rounded-full">
                  <span className="text-[#71717A] text-base tracking-widest uppercase font-medium">2026</span>
                </div>
              </div>
            </div>

            {/* Right Column - Product Story */}
            <div className="space-y-12">
              {/* Primary Message - Maximum Scale */}
              <div>
                <h2 className="text-white text-[100px] font-bold tracking-[-0.03em] leading-[0.88] mb-10">
                  See who's<br />going before<br />you go.
                </h2>
                <p className="text-[#A1A1AA] text-5xl leading-[1.3] font-medium tracking-tight">
                  Private, social,<br />nightlife-native.
                </p>
              </div>

              {/* Product Moment - Elevated Design */}
              <div className="max-w-2xl">
                <div 
                  className="bg-gradient-to-br from-[#18181B]/90 to-[#09090B]/95 backdrop-blur-2xl border border-[#27272A]/80 rounded-3xl p-12 shadow-2xl relative overflow-hidden"
                >
                  {/* Internal glow */}
                  <div
                    className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20 pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #DB2777 0%, transparent 70%)' }}
                  />
                  
                  <div className="relative z-10">
                    {/* Social Proof */}
                    <div className="flex items-center gap-6 mb-6">
                      <div className="flex -space-x-5">
                        {[
                          { letter: 'S', gradient: '120deg, #EC4899, #A855F7' },
                          { letter: 'M', gradient: '135deg, #DB2777, #9333EA' },
                          { letter: 'A', gradient: '150deg, #EC4899, #8B5CF6' },
                          { letter: 'J', gradient: '165deg, #A855F7, #9333EA' },
                        ].map((item, i) => (
                          <div
                            key={i}
                            className="w-16 h-16 rounded-full border-4 border-[#09090B] flex items-center justify-center text-lg font-bold shadow-xl"
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
                        <p className="text-[#A1A1AA] text-base">to Subtronics tonight</p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-[#3F3F46] to-transparent my-6" />

                    {/* Context */}
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-[#DB2777]/20 flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-[#DB2777]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-white text-lg font-bold mb-2">Your crew is here.</p>
                        <p className="text-[#A1A1AA] text-base leading-relaxed">
                          The night is forming. This is the move.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced grain texture */}
      <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\' /%3E%3C/svg%3E")'
        }}
      />

      {/* Cinematic vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.4) 100%)'
        }}
      />

      {/* Bottom atmospheric fade */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#000000] via-[#000000]/50 to-transparent pointer-events-none" />
    </div>
  );
}