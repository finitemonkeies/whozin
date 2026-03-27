export function AppIconSystem() {
  return (
    <div className="w-full min-h-screen bg-[#09090B] p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-white text-5xl font-bold mb-4 tracking-tight">App Icon System</h1>
        <p className="text-[#A1A1AA] text-lg mb-16">
          iOS, Android, and platform-specific icon variations
        </p>

        {/* iOS App Icon */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">iOS App Icon</h2>
          <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A]">
            <div className="flex flex-wrap gap-8 items-end justify-center">
              {/* 1024x1024 */}
              <div className="flex flex-col items-center">
                <div
                  className="w-64 h-64 rounded-[56px] flex items-center justify-center mb-4 shadow-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 20px 40px rgba(219, 39, 119, 0.3)'
                  }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="w-40 h-40"
                    fill="white"
                  >
                    <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                  </svg>
                </div>
                <p className="text-[#A1A1AA] text-sm">1024×1024</p>
                <p className="text-[#71717A] text-xs">App Store</p>
              </div>

              {/* 180x180 */}
              <div className="flex flex-col items-center">
                <div
                  className="w-44 h-44 rounded-[38px] flex items-center justify-center mb-4 shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 12px 24px rgba(219, 39, 119, 0.3)'
                  }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="w-28 h-28"
                    fill="white"
                  >
                    <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                  </svg>
                </div>
                <p className="text-[#A1A1AA] text-sm">180×180</p>
                <p className="text-[#71717A] text-xs">iPhone @3x</p>
              </div>

              {/* 120x120 */}
              <div className="flex flex-col items-center">
                <div
                  className="w-32 h-32 rounded-[28px] flex items-center justify-center mb-4 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 8px 16px rgba(219, 39, 119, 0.3)'
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
                <p className="text-[#A1A1AA] text-sm">120×120</p>
                <p className="text-[#71717A] text-xs">iPhone @2x</p>
              </div>

              {/* 60x60 */}
              <div className="flex flex-col items-center">
                <div
                  className="w-20 h-20 rounded-[18px] flex items-center justify-center mb-4 shadow-md"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 4px 8px rgba(219, 39, 119, 0.3)'
                  }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="w-12 h-12"
                    fill="white"
                  >
                    <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                  </svg>
                </div>
                <p className="text-[#A1A1AA] text-sm">60×60</p>
                <p className="text-[#71717A] text-xs">Spotlight</p>
              </div>
            </div>
          </div>
        </div>

        {/* Android Adaptive Icon */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">Android Adaptive Icon</h2>
          <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Foreground Layer */}
              <div className="flex flex-col items-center">
                <div className="w-48 h-48 bg-[#27272A] rounded-3xl flex items-center justify-center mb-4 relative">
                  <svg
                    viewBox="0 0 100 100"
                    className="w-32 h-32"
                    fill="url(#iconGradient)"
                  >
                    <defs>
                      <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#EC4899' }} />
                        <stop offset="100%" style={{ stopColor: '#9333EA' }} />
                      </linearGradient>
                    </defs>
                    <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                  </svg>
                  {/* Safe zone guide */}
                  <div className="absolute inset-0 border-2 border-dashed border-[#DB2777] opacity-20 rounded-3xl m-8" />
                </div>
                <p className="text-[#A1A1AA] text-sm mb-1">Foreground Layer</p>
                <p className="text-[#71717A] text-xs">With safe zone</p>
              </div>

              {/* Background Layer */}
              <div className="flex flex-col items-center">
                <div
                  className="w-48 h-48 rounded-3xl mb-4"
                  style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                />
                <p className="text-[#A1A1AA] text-sm mb-1">Background Layer</p>
                <p className="text-[#71717A] text-xs">Gradient fill</p>
              </div>

              {/* Combined Result */}
              <div className="flex flex-col items-center">
                <div
                  className="w-48 h-48 rounded-3xl flex items-center justify-center mb-4 shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 12px 24px rgba(219, 39, 119, 0.3)'
                  }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="w-32 h-32"
                    fill="white"
                  >
                    <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                  </svg>
                </div>
                <p className="text-[#A1A1AA] text-sm mb-1">Combined</p>
                <p className="text-[#71717A] text-xs">Final result</p>
              </div>
            </div>
          </div>
        </div>

        {/* Favicon & Small Sizes */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">Favicon & Browser Icons</h2>
          <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A]">
            <div className="flex flex-wrap gap-12 items-end justify-center">
              {/* 32x32 */}
              <div className="flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="w-10 h-10"
                    fill="white"
                  >
                    <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                  </svg>
                </div>
                <p className="text-[#A1A1AA] text-sm">32×32</p>
                <p className="text-[#71717A] text-xs">Favicon</p>
              </div>

              {/* 16x16 */}
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center mb-4"
                  style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                >
                  <svg
                    viewBox="0 0 100 100"
                    className="w-5 h-5"
                    fill="white"
                  >
                    <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                  </svg>
                </div>
                <p className="text-[#A1A1AA] text-sm">16×16</p>
                <p className="text-[#71717A] text-xs">Browser tab</p>
              </div>

              {/* Apple Touch Icon */}
              <div className="flex flex-col items-center">
                <div
                  className="w-32 h-32 rounded-[28px] flex items-center justify-center mb-4 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 8px 16px rgba(219, 39, 119, 0.3)'
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
                <p className="text-[#A1A1AA] text-sm">180×180</p>
                <p className="text-[#71717A] text-xs">Apple Touch</p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Media Profile Icons */}
        <div>
          <h2 className="text-white text-2xl font-bold mb-8">Social Media Profile Icons</h2>
          <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {/* Instagram */}
              <div className="flex flex-col items-center">
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center mb-4 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 8px 16px rgba(219, 39, 119, 0.3)'
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
                <p className="text-[#A1A1AA] text-sm mb-1">Instagram</p>
                <p className="text-[#71717A] text-xs">320×320</p>
              </div>

              {/* TikTok */}
              <div className="flex flex-col items-center">
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center mb-4 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 8px 16px rgba(219, 39, 119, 0.3)'
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
                <p className="text-[#A1A1AA] text-sm mb-1">TikTok</p>
                <p className="text-[#71717A] text-xs">200×200</p>
              </div>

              {/* X (Twitter) */}
              <div className="flex flex-col items-center">
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center mb-4 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 8px 16px rgba(219, 39, 119, 0.3)'
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
                <p className="text-[#A1A1AA] text-sm mb-1">X</p>
                <p className="text-[#71717A] text-xs">400×400</p>
              </div>

              {/* Spotify */}
              <div className="flex flex-col items-center">
                <div
                  className="w-32 h-32 rounded-full flex items-center justify-center mb-4 shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                    boxShadow: '0 8px 16px rgba(219, 39, 119, 0.3)'
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
                <p className="text-[#A1A1AA] text-sm mb-1">Spotify</p>
                <p className="text-[#71717A] text-xs">300×300</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
