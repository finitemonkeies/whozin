export function BrandFoundation() {
  return (
    <div className="w-full min-h-screen bg-[#000000] p-8">
      <div className="max-w-6xl mx-auto py-16">
        {/* Mission */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-6 uppercase tracking-widest">Mission</p>
          <h2 className="text-white text-6xl font-bold tracking-tight leading-tight mb-8 max-w-4xl">
            Help people see who's going before they go.
          </h2>
          <p className="text-[#A1A1AA] text-2xl max-w-3xl leading-relaxed">
            Whozin is the private social layer that gives you the confidence to know where your people are, 
            what the move is, and whether something is worth going to—before you commit.
          </p>
        </div>

        {/* Brand Tensions */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Strategic Tensions</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              ['Private', 'but electric'],
              ['Premium', 'but accessible'],
              ['Social', 'but not noisy'],
              ['Nightlife-native', 'but not trashy'],
              ['Confident', 'but not corporate'],
              ['Youthful', 'but not immature'],
            ].map(([first, second], i) => (
              <div
                key={i}
                className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8 relative overflow-hidden"
              >
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-20"
                  style={{ background: '#DB2777' }}
                />
                <div className="relative z-10">
                  <span className="text-white text-3xl font-bold">{first}</span>
                  <span className="text-[#71717A] text-2xl ml-2">{second}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What Whozin Is / Is Not */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* What Whozin Is */}
          <div className="bg-[#09090B] border border-[#DB2777]/30 rounded-3xl p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#DB2777]" />
              <h3 className="text-white text-2xl font-bold">Whozin is</h3>
            </div>
            <ul className="space-y-4 text-[#A1A1AA] text-lg">
              <li>• A private social layer for nights out</li>
              <li>• Where you see who's going before you go</li>
              <li>• Social proof for live events</li>
              <li>• Your crew's shared calendar</li>
              <li>• High-signal, low-noise</li>
              <li>• Nightlife-native and culturally aware</li>
              <li>• Private by default</li>
              <li>• The confidence to commit</li>
            </ul>
          </div>

          {/* What Whozin Is Not */}
          <div className="bg-[#09090B] border border-[#27272A] rounded-3xl p-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-2 h-2 rounded-full bg-[#3f3f46]" />
              <h3 className="text-white text-2xl font-bold">Whozin is not</h3>
            </div>
            <ul className="space-y-4 text-[#71717A] text-lg">
              <li>• A ticketing platform</li>
              <li>• A generic event discovery marketplace</li>
              <li>• A public check-in app</li>
              <li>• A mass-market social network</li>
              <li>• A festival flyer board</li>
              <li>• An open broadcast feed</li>
              <li>• Corporate event software</li>
              <li>• A noisy notification engine</li>
            </ul>
          </div>
        </div>

        {/* Emotional Promise */}
        <div className="mt-24 bg-gradient-to-br from-[#09090B] to-[#18181B] border border-[#27272A] rounded-3xl p-12 relative overflow-hidden">
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[100px] opacity-20"
            style={{ background: 'linear-gradient(135deg, #DB2777, #9333EA)' }}
          />
          <div className="relative z-10">
            <p className="text-[#71717A] text-sm mb-6 uppercase tracking-widest">Emotional Promise</p>
            <h2 className="text-white text-5xl font-bold tracking-tight leading-tight mb-6 max-w-4xl">
              The anticipation of knowing your people are going.
            </h2>
            <p className="text-[#A1A1AA] text-xl max-w-3xl leading-relaxed">
              Whozin gives you the private confidence to say yes to the right night, 
              skip the wrong one, and always know where the energy is.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
