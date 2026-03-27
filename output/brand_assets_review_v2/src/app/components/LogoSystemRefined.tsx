export function LogoSystemRefined() {
  return (
    <div className="w-full min-h-screen bg-[#000000] p-8">
      <div className="max-w-6xl mx-auto py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-white text-6xl font-bold tracking-tight mb-6">Logo System</h1>
          <p className="text-[#A1A1AA] text-xl max-w-3xl">
            Rounded-square gradient tile with bold W glyph. Geometric, direct, premium.
          </p>
        </div>

        {/* Primary Mark */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Primary Mark</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-16 flex justify-center">
            <div
              className="w-64 h-64 rounded-[56px] flex items-center justify-center shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #EC4899, #9333EA)',
                boxShadow: '0 32px 64px rgba(219, 39, 119, 0.4)'
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
          </div>
        </div>

        {/* Lockups */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Lockups</p>
          
          {/* Horizontal */}
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12 mb-6 flex justify-center">
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

          {/* Stacked */}
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12 flex justify-center">
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

        {/* Minimum Sizes */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Minimum Sizes</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div
                    className="w-16 h-16 rounded-[14px] flex items-center justify-center"
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
                </div>
                <p className="text-white font-bold mb-1">Icon Only</p>
                <p className="text-[#71717A] text-sm">64×64px minimum</p>
              </div>
              <div className="text-center">
                <div className="flex justify-center items-center mb-4 gap-2">
                  <div
                    className="w-12 h-12 rounded-[12px] flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                  >
                    <svg
                      viewBox="0 0 100 100"
                      className="w-7 h-7"
                      fill="white"
                    >
                      <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                    </svg>
                  </div>
                  <span className="text-white text-2xl font-bold">Whozin</span>
                </div>
                <p className="text-white font-bold mb-1">Horizontal</p>
                <p className="text-[#71717A] text-sm">120px wide minimum</p>
              </div>
              <div className="text-center">
                <div className="flex flex-col items-center mb-4 gap-1">
                  <div
                    className="w-12 h-12 rounded-[12px] flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #EC4899, #9333EA)' }}
                  >
                    <svg
                      viewBox="0 0 100 100"
                      className="w-7 h-7"
                      fill="white"
                    >
                      <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                    </svg>
                  </div>
                  <span className="text-white text-lg font-bold">Whozin</span>
                </div>
                <p className="text-white font-bold mb-1">Stacked</p>
                <p className="text-[#71717A] text-sm">80px wide minimum</p>
              </div>
            </div>
          </div>
        </div>

        {/* Incorrect Usage */}
        <div>
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Incorrect Usage</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Don\'t rotate', rotation: 'rotate-12' },
              { label: 'Don\'t distort', skew: 'skew-x-12' },
              { label: 'Don\'t change colors', gradient: 'bg-[#3B82F6]' },
              { label: 'Don\'t add effects', shadow: 'drop-shadow-2xl' },
            ].map((item, i) => (
              <div key={i} className="bg-[#09090B] border border-[#27272A] rounded-2xl p-6 text-center">
                <div className="flex justify-center mb-4 opacity-40">
                  <div
                    className={`w-16 h-16 rounded-[14px] flex items-center justify-center ${
                      item.rotation || item.skew || ''
                    } ${item.shadow || ''}`}
                    style={{
                      background: item.gradient || 'linear-gradient(135deg, #EC4899, #9333EA)'
                    }}
                  >
                    <svg
                      viewBox="0 0 100 100"
                      className="w-10 h-10"
                      fill="white"
                    >
                      <path d="M15 20 L25 20 L35 65 L45 20 L55 20 L65 65 L75 20 L85 20 L72 85 L60 85 L50 40 L40 85 L28 85 Z" />
                    </svg>
                  </div>
                </div>
                <p className="text-[#71717A] text-sm">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
