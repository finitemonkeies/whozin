export function ProductExpression() {
  // Use the canonical refined W
  const WhozinW = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 120 120" className={className} fill="currentColor">
      <path d="M18 22 L38 22 L50 82 L62 22 L82 22 L94 82 L106 22 L126 22 L109 103 L89 103 L71 38 L53 103 L33 103 Z" 
        strokeLinejoin="miter" 
        strokeLinecap="square"
      />
    </svg>
  );

  return (
    <div className="w-full min-h-screen bg-[#000000] p-8">
      <div className="max-w-6xl mx-auto py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-white text-6xl font-bold tracking-tight mb-6">Product Expression</h1>
          <p className="text-[#A1A1AA] text-xl max-w-3xl">
            The moment when your friends are going and the night starts to form. Real anticipation, real momentum.
          </p>
        </div>

        {/* More realistic event card layout - not centered demo */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Event Discovery with Social Context</p>
          
          <div className="bg-gradient-to-br from-[#09090B] to-[#000000] border border-[#18181B] rounded-3xl p-12">
            {/* Multiple cards showing a feed, not just one demo card */}
            <div className="space-y-6 max-w-lg">
              {/* Card 1 - High social proof */}
              <div className="bg-[#18181B] rounded-2xl overflow-hidden border border-[#27272A] hover:border-[#DB2777]/30 transition-all">
                <div className="h-40 bg-gradient-to-br from-[#DB2777]/20 to-[#9333EA]/20 relative">
                  {/* Premium abstract visual instead of emoji */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full border-2 border-white/10 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#DB2777]/40 to-[#9333EA]/40 backdrop-blur-sm" />
                    </div>
                  </div>
                  <div className="absolute top-4 left-4">
                    <div className="px-3 py-1.5 bg-[#000000]/70 backdrop-blur-sm border border-[#27272A] rounded-full">
                      <span className="text-[#A1A1AA] text-xs tracking-wider uppercase">Tonight · 10pm</span>
                    </div>
                  </div>
                  <div className="absolute top-4 right-4">
                    <div 
                      className="px-3 py-1.5 rounded-full backdrop-blur-sm text-white text-xs font-bold tracking-wide uppercase"
                      style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                    >
                      The Move
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-white text-xl font-bold mb-1">Subtronics</h3>
                  <p className="text-[#71717A] text-sm mb-5">The Midway SF · 10pm</p>
                  
                  {/* Social proof - the key element */}
                  <div className="bg-[#09090B] border border-[#27272A] rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex -space-x-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div
                            key={i}
                            className="w-8 h-8 rounded-full border-2 border-[#18181B] flex items-center justify-center text-xs font-bold"
                            style={{
                              background: `linear-gradient(${100 + i * 35}deg, #EC4899, #9333EA)`
                            }}
                          >
                            <span className="text-white opacity-80 text-[10px]">
                              {['S', 'M', 'A', 'J', 'R', 'K'][i - 1]}
                            </span>
                          </div>
                        ))}
                      </div>
                      <span className="text-white font-bold text-sm">12 friends going</span>
                    </div>
                    <p className="text-[#A1A1AA] text-xs">
                      Sarah, Mike, Alex, Jordan, Rachel, and 7 others
                    </p>
                  </div>

                  <button
                    className="w-full py-3 rounded-xl text-white font-bold"
                    style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                  >
                    I'm going
                  </button>
                </div>
              </div>

              {/* Card 2 - Medium interest */}
              <div className="bg-[#18181B] rounded-2xl overflow-hidden border border-[#27272A]">
                <div className="h-32 bg-gradient-to-br from-[#A855F7]/10 to-[#EC4899]/10 relative">
                  {/* Premium abstract visual */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-2 border-white/10 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#A855F7]/30 to-[#EC4899]/30 backdrop-blur-sm" />
                    </div>
                  </div>
                  <div className="absolute top-3 left-3">
                    <div className="px-2.5 py-1 bg-[#000000]/70 backdrop-blur-sm border border-[#27272A] rounded-full">
                      <span className="text-[#71717A] text-xs tracking-wider uppercase">Tomorrow · 9pm</span>
                    </div>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-white text-lg font-bold mb-1">Fred Again..</h3>
                  <p className="text-[#71717A] text-sm mb-4">Bill Graham · 9pm</p>
                  
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full border-2 border-[#18181B]"
                          style={{
                            background: `linear-gradient(${120 + i * 40}deg, #EC4899, #9333EA)`
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[#A1A1AA] text-sm">3 friends going</span>
                  </div>

                  <button className="w-full py-2.5 rounded-xl text-[#A1A1AA] font-bold bg-[#27272A] hover:bg-[#3f3f46] transition">
                    Interested
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* "The Move" - but more contextual and story-driven */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">High-Signal Moment: The Move</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Notification/Alert Style */}
            <div className="bg-gradient-to-br from-[#09090B] to-[#000000] border border-[#DB2777]/40 rounded-3xl p-10 relative overflow-hidden">
              <div
                className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20"
                style={{ background: '#DB2777' }}
              />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                  <div
                    className="px-4 py-2 rounded-full text-white text-sm font-bold tracking-wide uppercase"
                    style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                  >
                    The Move
                  </div>
                  <span className="text-[#71717A] text-xs">2m ago</span>
                </div>

                <h3 className="text-white text-3xl font-bold mb-4 leading-tight">
                  Your crew is going to Subtronics
                </h3>
                
                <p className="text-[#A1A1AA] mb-6">
                  12 friends are going, including everyone from last weekend. This is picking up.
                </p>

                <div className="flex gap-3">
                  <button
                    className="flex-1 py-3.5 rounded-xl text-white font-bold"
                    style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                  >
                    Count me in
                  </button>
                  <button className="px-6 py-3.5 rounded-xl text-[#71717A] font-bold bg-[#27272A] hover:bg-[#3f3f46] transition border border-[#3f3f46]">
                    Maybe
                  </button>
                </div>
              </div>
            </div>

            {/* Context card - showing why this matters with premium icons */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-10">
              <p className="text-[#52525b] text-xs mb-6 uppercase tracking-widest">Why this matters</p>
              
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#DB2777]/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#DB2777]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-bold mb-1">Your core group</p>
                    <p className="text-[#71717A] text-sm">8 people from your last 3 nights out are going</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#A855F7]/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#A855F7]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-bold mb-1">Momentum building</p>
                    <p className="text-[#71717A] text-sm">12 RSVPs in the last 2 hours</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#EC4899]/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-[#EC4899]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-bold mb-1">Tonight</p>
                    <p className="text-[#71717A] text-sm">Doors at 10pm, your crew arrives around 11</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Friend Activity - more realistic feed with density */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Live Activity Feed</p>
          
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-8 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-xl font-bold">Your crew</h3>
              <span className="text-[#71717A] text-sm">Last 2 hours</span>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Sarah', action: 'is going to Subtronics', time: '2m ago', live: false, avatar: 'S', color: '135deg, #DB2777, #9333EA' },
                { name: 'Mike', action: 'just arrived at The Midway', time: 'now', live: true, avatar: 'M', color: '145deg, #EC4899, #A855F7' },
                { name: 'Alex', action: 'is going to Subtronics', time: '15m ago', live: false, avatar: 'A', color: '155deg, #DB2777, #9333EA' },
                { name: 'Jordan', action: 'added Fred Again.. to their night', time: '1h ago', live: false, avatar: 'J', color: '165deg, #EC4899, #A855F7' },
                { name: 'Rachel', action: 'is interested in Subtronics', time: '1h ago', live: false, avatar: 'R', color: '175deg, #A855F7, #9333EA' },
              ].map((activity, i) => (
                <div
                  key={i}
                  className={`bg-[#18181B] rounded-xl p-4 flex items-center gap-4 transition-all ${
                    activity.live ? 'border border-[#3B82F6]/30' : 'border border-[#27272A]'
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 relative"
                    style={{ background: `linear-gradient(${activity.color})` }}
                  >
                    {activity.avatar}
                    {activity.live && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#3B82F6] rounded-full border-2 border-[#18181B]">
                        <div className="w-full h-full bg-[#3B82F6] rounded-full animate-ping opacity-75" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm">
                      <span className="font-bold">{activity.name}</span>{' '}
                      <span className="text-[#A1A1AA]">{activity.action}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[#71717A] text-xs">{activity.time}</span>
                      {activity.live && (
                        <span className="px-2 py-0.5 bg-[#3B82F6]/20 border border-[#3B82F6]/30 rounded text-[#3B82F6] text-xs font-medium tracking-wide uppercase">
                          Live
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Privacy moment - confident, no unsupported claims */}
        <div>
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Private by Default</p>
          
          <div className="bg-gradient-to-br from-[#09090B] to-[#000000] border border-[#18181B] rounded-3xl p-16 max-w-2xl mx-auto text-center relative overflow-hidden">
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px] opacity-10"
              style={{ background: '#A855F7' }}
            />
            
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-6 bg-[#27272A] rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[#A1A1AA]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <h3 className="text-white text-3xl font-bold mb-4">Just you and your people</h3>
              <p className="text-[#A1A1AA] text-lg mb-8 max-w-md mx-auto">
                No public check-ins. No broadcast feed. Your plans stay between you and your crew.
              </p>

              <div className="flex items-center justify-center gap-3 flex-wrap">
                <div className="inline-flex px-5 py-2.5 bg-[#27272A] border border-[#3f3f46] rounded-full">
                  <span className="text-[#A1A1AA] text-sm">Private by default</span>
                </div>
                <div className="inline-flex px-5 py-2.5 bg-[#27272A] border border-[#3f3f46] rounded-full">
                  <span className="text-[#A1A1AA] text-sm">Invite only</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}