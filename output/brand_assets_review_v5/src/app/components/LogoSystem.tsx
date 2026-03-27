export function LogoSystem() {
  return (
    <div className="w-full min-h-screen bg-[#09090B] p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-white text-5xl font-bold mb-4 tracking-tight">Logo System</h1>
        <p className="text-[#A1A1AA] text-lg mb-16">
          Primary Whozin mark: rounded-square gradient tile with bold white W glyph
        </p>

        {/* Primary Icon Mark */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">Primary Icon Mark</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Large version - Dark Background */}
            <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A] flex flex-col items-center">
              <div
                className="w-48 h-48 rounded-[32px] flex items-center justify-center mb-6"
                style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-32 h-32"
                  fill="white"
                >
                  <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                </svg>
              </div>
              <p className="text-[#A1A1AA] text-sm">192×192 (Dark)</p>
            </div>

            {/* Medium version - Dark Background */}
            <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A] flex flex-col items-center">
              <div
                className="w-32 h-32 rounded-[24px] flex items-center justify-center mb-6"
                style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-20 h-20"
                  fill="white"
                >
                  <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                </svg>
              </div>
              <p className="text-[#A1A1AA] text-sm">128×128 (Dark)</p>
            </div>

            {/* Small version - Dark Background */}
            <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A] flex flex-col items-center">
              <div
                className="w-20 h-20 rounded-[16px] flex items-center justify-center mb-6"
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
              <p className="text-[#A1A1AA] text-sm">64×64 (Dark)</p>
            </div>
          </div>
        </div>

        {/* Horizontal Lockup */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">Horizontal Lockup</h2>
          <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A] flex justify-center">
            <div className="flex items-center gap-6">
              <div
                className="w-24 h-24 rounded-[20px] flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-16 h-16"
                  fill="white"
                >
                  <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                </svg>
              </div>
              <h1 className="text-white text-7xl font-bold tracking-tight">Whozin</h1>
            </div>
          </div>
        </div>

        {/* Stacked Lockup */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">Stacked Lockup</h2>
          <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A] flex justify-center">
            <div className="flex flex-col items-center gap-6">
              <div
                className="w-32 h-32 rounded-[24px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-20 h-20"
                  fill="white"
                >
                  <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                </svg>
              </div>
              <h1 className="text-white text-5xl font-bold tracking-tight">Whozin</h1>
            </div>
          </div>
        </div>

        {/* Monochrome Versions */}
        <div className="mb-16">
          <h2 className="text-white text-2xl font-bold mb-8">Monochrome Versions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Dark Version */}
            <div className="bg-white rounded-3xl p-12 flex flex-col items-center">
              <div className="w-32 h-32 bg-black rounded-[24px] flex items-center justify-center mb-6">
                <svg
                  viewBox="0 0 100 100"
                  className="w-20 h-20"
                  fill="white"
                >
                  <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                </svg>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 bg-black rounded-[16px] flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-12 h-12" fill="white">
                    <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                  </svg>
                </div>
                <h2 className="text-black text-4xl font-bold tracking-tight">Whozin</h2>
              </div>
              <p className="text-[#71717A] text-sm">One-color dark (for light backgrounds)</p>
            </div>

            {/* Light Version */}
            <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A] flex flex-col items-center">
              <div className="w-32 h-32 bg-white rounded-[24px] flex items-center justify-center mb-6">
                <svg
                  viewBox="0 0 100 100"
                  className="w-20 h-20"
                  fill="black"
                >
                  <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                </svg>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-20 h-20 bg-white rounded-[16px] flex items-center justify-center">
                  <svg viewBox="0 0 100 100" className="w-12 h-12" fill="black">
                    <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                  </svg>
                </div>
                <h2 className="text-white text-4xl font-bold tracking-tight">Whozin</h2>
              </div>
              <p className="text-[#A1A1AA] text-sm">One-color light (for dark backgrounds)</p>
            </div>
          </div>
        </div>

        {/* Clear Space Rules */}
        <div>
          <h2 className="text-white text-2xl font-bold mb-8">Clear Space & Safe Area</h2>
          <div className="bg-[#18181B] rounded-3xl p-12 border border-[#27272A] flex justify-center">
            <div className="relative">
              {/* Clear space guides */}
              <div className="absolute inset-0 border-2 border-dashed border-[#DB2777] opacity-30" style={{ margin: '-40px' }} />
              <div className="absolute inset-0 border-2 border-dashed border-[#9333EA] opacity-30" style={{ margin: '-20px' }} />
              
              <div
                className="w-32 h-32 rounded-[24px] flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
              >
                <svg
                  viewBox="0 0 100 100"
                  className="w-20 h-20"
                  fill="white"
                >
                  <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                </svg>
              </div>
              
              <div className="mt-8 text-center">
                <p className="text-[#A1A1AA] text-sm mb-1">Minimum clear space: 25% of icon width</p>
                <p className="text-[#71717A] text-xs">Inner zone (purple) = safe area, Outer zone (pink) = ideal spacing</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
