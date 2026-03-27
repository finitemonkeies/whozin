export function VoiceMessaging() {
  return (
    <div className="w-full min-h-screen bg-[#000000] p-8">
      <div className="max-w-6xl mx-auto py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-white text-6xl font-bold tracking-tight mb-6">Voice & Messaging</h1>
          <p className="text-[#A1A1AA] text-xl max-w-3xl">
            Short, social, confident, in-the-know. Show the mechanic, not just adjectives.
          </p>
        </div>

        {/* Core Messaging Pillars */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Core Messaging Pillars</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <h3 className="text-white text-2xl font-bold mb-4">Social Proof First</h3>
              <p className="text-[#A1A1AA]">
                You go where your people go. We show you who's going before you commit.
              </p>
            </div>
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <h3 className="text-white text-2xl font-bold mb-4">Private Confidence</h3>
              <p className="text-[#A1A1AA]">
                Your plans stay between you and your crew. No public check-ins, no broadcast noise.
              </p>
            </div>
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <h3 className="text-white text-2xl font-bold mb-4">The Move</h3>
              <p className="text-[#A1A1AA]">
                Know what's worth going to. High-signal, low-noise. The energy before the night starts.
              </p>
            </div>
          </div>
        </div>

        {/* Approved Copy */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Product-Native Language</p>
          <div className="bg-[#09090B] border border-[#18181B] rounded-3xl p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-6">
              {[
                "See who's going.",
                "Before you go.",
                "Private by default.",
                "The Move.",
                "Your crew is here.",
                "4 friends are going.",
                "Picking up tonight.",
                "What's the move?",
                "Skip the group chat.",
                "Know before you go.",
                "Where your people are.",
                "The night starts here.",
              ].map((copy, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #DB2777, #9333EA)' }}
                  />
                  <span className="text-white text-lg">{copy}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tagline Options */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Tagline Options</p>
          <div className="space-y-4">
            {[
              { main: "See who's going before you go.", context: 'Primary tagline' },
              { main: 'The private social layer for nights out.', context: 'Supporting line' },
              { main: 'Know before you go.', context: 'Short form' },
              { main: 'Where your people are.', context: 'Social proof angle' },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8 flex items-center justify-between"
              >
                <span className="text-white text-2xl font-bold">{item.main}</span>
                <span className="text-[#71717A] text-sm tracking-wide uppercase">{item.context}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Language */}
        <div className="mb-24">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">CTA Language</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              "See who's going",
              'Check the move',
              'Find your crew',
              'Get Whozin',
              'RSVP now',
              "I'm going",
              'Add to my night',
              'Share with crew',
            ].map((cta, i) => (
              <button
                key={i}
                className="px-6 py-4 rounded-xl text-white font-bold transition-all"
                style={{
                  background: i % 2 === 0 ? 'linear-gradient(to right, #DB2777, #9333EA)' : '#18181B',
                  border: i % 2 === 0 ? 'none' : '1px solid #27272A'
                }}
              >
                {cta}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Examples: Good vs Bad */}
        <div>
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Voice Examples</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Good Examples */}
            <div className="bg-[#09090B] border border-[#DB2777]/30 rounded-3xl p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#DB2777]" />
                <h3 className="text-white text-2xl font-bold">Sounds like Whozin</h3>
              </div>
              <div className="space-y-6">
                <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                  <p className="text-white text-lg mb-2">"4 friends are going to Subtronics."</p>
                  <p className="text-[#71717A] text-sm">✓ Specific, social proof, product mechanic</p>
                </div>
                <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                  <p className="text-white text-lg mb-2">"Your crew is here tonight."</p>
                  <p className="text-[#71717A] text-sm">✓ Personal, high-signal, confident</p>
                </div>
                <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                  <p className="text-white text-lg mb-2">"See who's going before you go."</p>
                  <p className="text-[#71717A] text-sm">✓ Clear value, conversational</p>
                </div>
              </div>
            </div>

            {/* Bad Examples */}
            <div className="bg-[#09090B] border border-[#27272A] rounded-3xl p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#3f3f46]" />
                <h3 className="text-white text-2xl font-bold">Doesn't sound like Whozin</h3>
              </div>
              <div className="space-y-6">
                <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                  <p className="text-[#71717A] text-lg mb-2 line-through">
                    "Discover amazing events in your area."
                  </p>
                  <p className="text-[#52525b] text-sm">✗ Generic marketplace language</p>
                </div>
                <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                  <p className="text-[#71717A] text-lg mb-2 line-through">
                    "Join our community of event enthusiasts!"
                  </p>
                  <p className="text-[#52525b] text-sm">✗ Corporate, not social, exclamation marks</p>
                </div>
                <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-6">
                  <p className="text-[#71717A] text-lg mb-2 line-through">
                    "The future of event planning is here."
                  </p>
                  <p className="text-[#52525b] text-sm">✗ Vague startup jargon, no specificity</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}