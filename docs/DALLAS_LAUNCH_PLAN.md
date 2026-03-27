# Dallas Launch Plan

Date: March 26, 2026

## Recommendation

Dallas is a credible next city if the launch is treated as a tight wedge, not a broad Texas rollout.

Your advantage is not "Dallas" in the abstract.
Your advantage is that you are already more embedded in the Dallas music scene than in most other expansion markets.

That matters because Whozin only works when:

- the same people overlap around the same nights
- a handful of connectors create visible social proof
- founder outreach can shape where early density forms

Dallas should come online only if we launch around one dense music-native scene first and let the city expand outward from there.

## Why Dallas Makes Sense

- Founder distribution is stronger there than in a cold-start city.
- Music scenes already coordinate through social proof, group chats, lineups, and "where is everyone actually going?" behavior.
- Dallas-Fort Worth is large enough to matter, but fragmented enough that Whozin needs a narrower wedge before trying to cover everything.

That means Dallas is a good expansion city, but a bad "list every event in DFW" city at launch.

## Recommended Wedge

Start with one overlapping lane:

- Dallas electronic / nightlife core
- promoter, DJ, photographer, and crew-anchor networks
- one to two neighborhoods or venue clusters that already share people

Do not start with all of:

- Dallas plus Fort Worth at once
- every genre
- generic live music
- broad consumer discovery

If your real edge is more specific than "music scene," narrow further. Examples:

- underground electronic and warehouse-adjacent nights
- club crossover crowd
- tastemaker-led promoter circuits
- artist / DJ friend graph around recurring parties

## Launch Thesis

The first Dallas version of Whozin should answer:

- What's the move tonight in Dallas?
- Which event already has my people on it?
- Which promoter, venue, or crew is actually pulling attendance?

The goal is not city coverage.
The goal is one dense Dallas event graph.

## 30-Day Dallas Targets

Use the same density logic as SF/Oakland:

- 100 to 200 total users inside one overlapping wedge
- 30 to 50 weekly active users
- 8 to 15 Dallas connectors
- 10+ events with visible attendee overlap
- 3 to 5 recurring event clusters where recognizable people stack on the same nights

If Dallas reaches 80 dense users, that is healthier than 300 scattered signups across DFW.

## Founder-Led Distribution Plan

### Tier 1: Dallas connectors

Prioritize:

- DJs
- promoters
- photographers
- nightlife regulars
- socially central friends who already decide where groups end up

Goal:

- onboard 10 to 15 first
- get each to invite 3 to 8 scene-relevant people

### Tier 2: crew anchors

These are people with one real friend group and repeat nightlife behavior.

Goal:

- get them to RSVP to one shared event
- get them to share one invite link into one real group chat

### Tier 3: partner-led nodes

Once the graph has life, bring in:

- one promoter collective
- one venue partner
- one recurring party series

## Dallas Launch Sequence

### Phase 1: private founder wedge

- Seed 20 to 30 Dallas events for the next 10 days
- Hand-invite 30 to 50 people you actually know or can reach warm
- Push them toward 3 to 5 anchor events
- Watch which events create recognizable overlap

### Phase 2: connector amplification

- Ask warm users who else should be on the app before the weekend
- Prioritize intros over cold blast posting
- Use screenshots of live Dallas social proof as your growth asset

### Phase 3: partner validation

- Once multiple Dallas events show visible density, pitch promoters and venues
- Sell Whozin as a social momentum layer, not another ticketing or listings app

## Event Supply Strategy For Dallas

At launch, Dallas needs reliable event coverage in the specific wedge you are targeting.

Best near-term approach:

- manual seeding for anchor events
- targeted ingestion for Dallas-native sources you trust
- promoter and venue pages that map to your actual scene

Do not wait for perfect ingestion to start the market.
But do not launch without enough event supply for the next 7 to 14 days.

## Repo Reality Check

The current codebase can store Dallas events today, but Dallas is not first-class yet.

What already works:

- event records already support arbitrary `city` values
- admin forms already accept cities like `Dallas, TX`
- email digest tooling already supports city filters

What is still Bay Area specific:

- `supabase/functions/sync-bay-area-events/index.ts`
- `scripts/sync-ra-playwright.mjs`
- `scripts/sync-shotgun-playwright.mjs`
- `src/lib/explorePersonalization.ts`
- `src/app/pages/Explore.tsx`
- `docs/30_DAY_GROWTH_PLAYBOOK.md`

Current Bay Area assumptions inside product behavior:

- Bay Area-only fallback recommendations
- Bay Area copy in Explore
- Bay Area city lists and city-matching hints
- ingestion defaults hardcoded to SF/Oakland and Bay Area sources

## Minimum Product Work Before Dallas Is Public

1. Replace Bay Area fallback logic with market-aware regional logic.
2. Move city lists and market hints into config instead of hardcoding them in recommendation and ingestion code.
3. Add a Dallas market config with:
   - supported cities
   - source pages
   - copy labels
   - fallback market scope text
4. Keep manual admin seeding available as the safety net.
5. Update weekly digest and ops docs to treat markets as reusable, not Bay Area only.

## Dallas Market Config To Add

Suggested first pass:

- primary city: `Dallas`
- optional expansion cities later: `Fort Worth`, `Plano`, `Irving`, `Denton`, `Arlington`
- market label in product: `Dallas` or `Dallas-Fort Worth`

Recommendation:

Use `Dallas` in the product before using `Dallas-Fort Worth`.
DFW is operationally true, but "Dallas" is simpler and tighter for a wedge launch.

## Suggested Dallas Source Map

Build this around your real scene map, not generic directories.

Start with:

- Resident Advisor Dallas pages if they meaningfully cover your wedge
- Shotgun Dallas venue or city pages if relevant
- Eventbrite organizer pages for trusted promoters
- venue calendars for recurring rooms
- manual admin events for anything socially important but hard to ingest

The right source list is whatever best captures the same events your early users already talk about.

## Risks

### Risk: Dallas is too broad

If you launch all of Dallas at once, the graph will look empty even if signups happen.

Mitigation:

- pick one wedge
- pick anchor events
- recruit crews, not individuals

### Risk: Fort Worth creates fragmentation too early

Mitigation:

- keep Fort Worth out of the initial wedge unless your real network overlaps heavily there

### Risk: event supply looks thin

Mitigation:

- seed manually every week
- only promise the scene you can actually cover

### Risk: cold users do not see familiar names

Mitigation:

- bias first 50 users toward socially central people
- direct users toward the same nights

## Recommended Decision

Yes, Dallas is worth bringing online next, but only as:

- a founder-led music-scene wedge
- a narrow Dallas launch first
- a small product/config refactor before wider promotion

The sequence should be:

1. Define the exact Dallas sub-scene.
2. Build the Dallas source and event seed list.
3. Refactor Bay Area assumptions into market config.
4. Soft launch Dallas privately.
5. Expand only after Dallas shows visible social density.

## Immediate Next Moves

This week:

- pick the exact Dallas wedge
- make a list of 40 to 60 Dallas people by connector / crew anchor / partner potential
- choose 10 to 15 anchor events for the next two weekends
- identify the top 5 to 10 Dallas source pages worth ingesting

In product:

- generalize Bay Area assumptions into market config
- add Dallas as the first non-Bay market
- keep Bay Area and Dallas side by side until one pattern clearly wins

## Bottom Line

Dallas is probably the right next market if you use your local music-scene edge to manufacture density fast.

Whozin should not expand to Dallas as a geography.
It should expand to Dallas as a socially overlapping nightlife graph.
