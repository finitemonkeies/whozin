# Whozin Brand Book

## Brand Snapshot

Whozin feels like a private nightlife signal layer, not a generic event marketplace. The product centers social momentum, selective access, and fast confidence: who is going, whether it is worth showing up, and how to move without friction.

Core impression:

- Dark, immersive, nightlife-native
- Social-first, not inventory-first
- High-signal, low-clutter
- Private by default
- Energetic without becoming chaotic

Suggested one-line brand summary:

**Whozin helps you see who is going before you go.**

## Brand Pillars

### 1. Social Proof First

The app consistently leads with people, not logistics. Friend counts, avatar stacks, "The Move" signals, and "See who's going" language should stay central in brand expressions.

### 2. Private Confidence

Whozin balances nightlife excitement with trust. Privacy reassurance is close to sign-up and onboarding moments, which makes the brand feel controlled rather than exposed.

### 3. Nightlife Energy

The visual system borrows from club posters, ticketing, neon haze, and late-night city glow. Gradients, blur, and saturated highlights create atmosphere without losing legibility.

### 4. One-Tap Momentum

Actions are designed to feel immediate: RSVP, Continue, Connect Gmail, Send magic link. Brand language should stay short, direct, and active.

## Audience Read

Primary audience:

- Social event-goers
- Concert, club, and festival audiences
- Friend groups coordinating loosely, not formally
- Users who want social context before committing

Secondary audience:

- Users with ticket-heavy inboxes
- People who value privacy and lightweight social discovery

## Personality

Whozin should sound:

- In-the-know
- Confident
- Warm
- Selective
- Lightly playful

Whozin should not sound:

- Corporate
- Over-explained
- Over-hyped
- Cringe, slang-heavy, or try-hard
- Generic "community platform"

## Voice And Messaging

### Voice Traits

- Short sentences
- Clear verbs
- Social framing
- Utility over adjectives
- Privacy reassurance when trust matters

### Messaging Formula

Best-performing pattern in the app today:

1. Lead with the social value
2. Follow with the action
3. Reduce anxiety with privacy or simplicity

Examples already aligned with the product:

- "See who's going."
- "Find Your People"
- "Discover events and see who is going."
- "Private by default. No public profile."
- "One quick setup."

### Copy Guidelines

Do:

- Use direct verbs like `See`, `Find`, `RSVP`, `Join`, `Connect`
- Keep headlines under 6 words when possible
- Use friend/circle/going language before feature language
- Make buttons feel decisive and immediate

Don't:

- Lead with technical features
- Use startup buzzwords like `platform`, `synergy`, `engagement`
- Sound overly promotional
- Overload screens with explanatory paragraphs

## Visual System

### Color Direction

The app is fundamentally dark-mode branded. Black and zinc neutrals create the stage; saturated pink, purple, blue, and occasional green provide momentum, status, and nightlife glow.

#### Core Neutrals

- `Black`: `#000000`
- `Near black / app shell`: `#09090b` to `#18181b`
- `Zinc 900`: `#18181b`
- `Zinc 800`: `#27272a`
- `Zinc 500`: `#71717a`
- `White`: `#ffffff`

Use neutrals for:

- Backgrounds
- Structural surfaces
- Secondary text
- Borders

#### Signature Accent Pair

- `Hot pink`: `#db2777`
- `Electric purple`: `#9333ea`

These two colors define the primary Whozin look and are the main CTA gradient across onboarding, auth, RSVP, and hero surfaces.

Preferred gradient:

```css
linear-gradient(to right, #db2777, #9333ea)
```

#### Supporting Accents

- `Signal blue`: `#3b82f6`
- `Violet`: `#a855f7`
- `Success green`: `#22c55e`
- `Rose`: `#f43f5e`
- `Orange`: `#f97316`

Use supporting accents sparingly:

- Blue for desktop/web highlights and alternate energy
- Green for confirmed RSVP/success states
- Rose/orange for poster-style fallback art

### Color Ratios

Recommended balance:

- 75% deep neutral field
- 15% soft neutral overlays and borders
- 10% saturated accents

The brand works because color appears as a controlled burst, not full-screen noise.

## Typography

### Current State

The current app uses a clean sans-serif stack via `font-sans`, but no custom branded font is defined in [`/C:/Users/jvinc/Desktop/Whozin/src/styles/fonts.css`](C:\Users\jvinc\Desktop\Whozin\src\styles\fonts.css). In practice, the tone comes more from weight, spacing, and contrast than from a distinctive typeface.

### Typography Character

- Bold, compact headlines
- Clean sans body copy
- Tight tracking on large headlines
- Wide tracking for micro-labels and status tags

### Type Rules

- Headlines: bold, tight, high-contrast
- Body: simple and quiet
- Eyebrows and badges: uppercase with generous letter spacing
- Buttons: semibold to bold, short labels

### Recommendation

If you want to formalize the brand later, choose one expressive sans for headlines and one neutral sans for UI. Until then, preserve the current pattern:

- Headline feel: bold and tight
- UI feel: plain, modern, readable

## Shape Language

Whozin uses soft, modern geometry with generous rounding.

Key radii in the product:

- Default token radius: `10px`
- Frequent component radius: `16px`
- Large cards and modals: `24px` to `28px`
- Pills and badges: full rounded

Interpretation:

- Rounded, but not bubbly
- Premium, not cute
- Soft enough for consumer social
- Structured enough for utility

## Surfaces And Materials

The app uses layered dark surfaces instead of flat blocks.

Common surface treatments:

- `bg-zinc-900/55`
- `bg-black/80`
- `border-white/10`
- `backdrop-blur-xl`
- radial glow behind hero areas

