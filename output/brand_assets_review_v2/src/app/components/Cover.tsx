export function Cover() {
  return (
    <div className="w-full h-screen bg-[#000000] relative overflow-hidden flex items-center justify-center">
      {/* Ambient background glow - more controlled and cinematic */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[140px] opacity-30"
        style={{ background: 'radial-gradient(circle, #DB2777 0%, #9333EA 70%)' }}
      />
      
      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-8 text-center">
        {/* Logo */}
        <div className="flex justify-center mb-12">
          <div
            className="w-32 h-32 rounded-[28px] flex items-center justify-center shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #DB2777, #9333EA)',
              boxShadow: '0 24px 48px rgba(219, 39, 119, 0.4)'
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
        </div>

        {/* Hero statement */}
        <h1 className="text-white text-8xl font-bold tracking-tight mb-8 leading-none">
          Whozin
        </h1>
        
        <p className="text-white text-3xl mb-4 tracking-tight">
          See who's going before you go.
        </p>
        
        <p className="text-[#A1A1AA] text-xl max-w-2xl mx-auto mb-16">
          The private social layer for nights out and live events.
        </p>

        {/* Brand essence pill */}
        <div className="inline-flex px-8 py-3 bg-[#18181B]/60 backdrop-blur-sm border border-[#27272A] rounded-full">
          <span className="text-[#A1A1AA] text-sm tracking-wide uppercase">Brand Book 2026</span>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#000000] to-transparent" />
    </div>
  );
}
