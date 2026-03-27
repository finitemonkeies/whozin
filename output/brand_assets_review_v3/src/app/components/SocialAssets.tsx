export function SocialAssets() {
  return (
    <div className="w-full min-h-screen bg-[#000000] p-8">
      <div className="max-w-6xl mx-auto py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-white text-6xl font-bold tracking-tight mb-6">Social & Marketing</h1>
          <p className="text-[#A1A1AA] text-xl max-w-3xl">
            Show the product mechanic. Lead with momentum and social proof, not brand statements.
          </p>
        </div>

        {/* Open Graph Card - lead with product-specific copy */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Open Graph / Twitter Card · 1200×630</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-8">
            <div
              className="w-full aspect-[1200/630] rounded-2xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #000000 0%, #09090B 50%, #0a0a0a 100%)'
              }}
            >
              {/* Controlled ambient glow - asymmetric */}
              <div
                className="absolute top-1/4 right-1/3 w-[500px] h-[500px] rounded-full blur-[120px] opacity-25"
                style={{ background: 'radial-gradient(circle, #DB2777 0%, #9333EA 70%)' }}
              />

              {/* Content - asymmetric layout, not centered */}
              <div className="relative z-10 h-full flex items-end p-16">
                {/* Product-specific message, not generic tagline */}
                <div className="max-w-3xl">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-6">
                      {/* Avatar stack showing social proof */}
                      <div className="flex -space-x-3">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="w-12 h-12 rounded-full border-2 border-[#000000] flex items-center justify-center text-sm font-bold"
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
                      <span className="text-white font-bold text-lg">12 friends are going</span>
                    </div>
                    
                    <h2 className="text-white text-6xl font-bold mb-4 tracking-tight leading-tight">
                      Your crew is going<br />to Subtronics tonight.
                    </h2>
                  </div>

                  {/* Logo lockup small in corner */}
                  <div className="flex items-center gap-3 opacity-80">
                    <div
                      className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                    >
                      <svg viewBox="0 0 120 120" className="w-6 h-6" fill="white">
                        <path d="M20 25 L35 25 L48 80 L60 25 L75 25 L87 80 L100 25 L115 25 L98 100 L82 100 L67.5 45 L53 100 L37 100 Z" />
                      </svg>
                    </div>
                    <span className="text-white text-lg font-bold">Whozin</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instagram Story - more dynamic */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Instagram Story · 1080×1920</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-8 flex justify-center">
            <div
              className="w-[360px] h-[640px] rounded-3xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(180deg, #000000 0%, #09090B 60%, #0a0a0a 100%)'
              }}
            >
              {/* Controlled glow - not centered */}
              <div
                className="absolute top-1/4 right-1/4 w-80 h-80 rounded-full blur-[100px] opacity-30"
                style={{ background: 'radial-gradient(circle, #DB2777 0%, #9333EA 70%)' }}
              />

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col p-8">
                {/* Top - small branding */}
                <div className="flex items-center gap-2 mb-auto">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                  >
                    <svg viewBox="0 0 120 120" className="w-5 h-5" fill="white">
                      <path d="M20 25 L35 25 L48 80 L60 25 L75 25 L87 80 L100 25 L115 25 L98 100 L82 100 L67.5 45 L53 100 L37 100 Z" />
                    </svg>
                  </div>
                  <span className="text-white text-sm font-bold">Whozin</span>
                </div>

                {/* Center content - product story */}
                <div className="mb-auto">
                  {/* "The Move" badge */}
                  <div
                    className="inline-flex px-4 py-2 rounded-full mb-6"
                    style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                  >
                    <span className="text-white text-xs font-bold tracking-wide uppercase">The Move</span>
                  </div>

                  <h2 className="text-white text-4xl font-bold mb-4 tracking-tight leading-tight">
                    12 friends going<br />to Fred Again..
                  </h2>
                  
                  <p className="text-[#A1A1AA] text-lg mb-8">
                    Tonight at Bill Graham. Your crew arrives around 10pm.
                  </p>

                  {/* Avatar stack */}
                  <div className="flex -space-x-3 mb-8">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="w-11 h-11 rounded-full border-2 border-[#000000]"
                        style={{
                          background: `linear-gradient(${110 + i * 35}deg, #EC4899, #9333EA)`
                        }}
                      />
                    ))}
                  </div>

                  {/* CTA */}
                  <div
                    className="inline-flex px-8 py-4 rounded-full text-white font-bold text-lg"
                    style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                  >
                    I'm going
                  </div>
                </div>

                {/* Bottom - subtle */}
                <div className="text-center">
                  <p className="text-[#52525b] text-xs tracking-widest uppercase">Private by default</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Square Social Post - more art directed */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Square Social Post · 1080×1080</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-8">
            <div
              className="w-full max-w-2xl mx-auto aspect-square rounded-3xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #000000 0%, #09090B 50%, #0a0a0a 100%)'
              }}
            >
              {/* Layered glows - more atmospheric */}
              <div
                className="absolute top-1/3 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-25"
                style={{ background: 'radial-gradient(circle, #DB2777 0%, #9333EA 70%)' }}
              />
              <div
                className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full blur-[100px] opacity-20"
                style={{ background: 'radial-gradient(circle, #A855F7 0%, transparent 70%)' }}
              />

              {/* Content - not centered, more dynamic */}
              <div className="relative z-10 h-full flex flex-col justify-between p-16">
                {/* Top - logo */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-[16px] flex items-center justify-center shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                      boxShadow: '0 16px 32px rgba(219, 39, 119, 0.5)'
                    }}
                  >
                    <svg viewBox="0 0 120 120" className="w-9 h-9" fill="white">
                      <path d="M20 25 L35 25 L48 80 L60 25 L75 25 L87 80 L100 25 L115 25 L98 100 L82 100 L67.5 45 L53 100 L37 100 Z" />
                    </svg>
                  </div>
                  <span className="text-white text-xl font-bold">Whozin</span>
                </div>

                {/* Bottom - main message */}
                <div>
                  <h2 className="text-white text-6xl font-bold mb-6 tracking-tight leading-[0.95]">
                    Know before<br />you go.
                  </h2>

                  {/* Social proof visual */}
                  <div className="bg-[#09090B]/60 backdrop-blur-sm border border-[#18181B] rounded-2xl p-6 inline-flex items-center gap-4">
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-10 h-10 rounded-full border-2 border-[#09090B]"
                          style={{
                            background: `linear-gradient(${120 + i * 40}deg, #EC4899, #9333EA)`
                          }}
                        />
                      ))}
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">4 friends going tonight</p>
                      <p className="text-[#71717A] text-xs">See who's going before you go</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* App Store Creative Direction */}
        <div>
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">App Store Feature Concept</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12">
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-3 gap-8 mb-10">
                {/* Screenshot 1 - Social Proof Feed */}
                <div className="bg-[#000000] rounded-3xl p-6 aspect-[9/19.5] flex flex-col justify-between shadow-xl border border-[#18181B]">
                  <div>
                    <p className="text-[#71717A] text-xs mb-5 uppercase tracking-wide">Tonight</p>
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="bg-[#18181B] rounded-xl p-4 border border-[#27272A]">
                          <div className="h-20 bg-gradient-to-br from-[#DB2777]/20 to-[#9333EA]/20 rounded-lg mb-3 relative">
                            <div className="absolute top-2 right-2 px-2 py-1 bg-[#000000]/60 backdrop-blur-sm rounded-full">
                              <span className="text-[#71717A] text-[10px] tracking-wide uppercase">10pm</span>
                            </div>
                          </div>
                          <div className="flex -space-x-2 mb-2">
                            {[1, 2, 3, 4].map((j) => (
                              <div
                                key={j}
                                className="w-6 h-6 rounded-full border-2 border-[#18181B]"
                                style={{ background: 'linear-gradient(135deg, #DB2777, #9333EA)' }}
                              />
                            ))}
                          </div>
                          <p className="text-white text-xs font-bold">{i === 1 ? '12 friends' : '6 friends'} going</p>
                          <p className="text-[#71717A] text-[10px] mt-1">{i === 1 ? 'Subtronics · Midway' : 'Fred Again.. · Bill Graham'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Screenshot 2 - The Move */}
                <div className="bg-[#000000] rounded-3xl p-6 aspect-[9/19.5] flex items-center justify-center shadow-xl border border-[#DB2777]/20 relative overflow-hidden">
                  <div
                    className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-30"
                    style={{ background: '#DB2777' }}
                  />
                  <div className="text-center relative z-10">
                    <div
                      className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-5 shadow-xl"
                      style={{
                        background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                        boxShadow: '0 12px 24px rgba(219, 39, 119, 0.5)'
                      }}
                    >
                      <svg viewBox="0 0 120 120" className="w-10 h-10" fill="white">
                        <path d="M20 25 L35 25 L48 80 L60 25 L75 25 L87 80 L100 25 L115 25 L98 100 L82 100 L67.5 45 L53 100 L37 100 Z" />
                      </svg>
                    </div>
                    <div
                      className="inline-flex px-4 py-1.5 rounded-full mb-5"
                      style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                    >
                      <span className="text-white text-xs font-bold tracking-wide uppercase">The Move</span>
                    </div>
                    <h3 className="text-white text-xl font-bold mb-3 leading-tight px-4">
                      Your crew is<br />going tonight
                    </h3>
                    <p className="text-[#A1A1AA] text-xs px-4">12 friends at Subtronics</p>
                  </div>
                </div>

                {/* Screenshot 3 - Activity */}
                <div className="bg-[#000000] rounded-3xl p-6 aspect-[9/19.5] flex flex-col justify-between shadow-xl border border-[#18181B]">
                  <div>
                    <p className="text-[#71717A] text-xs mb-5 uppercase tracking-wide">Your crew</p>
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: `linear-gradient(${130 + i * 35}deg, #DB2777, #9333EA)` }}
                          >
                            {['S', 'M', 'A', 'J'][i - 1]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs">
                              <span className="font-bold">{['Sarah', 'Mike', 'Alex', 'Jordan'][i - 1]}</span>
                              <span className="text-[#71717A]"> is going</span>
                            </p>
                            <p className="text-[#52525b] text-[10px]">{i === 1 ? '2m ago' : `${i * 15}m ago`}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Caption - product focused */}
              <div className="text-center max-w-2xl mx-auto">
                <h3 className="text-white text-3xl font-bold mb-3 tracking-tight">
                  See who's going before you go
                </h3>
                <p className="text-[#A1A1AA] text-lg">
                  Know where your people are. Private, social, nightlife-native.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}