export function SocialCards() {
  return (
    <div className="w-full min-h-screen bg-[#09090B] p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-white text-5xl font-bold mb-4 tracking-tight">Social Share System</h1>
        <p className="text-[#A1A1AA] text-lg mb-16">
          Templates for Open Graph, Instagram, and social announcements
        </p>

        {/* Open Graph / Twitter Card */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">Open Graph / Twitter Card</h2>
          <div className="bg-[#18181B] rounded-3xl p-8 border border-[#27272A]">
            <div
              className="w-full aspect-[1200/630] rounded-2xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #000000 0%, #18181B 50%, #27272A 100%)'
              }}
            >
              {/* Ambient glow effects */}
              <div
                className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-40"
                style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
              />
              <div
                className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-[100px] opacity-30"
                style={{ background: '#9333EA' }}
              />

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between p-16">
                {/* Logo */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-20 h-20 rounded-[16px] flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                  >
                    <svg
                      viewBox="0 0 100 100"
                      className="w-12 h-12"
                      fill="white"
                    >
                      <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                    </svg>
                  </div>
                  <span className="text-white text-3xl font-bold">Whozin</span>
                </div>

                {/* Main Message */}
                <div>
                  <h2 className="text-white text-6xl font-bold mb-6 tracking-tight leading-tight">
                    See who's going<br />before you go.
                  </h2>
                  <p className="text-[#A1A1AA] text-2xl">
                    The private social layer for nights out.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-[#71717A] text-sm mt-4">1200×630 • Open Graph / Twitter Card</p>
          </div>
        </div>

        {/* Instagram Story */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">Instagram Story Frame</h2>
          <div className="bg-[#18181B] rounded-3xl p-8 border border-[#27272A] flex justify-center">
            <div className="relative">
              <div
                className="w-[340px] h-[604px] rounded-3xl overflow-hidden relative"
                style={{
                  background: 'linear-gradient(180deg, #000000 0%, #09090B 40%, #18181B 100%)'
                }}
              >
                {/* Ambient glow effects */}
                <div
                  className="absolute top-20 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-[100px] opacity-50"
                  style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                />
                <div
                  className="absolute bottom-32 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-[80px] opacity-40"
                  style={{ background: '#A855F7' }}
                />

                {/* Content */}
                <div className="relative z-10 h-full flex flex-col justify-between p-12">
                  {/* Logo */}
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="w-24 h-24 rounded-[20px] flex items-center justify-center shadow-xl"
                      style={{
                        background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                        boxShadow: '0 12px 24px rgba(219, 39, 119, 0.4)'
                      }}
                    >
                      <svg
                        viewBox="0 0 100 100"
                        className="w-16 h-16"
                        fill="white"
                      >
                        <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                      </svg>
                    </div>
                    <span className="text-white text-2xl font-bold">Whozin</span>
                  </div>

                  {/* Main Message */}
                  <div className="text-center">
                    <h2 className="text-white text-4xl font-bold mb-4 tracking-tight leading-tight">
                      See who's going<br />before you go.
                    </h2>
                    <p className="text-[#A1A1AA] text-lg mb-8">
                      The private social layer<br />for nights out.
                    </p>

                    {/* CTA */}
                    <div
                      className="inline-flex px-8 py-4 rounded-full text-white font-bold text-lg"
                      style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                    >
                      Download Now
                    </div>
                  </div>

                  {/* Bottom accent */}
                  <div className="flex justify-center">
                    <div className="h-1 w-32 rounded-full bg-gradient-to-r from-[#DB2777] to-[#9333EA]" />
                  </div>
                </div>
              </div>
              <p className="text-[#71717A] text-sm mt-4 text-center">1080×1920 • Instagram Story</p>
            </div>
          </div>
        </div>

        {/* Square Social Post */}
        <div>
          <h2 className="text-white text-2xl font-bold mb-8">Square Social Announcement</h2>
          <div className="bg-[#18181B] rounded-3xl p-8 border border-[#27272A]">
            <div
              className="w-full max-w-2xl mx-auto aspect-square rounded-3xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, #000000 0%, #09090B 30%, #18181B 70%, #27272A 100%)'
              }}
            >
              {/* Ambient glow effects */}
              <div
                className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] opacity-40"
                style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
              />
              <div
                className="absolute bottom-0 left-0 w-80 h-80 rounded-full blur-[100px] opacity-30"
                style={{ background: '#9333EA' }}
              />
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[90px] opacity-25"
                style={{ background: '#A855F7' }}
              />

              {/* Content */}
              <div className="relative z-10 h-full flex flex-col items-center justify-center p-16 text-center">
                {/* Logo */}
                <div
                  className="w-32 h-32 rounded-[28px] flex items-center justify-center mb-8 shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 20px 40px rgba(219, 39, 119, 0.5)'
                  }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="w-20 h-20"
                    fill="white"
                  >
                    <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                  </svg>
                </div>

                {/* Main Message */}
                <h2 className="text-white text-6xl font-bold mb-6 tracking-tight leading-tight">
                  See who's going<br />before you go.
                </h2>
                <p className="text-[#A1A1AA] text-2xl mb-8">
                  The private social layer for nights out.
                </p>

                {/* Brand badges */}
                <div className="flex gap-3">
                  <div className="px-5 py-2.5 bg-[#27272A]/80 backdrop-blur-sm border border-[#3f3f46] rounded-full">
                    <span className="text-[#A1A1AA] text-sm tracking-wide uppercase">Private by Default</span>
                  </div>
                  <div className="px-5 py-2.5 bg-gradient-to-r from-[#DB2777]/20 to-[#9333EA]/20 backdrop-blur-sm border border-[#DB2777]/30 rounded-full">
                    <span className="text-white text-sm tracking-wide uppercase font-bold">The Move</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[#71717A] text-sm mt-4 text-center">1080×1080 • Square Social Post</p>
          </div>
        </div>
      </div>
    </div>
  );
}
