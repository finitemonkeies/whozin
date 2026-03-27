export function ProductExpression() {
  return (
    <div className="w-full min-h-screen bg-[#000000] p-8">
      <div className="max-w-6xl mx-auto py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-white text-6xl font-bold tracking-tight mb-6">Product Expression</h1>
          <p className="text-[#A1A1AA] text-xl max-w-3xl">
            How Whozin comes to life in the app: social proof, privacy, and anticipation.
          </p>
        </div>

        {/* Event Card with Social Proof */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Event Card with Social Proof</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-8 max-w-md mx-auto">
            {/* Event Card */}
            <div className="bg-[#18181B] rounded-2xl overflow-hidden border border-[#27272A]">
              {/* Event image placeholder */}
              <div className="h-48 bg-gradient-to-br from-[#DB2777]/30 to-[#9333EA]/30 relative overflow-hidden">
                <div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-[60px] opacity-40"
                  style={{ background: '#DB2777' }}
                />
                <div className="absolute top-4 right-4">
                  <div className="px-3 py-1.5 bg-[#000000]/60 backdrop-blur-sm border border-[#27272A] rounded-full">
                    <span className="text-[#71717A] text-xs tracking-widest uppercase">Club</span>
                  </div>
                </div>
              </div>

              {/* Card content */}
              <div className="p-6">
                {/* Event details */}
                <div className="mb-4">
                  <h3 className="text-white text-xl font-bold mb-1">Subtronics</h3>
                  <p className="text-[#A1A1AA] text-sm">Friday, 10pm · The Midway</p>
                </div>

                {/* Social proof - THE KEY WHOZIN ELEMENT */}
                <div className="mb-4">
                  <div className="flex items-center gap-3 mb-2">
                    {/* Avatar stack */}
                    <div className="flex -space-x-2">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full border-2 border-[#18181B] flex items-center justify-center text-xs font-bold"
                          style={{
                            background: `linear-gradient(${120 + i * 40}deg, #DB2777, #9333EA)`
                          }}
                        >
                          <span className="text-white opacity-80">
                            {['S', 'M', 'A', 'J'][i - 1]}
                          </span>
                        </div>
                      ))}
                    </div>
                    <span className="text-white font-bold text-sm">4 friends are going</span>
                  </div>
                  <p className="text-[#A1A1AA] text-xs">Sarah, Mike, Alex, and Jordan</p>
                </div>

                {/* CTA */}
                <button
                  className="w-full py-3 rounded-xl text-white font-bold"
                  style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                >
                  I'm going
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* "The Move" Feature */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">"The Move" Feature Moment</p>
          <div className="bg-[#09090B] border border-[#DB2777]/30 rounded-3xl p-8 max-w-md mx-auto relative overflow-hidden">
            <div
              className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-30"
              style={{ background: '#DB2777' }}
            />
            <div className="relative z-10">
              {/* Badge */}
              <div className="inline-flex px-4 py-2 rounded-full mb-6" style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}>
                <span className="text-white text-sm font-bold tracking-wide uppercase">The Move</span>
              </div>

              {/* Content */}
              <h3 className="text-white text-2xl font-bold mb-3">Your crew is going to Subtronics tonight</h3>
              <p className="text-[#A1A1AA] mb-6">
                12 friends are going, including everyone from last weekend's show.
              </p>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  className="flex-1 py-3 rounded-xl text-white font-bold"
                  style={{ background: 'linear-gradient(to right, #DB2777, #9333EA)' }}
                >
                  I'm in
                </button>
                <button className="px-6 py-3 rounded-xl text-[#A1A1AA] font-bold bg-[#27272A] border border-[#3f3f46]">
                  Skip
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Friend Activity Feed */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Friend Activity Feed</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-8 max-w-md mx-auto">
            <div className="space-y-4">
              {[
                { name: 'Sarah', action: 'is going to Subtronics', time: '2m ago', live: false },
                { name: 'Mike', action: 'is at The Midway', time: 'now', live: true },
                { name: 'Alex', action: 'added Fred Again.. to their night', time: '1h ago', live: false },
              ].map((activity, i) => (
                <div
                  key={i}
                  className="bg-[#18181B] border border-[#27272A] rounded-xl p-4 flex items-center gap-4"
                >
                  {/* Avatar */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-bold flex-shrink-0 relative"
                    style={{ background: 'linear-gradient(135deg, #DB2777, #9333EA)' }}
                  >
                    <span className="text-white">{activity.name[0]}</span>
                    {activity.live && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#3B82F6] rounded-full border-2 border-[#18181B] animate-pulse" />
                    )}
                  </div>

                  {/* Content */}
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

        {/* Privacy-Forward Onboarding */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Privacy-Forward Onboarding</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12 max-w-md mx-auto text-center">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 bg-[#27272A] rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-[#A1A1AA]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            {/* Content */}
            <h3 className="text-white text-2xl font-bold mb-4">Private by default</h3>
            <p className="text-[#A1A1AA] mb-8">
              Your plans stay between you and your crew. No public check-ins. No broadcast feed. 
              Just you and your people.
            </p>

            {/* Privacy badge */}
            <div className="inline-flex px-5 py-2.5 bg-[#27272A]/80 backdrop-blur-sm border border-[#3f3f46] rounded-full">
              <span className="text-[#A1A1AA] text-sm tracking-wide uppercase">Your data stays yours</span>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div>
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Empty State</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-12 max-w-md mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#27272A] flex items-center justify-center">
              <svg className="w-8 h-8 text-[#71717A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-white text-xl font-bold mb-3">Your crew isn't going out yet</h3>
            <p className="text-[#A1A1AA] text-sm mb-6">
              When your friends RSVP to events, you'll see them here.
            </p>
            <button className="px-6 py-3 rounded-xl text-[#A1A1AA] font-bold bg-[#18181B] border border-[#27272A] hover:border-[#3f3f46] transition">
              Invite friends
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
