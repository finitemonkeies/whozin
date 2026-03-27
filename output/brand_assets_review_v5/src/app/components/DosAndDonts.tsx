export function DosAndDonts() {
  return (
    <div className="w-full min-h-screen bg-[#000000] p-8">
      <div className="max-w-6xl mx-auto py-16">
        {/* Header */}
        <div className="mb-16">
          <h1 className="text-white text-6xl font-bold tracking-tight mb-6">Dos & Don'ts</h1>
          <p className="text-[#A1A1AA] text-xl max-w-3xl">
            What makes it feel like Whozin—and what doesn't.
          </p>
        </div>

        {/* Visual Style */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Visual Style</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Do */}
            <div className="bg-[#09090B] border border-[#DB2777]/30 rounded-3xl p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#DB2777]" />
                <h3 className="text-white text-2xl font-bold">Do</h3>
              </div>
              <ul className="space-y-4 text-[#A1A1AA]">
                <li>✓ Dark surfaces with controlled signature color bursts</li>
                <li>✓ Cinematic, nightlife-native atmosphere</li>
                <li>✓ Intentional use of blur, glow, and translucency</li>
                <li>✓ Premium, selective, magnetic energy</li>
                <li>✓ Generous corner radius, soft but structured</li>
                <li>✓ Pink/purple as signature brand identity</li>
                <li>✓ High contrast for readability</li>
                <li>✓ Smoked glass, ambient light, depth</li>
              </ul>
            </div>

            {/* Don't */}
            <div className="bg-[#09090B] border border-[#27272A] rounded-3xl p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#52525b]" />
                <h3 className="text-white text-2xl font-bold">Don't</h3>
              </div>
              <ul className="space-y-4 text-[#71717A]">
                <li>✗ Rainbow gradients or equal-weight accent colors</li>
                <li>✗ Bright, flat backgrounds</li>
                <li>✗ EDM flyer chaos or festival poster energy</li>
                <li>✗ Crypto/gaming/esports aesthetics</li>
                <li>✗ Generic SaaS template layouts</li>
                <li>✗ Overuse of glow without purpose</li>
                <li>✗ Cute, childish, or immature treatments</li>
                <li>✗ Corporate, stiff, or overly formal</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Copy & Messaging */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Copy & Messaging</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Do */}
            <div className="bg-[#09090B] border border-[#DB2777]/30 rounded-3xl p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#DB2777]" />
                <h3 className="text-white text-2xl font-bold">Do</h3>
              </div>
              <ul className="space-y-4 text-[#A1A1AA]">
                <li>✓ Short, social, confident, in-the-know</li>
                <li>✓ Show the product mechanic, not just adjectives</li>
                <li>✓ Use specific scenarios: "4 friends are going"</li>
                <li>✓ Conversational and warm, never corporate</li>
                <li>✓ Product-native language: "The Move," "Your crew"</li>
                <li>✓ Clear value: "See who's going before you go"</li>
                <li>✓ Privacy-forward without being preachy</li>
              </ul>
            </div>

            {/* Don't */}
            <div className="bg-[#09090B] border border-[#27272A] rounded-3xl p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#52525b]" />
                <h3 className="text-white text-2xl font-bold">Don't</h3>
              </div>
              <ul className="space-y-4 text-[#71717A]">
                <li>✗ Generic marketplace language: "Discover events"</li>
                <li>✗ Corporate jargon: "solutions," "platform," "ecosystem"</li>
                <li>✗ Vague startup speak: "The future of..."</li>
                <li>✗ Overuse tagline without product specificity</li>
                <li>✗ Exclamation marks and emojis everywhere</li>
                <li>✗ "Join our community!" energy</li>
                <li>✗ Empty mood words without application</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Product Expression */}
        <div className="mb-16">
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Product Expression</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Do */}
            <div className="bg-[#09090B] border border-[#DB2777]/30 rounded-3xl p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#DB2777]" />
                <h3 className="text-white text-2xl font-bold">Do</h3>
              </div>
              <ul className="space-y-4 text-[#A1A1AA]">
                <li>✓ Lead with social proof and friend activity</li>
                <li>✓ Show anticipation and momentum</li>
                <li>✓ Make privacy feel confident, not paranoid</li>
                <li>✓ Feature "The Move" as a premium signal</li>
                <li>✓ Use real scenarios: "Your crew is here"</li>
                <li>✓ Selective, high-signal content</li>
                <li>✓ Avatar stacks showing your people</li>
              </ul>
            </div>

            {/* Don't */}
            <div className="bg-[#09090B] border border-[#27272A] rounded-3xl p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-2 h-2 rounded-full bg-[#52525b]" />
                <h3 className="text-white text-2xl font-bold">Don't</h3>
              </div>
              <ul className="space-y-4 text-[#71717A]">
                <li>✗ Generic event grids with no social context</li>
                <li>✗ Public check-ins or broadcast feeds</li>
                <li>✗ Ticketing/logistics as primary focus</li>
                <li>✗ Mass-market discovery algorithms</li>
                <li>✗ Noisy notifications or spam</li>
                <li>✗ Generic UI kit examples without Whozin context</li>
                <li>✗ Stock nightlife photography clichés</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Overall Brand Feel */}
        <div>
          <p className="text-[#71717A] text-sm mb-8 uppercase tracking-widest">Overall Brand Feel</p>
          
          {/* What makes it Whozin */}
          <div className="bg-gradient-to-br from-[#09090B] to-[#18181B] border border-[#DB2777]/30 rounded-3xl p-12 mb-8 relative overflow-hidden">
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] opacity-20"
              style={{ background: 'linear-gradient(135deg, #DB2777, #9333EA)' }}
            />
            <div className="relative z-10">
              <h3 className="text-white text-3xl font-bold mb-6">What makes it feel like Whozin</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[#A1A1AA]">
                <div>
                  <p className="mb-3">✓ Exclusive guest list meets modern social product</p>
                  <p className="mb-3">✓ Anticipation and social momentum</p>
                  <p className="mb-3">✓ Private confidence, not public broadcasting</p>
                  <p className="mb-3">✓ Nightlife-native without being trashy</p>
                </div>
                <div>
                  <p className="mb-3">✓ Premium but accessible and warm</p>
                  <p className="mb-3">✓ Culturally aware and in-the-know</p>
                  <p className="mb-3">✓ Social proof driving every decision</p>
                  <p className="mb-3">✓ High-signal, selective, magnetic</p>
                </div>
              </div>
            </div>
          </div>

          {/* What makes it generic */}
          <div className="bg-[#09090B] border border-[#27272A] rounded-3xl p-12">
            <h3 className="text-white text-3xl font-bold mb-6">What makes it feel generic or off-brand</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[#71717A]">
              <div>
                <p className="mb-3">✗ Template startup deck energy</p>
                <p className="mb-3">✗ Overdesigned or trying too hard</p>
                <p className="mb-3">✗ Rainbow colors with no hierarchy</p>
                <p className="mb-3">✗ Lorem ipsum or "Primary CTA" filler</p>
              </div>
              <div>
                <p className="mb-3">✗ Generic event marketplace vibes</p>
                <p className="mb-3">✗ Loud, chaotic, juvenile aesthetics</p>
                <p className="mb-3">✗ Copy that repeats taglines without product context</p>
                <p className="mb-3">✗ Anything that feels crypto, gamer, or Figma template</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
