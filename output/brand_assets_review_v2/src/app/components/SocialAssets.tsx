export function SocialAssets() {
  return (
    <div className="w-full min-h-screen bg-[#000000] p-8">
      <div className="max-w-6xl mx-auto py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-white text-6xl font-bold tracking-tight mb-6">Social & Marketing</h1>
          <p className="text-[#A1A1AA] text-xl max-w-3xl">
            Real scenarios showing momentum, anticipation, and social proof.
          </p>
        </div>

        {/* Open Graph Card */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Open Graph / Twitter Card · 1200×630</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-8">
            <div
              className="w-full aspect-[1200/630] rounded-2xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #000000 0%, #09090B 50%, #0a0a0a 100%)'
              }}
            >
              {/* Controlled ambient glow */}
              <div
                className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px] opacity-25"
                style={{ background: 'radial-gradient(circle, #DB2777 0%, #9333EA 70%)' }}
              />

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between p-16">
                {/* Logo lockup */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-[14px] flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                  >
                    <svg viewBox="0 0 100 100" className="w-10 h-10" fill="white">
                      <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                    </svg>
                  </div>
                  <span className="text-white text-2xl font-bold">Whozin</span>
                </div>

                {/* Main message - product specific */}
                <div>
                  <h2 className="text-white text-6xl font-bold mb-4 tracking-tight leading-tight">
                    4 friends are going<br />to Subtronics.
                  </h2>
                  <p className="text-[#A1A1AA] text-2xl">
                    See who's going before you go.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instagram Story */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Instagram Story · 1080×1920</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-8 flex justify-center">
            <div
              className="w-[360px] h-[640px] rounded-3xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(180deg, #000000 0%, #09090B 60%, #0a0a0a 100%)'
              }}
            >
              {/* Controlled glow */}
              <div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full blur-[100px] opacity-30"
                style={{ background: 'radial-gradient(circle, #DB2777 0%, #9333EA 70%)' }}
              />

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between p-12">
                {/* Top */}
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-20 h-20 rounded-[18px] flex items-center justify-center shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                      boxShadow: '0 12px 24px rgba(219, 39, 119, 0.5)'
                    }}
                  >
                    <svg viewBox="0 0 100 100" className="w-12 h-12" fill="white">
                      <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                    </svg>
                  </div>
                </div>

                {/* Center content */}
                <div className="text-center">
                  <h2 className="text-white text-4xl font-bold mb-4 tracking-tight leading-tight">
                    Your crew is going<br />to Fred Again..
                  </h2>
                  <p className="text-[#A1A1AA] text-lg mb-8">
                    12 friends are going tonight.
                  </p>

                  {/* CTA */}
                  <div
                    className="inline-flex px-8 py-4 rounded-full text-white font-bold text-lg"
                    style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                  >
                    See who's going
                  </div>
                </div>

                {/* Bottom wordmark */}
                <div className="text-center">
                  <span className="text-white text-xl font-bold">Whozin</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Square Social Post */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Square Social Post · 1080×1080</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-8">
            <div
              className="w-full max-w-2xl mx-auto aspect-square rounded-3xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #000000 0%, #09090B 50%, #0a0a0a 100%)'
              }}
            >
              {/* Controlled glows */}
              <div
                className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full blur-[120px] opacity-25"
                style={{ background: 'radial-gradient(circle, #DB2777 0%, #9333EA 70%)' }}
              />

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center p-16 text-center">
                {/* Logo */}
                <div
                  className="w-28 h-28 rounded-[24px] flex items-center justify-center mb-8 shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 24px 48px rgba(219, 39, 119, 0.5)'
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-18 h-18" fill="white">
                    <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                  </svg>
                </div>

                {/* Message */}
                <h2 className="text-white text-6xl font-bold mb-6 tracking-tight leading-tight">
                  See who's going<br />before you go.
                </h2>

                {/* Social proof example */}
                <div className="mb-8">
                  <div className="flex justify-center -space-x-2 mb-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-12 h-12 rounded-full border-2 border-[#000000] flex items-center justify-center"
                        style={{
                          background: `linear-gradient(${120 + i * 40}deg, #DB2777, #9333EA)`
                        }}
                      >
                        <span className="text-white font-bold opacity-80">
                          {['S', 'M', 'A', 'J'][i - 1]}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[#A1A1AA] text-lg">
                    Your crew is going tonight
                  </p>
                </div>

                {/* Badge */}
                <div className="px-6 py-3 bg-[#18181B]/60 backdrop-blur-sm border border-[#27272A] rounded-full">
                  <span className="text-[#A1A1AA] text-sm tracking-wide uppercase">Private by Default</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* App Store Creative Direction */}
        <div>
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">App Store Feature Concept</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-3 gap-6">
                {/* Screenshot 1 - Social Proof */}
                <div className="bg-[#000000] rounded-2xl p-6 aspect-[9/16] flex flex-col justify-between">
                  <div>
                    <p className="text-[#71717A] text-xs mb-4 uppercase tracking-wide">Events</p>
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="bg-[#18181B] rounded-xl p-4">
                          <div className="h-16 bg-gradient-to-br from-[#DB2777]/20 to-[#9333EA]/20 rounded-lg mb-3" />
                          <div className="flex -space-x-2 mb-2">
                            {[1, 2, 3].map((j) => (
                              <div
                                key={j}
                                className="w-6 h-6 rounded-full border border-[#18181B]"
                                style={{ background: 'linear-gradient(135deg, #DB2777, #9333EA)' }}
                              />
                            ))}
                          </div>
                          <p className="text-white text-sm font-bold">4 friends going</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Screenshot 2 - The Move */}
                <div className="bg-[#000000] rounded-2xl p-6 aspect-[9/16] flex items-center justify-center">
                  <div className="text-center">
                    <div
                      className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                    >
                      <svg viewBox="0 0 100 100" className="w-10 h-10" fill="white">
                        <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                      </svg>
                    </div>
                    <div
                      className="inline-flex px-4 py-2 rounded-full mb-4"
                      style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                    >
                      <span className="text-white text-xs font-bold tracking-wide uppercase">The Move</span>
                    </div>
                    <h3 className="text-white text-xl font-bold mb-2">Your crew is<br />going tonight</h3>
                    <p className="text-[#A1A1AA] text-sm">12 friends are going</p>
                  </div>
                </div>

                {/* Screenshot 3 - Friend Activity */}
                <div className="bg-[#000000] rounded-2xl p-6 aspect-[9/16] flex flex-col justify-between">
                  <div>
                    <p className="text-[#71717A] text-xs mb-4 uppercase tracking-wide">Activity</p>
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ background: 'linear-gradient(135deg, #DB2777, #9333EA)' }}
                          >
                            {['S', 'M', 'A'][i - 1]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs"><span className="font-bold">Sarah</span> is going</p>
                            <p className="text-[#71717A] text-xs">2m ago</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center">
                <h3 className="text-white text-2xl font-bold mb-3">See who's going before you go.</h3>
                <p className="text-[#A1A1AA]">The private social layer for nights out.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