Material feel:

- Frosted glass
- Smoked acrylic
- Poster-over-black
- Neon haze behind content

Surface rules:

- Keep borders subtle and translucent
- Use blur and glow to create depth
- Avoid bright full-opacity panels
- Let atmosphere sit behind utility

## Imagery

### Real Art Direction

Event art, artist photography, and venue imagery should feel:

- Dark or high contrast
- Atmospheric
- Performance-led
- Socially charged

### Fallback Art Direction

When event art is missing, the app already uses a strong substitute language:

- Angular nightlife gradients
- Grid overlays
- Orb glows
- Label chips
- Poster-like framing

That fallback style is not a placeholder accident. It is part of the brand system.

## Iconography

The app uses lightweight line icons from Lucide. This fits the product because icons support the interface instead of dominating it.

Best-fit icon traits:

- Simple stroke icons
- Small sizes
- Used alongside text, not alone for meaning
- Secondary to social proof and copy

## Motion

Motion is restrained and purposeful.

Current patterns:

- Fade and rise for hero content
- Slight scale-in on entry
- Hover lift on cards
- Glow changes on primary actions
- Transition-heavy but not playful-bouncy

Motion principles:

- Smooth, not springy
- Fast enough to feel responsive
- Slight elevation on hover
- Strongest motion reserved for first-impression moments

## Core Components

### Primary CTA

Style:

- Pink to purple gradient
- White text
- Rounded 2xl or pill silhouette
- Soft glow shadow

Role:

- Sign in
- Continue
- RSVP
- Core conversion moments

### Secondary CTA

Style:

- Dark zinc surface
- Subtle border
- White text

Role:

- Alternative auth paths
- Secondary actions
- Utility controls

### Social Card

Signature traits:

- Dark translucent card
- White headline
- Muted metadata
- Avatar stack or social count
- Clear primary action
- Slight hover lift

### Signal Badge

`The Move` badge is a strong sub-brand pattern. It makes Whozin feel editorial and predictive, not just transactional.

Traits:

- Pill badge
- Compact label
- Saturated accent wash
- Small icon
- Confident, short label

## Brand Do And Don't

### Do

- Lead with people and momentum
- Use dark fields with controlled accent glow
- Keep copy concise
- Use gradients as emphasis, not wallpaper
- Make privacy visible at moments of commitment
- Preserve the mix of exclusivity and usefulness

### Don't

- Turn the brand into a bright general-events app
- Use flat enterprise blues and grays as the main personality
- Crowd screens with long explanatory text
- Overuse more than two saturated accents at once
- Replace social proof with generic discovery language

## Experience Principles

When in doubt, Whozin should feel like:

- A trusted tip from your circle
- A backstage pass to social context
- A fast yes/no decision tool
- A private layer over nightlife behavior

It should not feel like:

- A public social network
- A general ticketing portal
- A productivity dashboard
- A meme-heavy Gen Z parody

## Suggested Taglines

- See who's going before you go.
- Find your people before the night starts.
- Know the move.
- Your circle, before the RSVP.
- Social proof for nights out.

## Art Direction Prompt

If you need a short prompt for marketing, deck, or visual exploration:

> Dark nightlife social app brand, black and zinc foundation, hot pink to electric purple gradients, subtle blue secondary glow, glassmorphism surfaces, blurred ambient light, premium club poster energy, privacy-first social discovery, bold sans headlines, minimal utility UI, high contrast, selective and confident tone.

## Source Notes

This brand book is inferred from the current shipped UI patterns in:

- [`/C:/Users/jvinc/Desktop/Whozin/src/app/App.tsx`](C:\Users\jvinc\Desktop\Whozin\src\app\App.tsx)
- [`/C:/Users/jvinc/Desktop/Whozin/src/app/pages/Onboarding.tsx`](C:\Users\jvinc\Desktop\Whozin\src\app\pages\Onboarding.tsx)
- [`/C:/Users/jvinc/Desktop/Whozin/src/app/pages/Welcome.tsx`](C:\Users\jvinc\Desktop\Whozin\src\app\pages\Welcome.tsx)
- [`/C:/Users/jvinc/Desktop/Whozin/src/app/pages/Login.tsx`](C:\Users\jvinc\Desktop\Whozin\src\app\pages\Login.tsx)
- [`/C:/Users/jvinc/Desktop/Whozin/src/app/pages/Home.tsx`](C:\Users\jvinc\Desktop\Whozin\src\app\pages\Home.tsx)
- [`/C:/Users/jvinc/Desktop/Whozin/src/app/components/EventCard.tsx`](C:\Users\jvinc\Desktop\Whozin\src\app\components\EventCard.tsx)
- [`/C:/Users/jvinc/Desktop/Whozin/src/app/components/TheMoveHero.tsx`](C:\Users\jvinc\Desktop\Whozin\src\app\components\TheMoveHero.tsx)
- [`/C:/Users/jvinc/Desktop/Whozin/src/app/components/TheMoveBadge.tsx`](C:\Users\jvinc\Desktop\Whozin\src\app\components\TheMoveBadge.tsx)
- [`/C:/Users/jvinc/Desktop/Whozin/src/app/desktop/Landing.tsx`](C:\Users\jvinc\Desktop\Whozin\src\app\desktop\Landing.tsx)
- [`/C:/Users/jvinc/Desktop/Whozin/src/styles/theme.css`](C:\Users\jvinc\Desktop\Whozin\src\styles\theme.css)

One notable gap: typography is not yet brand-owned in code, so the typography section above reflects visual behavior more than a locked font system.
