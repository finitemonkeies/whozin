export function BrandSystemSpec() {
  // Canonical W - use everywhere
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
          <h1 className="text-white text-6xl font-bold tracking-tight mb-6">Brand System Spec</h1>
          <p className="text-[#A1A1AA] text-xl max-w-3xl">
            Implementation-ready guidance for applying Whozin branding in product, marketing, and social contexts.
          </p>
        </div>

        {/* Logo Usage */}
        <div className="mb-20">
          <h2 className="text-white text-3xl font-bold mb-8">Logo Usage</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* App Icon */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <div className="flex justify-center mb-6">
                <div
                  className="w-32 h-32 rounded-[28px] flex items-center justify-center shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)',
                    boxShadow: '0 24px 48px rgba(219, 39, 119, 0.5)'
                  }}
                >
                  <WhozinW className="w-20 h-20 text-white" />
                </div>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">App Icon</h3>
              <p className="text-[#71717A] text-sm mb-4">iOS/Android home screen</p>
              <div className="space-y-1.5 text-xs bg-[#18181B] rounded-xl p-4">
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Gradient:</span> 135° #EC4899 → #A855F7 → #9333EA</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Corner:</span> 22% radius</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Sizes:</span> 1024×1024 master, auto-scaled</p>
              </div>
            </div>

            {/* In-App Header */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <div className="flex justify-center items-center mb-6 gap-3 bg-[#0A0A0A] rounded-xl py-4">
                <div
                  className="w-10 h-10 rounded-[11px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)'
                  }}
                >
                  <WhozinW className="w-6 h-6 text-white" />
                </div>
                <span className="text-white text-xl font-bold">Whozin</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Navigation Logo</h3>
              <p className="text-[#71717A] text-sm mb-4">Top nav, headers, in-app</p>
              <div className="space-y-1.5 text-xs bg-[#18181B] rounded-xl p-4">
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Height:</span> 40px (icon + text)</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Clear space:</span> 16px all sides</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Use:</span> Horizontal lockup</p>
              </div>
            </div>

            {/* Splash/Onboarding */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <div className="flex flex-col items-center gap-4 bg-[#0A0A0A] rounded-xl py-6 mb-6">
                <div
                  className="w-24 h-24 rounded-[20px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)',
                    boxShadow: '0 20px 40px rgba(219, 39, 119, 0.4)'
                  }}
                >
                  <WhozinW className="w-14 h-14 text-white" />
                </div>
                <span className="text-white text-3xl font-bold">Whozin</span>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Splash/Welcome</h3>
              <p className="text-[#71717A] text-sm mb-4">Onboarding, welcome screens</p>
              <div className="space-y-1.5 text-xs bg-[#18181B] rounded-xl p-4">
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Layout:</span> Stacked lockup</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Icon size:</span> 96-128px</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Use:</span> With ambient glow on dark bg</p>
              </div>
            </div>

            {/* Favicon/Small */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <div className="flex justify-center mb-6 gap-4">
                <div
                  className="w-12 h-12 rounded-[10px] flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)'
                  }}
                >
                  <WhozinW className="w-7 h-7 text-white" />
                </div>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)'
                  }}
                >
                  <WhozinW className="w-5 h-5 text-white" />
                </div>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Favicon/Avatar</h3>
              <p className="text-[#71717A] text-sm mb-4">Browser, social avatar</p>
              <div className="space-y-1.5 text-xs bg-[#18181B] rounded-xl p-4">
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Min size:</span> 32×32px (web favicon)</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Use:</span> Icon only, no text</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Format:</span> .ico, .png, .svg</p>
              </div>
            </div>
          </div>
        </div>

        {/* Color System */}
        <div className="mb-20">
          <h2 className="text-white text-3xl font-bold mb-8">Color System</h2>
          
          <div className="grid grid-cols-1 gap-6">
            {/* Brand Gradient */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <div className="flex items-center gap-8 mb-6">
                <div
                  className="flex-1 h-24 rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #9333EA 100%)'
                  }}
                />
                <div className="flex-shrink-0">
                  <h3 className="text-white font-bold text-lg mb-2">Primary Gradient</h3>
                  <p className="text-[#71717A] text-sm mb-3">App icon, CTAs, premium moments</p>
                  <div className="space-y-1 text-xs font-mono">
                    <p className="text-[#A1A1AA]">linear-gradient(135deg, ...)</p>
                    <p className="text-[#EC4899]">#EC4899 → <span className="text-[#A855F7]">#A855F7</span> → <span className="text-[#9333EA]">#9333EA</span></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Surface Colors */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <h3 className="text-white font-bold text-lg mb-6">Surface Hierarchy</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { name: 'App BG', hex: '#0A0A0A', desc: 'Main background' },
                  { name: 'Card', hex: '#18181B', desc: 'Elevated surface' },
                  { name: 'Border', hex: '#27272A', desc: 'Subtle dividers' },
                  { name: 'Border Active', hex: '#3F3F46', desc: 'Interactive states' },
                ].map((color) => (
                  <div key={color.hex} className="text-center">
                    <div
                      className="w-full h-20 rounded-xl mb-3 border border-[#27272A]"
                      style={{ background: color.hex }}
                    />
                    <p className="text-white text-sm font-bold mb-1">{color.name}</p>
                    <p className="text-[#71717A] text-xs font-mono mb-1">{color.hex}</p>
                    <p className="text-[#52525b] text-xs">{color.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Text Colors */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <h3 className="text-white font-bold text-lg mb-6">Text Hierarchy</h3>
              <div className="space-y-4">
                {[
                  { name: 'Primary', hex: '#FFFFFF', example: 'Main headlines, body text, key actions' },
                  { name: 'Secondary', hex: '#A1A1AA', example: 'Supporting copy, descriptions' },
                  { name: 'Tertiary', hex: '#71717A', example: 'Labels, metadata, timestamps' },
                  { name: 'Disabled', hex: '#52525B', example: 'Inactive states, muted text' },
                ].map((color) => (
                  <div key={color.hex} className="flex items-center gap-4 bg-[#0A0A0A] rounded-xl p-4">
                    <div
                      className="w-12 h-12 rounded-lg flex-shrink-0"
                      style={{ background: color.hex }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <p className="text-white font-bold">{color.name}</p>
                        <code className="text-[#71717A] text-xs font-mono">{color.hex}</code>
                      </div>
                      <p className="text-[#71717A] text-sm">{color.example}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA System */}
        <div className="mb-20">
          <h2 className="text-white text-3xl font-bold mb-8">CTA System</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Primary CTA */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <button
                className="w-full py-4 rounded-xl text-white font-bold text-base mb-6"
                style={{
                  background: 'linear-gradient(to right, #DB2777, #9333EA)'
                }}
              >
                I'm going
              </button>
              <h3 className="text-white font-bold text-lg mb-2">Primary CTA</h3>
              <p className="text-[#71717A] text-sm mb-4">Main actions: RSVP, confirm, submit</p>
              <div className="space-y-1.5 text-xs bg-[#18181B] rounded-xl p-4">
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Gradient:</span> left to right #DB2777 → #9333EA</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Text:</span> #FFFFFF, bold</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Corner:</span> 12px radius</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Height:</span> 48-56px</p>
              </div>
            </div>

            {/* Secondary CTA */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <button className="w-full py-4 rounded-xl text-[#A1A1AA] font-bold text-base mb-6 bg-[#27272A] border border-[#3F3F46]">
                Interested
              </button>
              <h3 className="text-white font-bold text-lg mb-2">Secondary CTA</h3>
              <p className="text-[#71717A] text-sm mb-4">Alternative actions: maybe, later, skip</p>
              <div className="space-y-1.5 text-xs bg-[#18181B] rounded-xl p-4">
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Background:</span> #27272A</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Border:</span> 1px #3F3F46</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Text:</span> #A1A1AA, bold</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Hover:</span> bg #3F3F46</p>
              </div>
            </div>

            {/* Badge: The Move */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <div className="flex justify-center mb-6">
                <div
                  className="px-5 py-2.5 rounded-full"
                  style={{
                    background: 'linear-gradient(to right, #DB2777, #9333EA)'
                  }}
                >
                  <span className="text-white text-sm font-bold tracking-wide uppercase">The Move</span>
                </div>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Premium Badge</h3>
              <p className="text-[#71717A] text-sm mb-4">High-signal moments</p>
              <div className="space-y-1.5 text-xs bg-[#18181B] rounded-xl p-4">
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Use for:</span> "The Move" notifications</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Gradient:</span> Same as primary CTA</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Text:</span> Uppercase, tracked, bold</p>
              </div>
            </div>

            {/* Subtle Badge */}
            <div className="bg-[#09090B] border border-[#18181B] rounded-2xl p-8">
              <div className="flex justify-center mb-6">
                <div className="px-5 py-2.5 bg-[#27272A] border border-[#3F3F46] rounded-full">
                  <span className="text-[#A1A1AA] text-sm tracking-wide uppercase">Private by default</span>
                </div>
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Subtle Badge</h3>
              <p className="text-[#71717A] text-sm mb-4">Metadata, status, labels</p>
              <div className="space-y-1.5 text-xs bg-[#18181B] rounded-xl p-4">
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Background:</span> #27272A</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Border:</span> Optional 1px #3F3F46</p>
                <p className="text-[#A1A1AA]"><span className="text-white font-mono">Text:</span> #A1A1AA or #71717A</p>
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Quick Reference */}
        <div>
          <h2 className="text-white text-3xl font-bold mb-8">Quick Reference</h2>
          
          <div className="bg-gradient-to-br from-[#09090B] to-[#000000] border border-[#18181B] rounded-3xl p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">App Icon</h3>
                  <div className="text-[#A1A1AA] text-sm space-y-1">
                    <p>• 1024×1024 master file</p>
                    <p>• 135° gradient: #EC4899 → #A855F7 → #9333EA</p>
                    <p>• 22% corner radius</p>
                    <p>• W glyph centered, white fill</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">In-App Logo</h3>
                  <div className="text-[#A1A1AA] text-sm space-y-1">
                    <p>• Horizontal lockup in nav (40px height)</p>
                    <p>• Stacked lockup for splash (96-128px icon)</p>
                    <p>• 16px clear space minimum</p>
                    <p>• White on dark or gradient on dark</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">Primary CTA</h3>
                  <div className="text-[#A1A1AA] text-sm space-y-1">
                    <p>• Gradient: left to right #DB2777 → #9333EA</p>
                    <p>• White text, bold weight</p>
                    <p>• 48-56px height, 12px corner radius</p>
                    <p>• Use for main actions only</p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">Color Palette</h3>
                  <div className="text-[#A1A1AA] text-sm space-y-1">
                    <p>• Background: #0A0A0A</p>
                    <p>• Cards: #18181B</p>
                    <p>• Borders: #27272A / #3F3F46</p>
                    <p>• Text: #FFFFFF / #A1A1AA / #71717A</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">Social Assets</h3>
                  <div className="text-[#A1A1AA] text-sm space-y-1">
                    <p>• OG card: 1200×630, dark bg, asymmetric</p>
                    <p>• Story: 1080×1920, vertical lockup</p>
                    <p>• Square: 1080×1080, logo top-left</p>
                    <p>• Always show social proof</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold text-sm mb-3 uppercase tracking-wider">Key Copy</h3>
                  <div className="text-[#A1A1AA] text-sm space-y-1">
                    <p>• "See who's going before you go."</p>
                    <p>• "12 friends are going."</p>
                    <p>• "Your crew is here."</p>
                    <p>• "Private by default."</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-[#27272A]">
              <p className="text-[#71717A] text-sm leading-relaxed">
                <span className="text-white font-bold">Implementation note:</span> This brand system is optimized for dark interfaces. 
                Always use the canonical W glyph from the logo system. Apply the primary gradient sparingly for premium moments. 
                Keep backgrounds dark (#0A0A0A), surfaces subtle (#18181B), and text hierarchy clear (white → gray → muted).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
