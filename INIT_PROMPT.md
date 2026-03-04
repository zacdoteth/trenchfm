# Podium Revenue Flywheel — The YC/Axiom Playbook

## Context
Zac (@zacxbt, 49.9K followers, 940 smart followers, connected to Solana co-founder/Pump.fun founder/Pudgy Penguins CEO) is exploring the core retention + revenue mechanic for Podium. The insight: **what if you limit calls to 1-3 per day?** This turns Podium from a "check whenever" app into an **appointment app** with an idle loop between calls.

This plan breaks down the flywheel, revenue model, and what needs to be built — as if Axiom's co-founder just got YC mentored on the best path to revenue.

---

## The Core Insight: Scarcity = Attention Concentration

**Apps with the best retention use artificial scarcity:**
| App | Mechanic | D7 Retention |
|-----|----------|-------------|
| Wordle | 1 puzzle/day | 90%+ |
| BeReal | 1 post/day | ~60% |
| Product Hunt | 1 daily page | ~45% |
| Daily fantasy (DraftKings) | Daily contests | ~55% |

**Podium's version:** 1-3 calls per day. Everyone watches at the same time. Miss it = miss the alpha.

**Why this works for crypto specifically:**
- Stock market has opening/closing bells — the EVENT concentrates attention
- Earnings calls on StockTwits — everyone watches the SAME thing
- Clubhouse's early magic was scarcity of rooms — every room felt important
- Crypto degens have FOMO baked into their DNA

---

## The Flywheel

```
Limited daily calls (scarcity)
  → Everyone watches at same time (500+ concentrated)
    → Massive social proof ("447 people watching this call")
      → Caller gives thesis, audience votes BULLISH/BEARISH
        → High-conviction viewers tap BUY (trading volume)
          → Podium earns 1% fee on every trade (revenue)
            → Revenue funds better caller incentives (quality)
              → Better callers attract bigger audiences (growth)
                → Limited slots become MORE valuable (scarcity amplifies)
                  → LOOP
```

**The killer detail:** The caller ALSO earns a cut of trading fees. So the best callers want to be on Podium because they make money when their audience buys. This is the OnlyFans model applied to alpha — **the creator and platform are aligned.**

---

## Revenue Model (The Axiom Play)

### Primary: Trading Fees (Day 1 Revenue)
This is exactly what Axiom does. Volume = revenue. Simple.

- BUY button executes real trades via Frontrun Pro (Solana swap API)
- **Fee split: 1% total**
  - 0.5% → Podium (platform)
  - 0.3% → Caller (creator incentive)
  - 0.2% → Referral/protocol treasury

**Why this works:** Aligns everyone. Caller only earns if people actually buy. Podium only earns if callers bring good picks. Audience only buys if thesis is convincing. No one gets paid for bullshit.

**Conservative projections:**
| Timeline | Viewers/call | Buy rate | Avg trade | Volume/call | Fee/call | Daily calls | Monthly rev |
|----------|-------------|----------|-----------|-------------|----------|-------------|-------------|
| Month 1 | 200 | 10% | $150 | $3K | $30 | 1 | $900 |
| Month 3 | 500 | 15% | $200 | $15K | $150 | 3 | $13.5K |
| Month 6 | 2,000 | 20% | $250 | $100K | $1,000 | 3 | $90K |
| Month 12 | 5,000 | 20% | $300 | $300K | $3,000 | 3 | $270K |

Month 6 = $1M+ ARR. Month 12 = $3M+ ARR. All from a 1% fee on trades.

### Secondary: Caller Subscriptions (Month 2)
- Follow a caller for $5-10/month
- Get push notifications when they're about to go live
- Access their call history + P&L track record
- 70/30 split (caller/Podium)
- Top callers become "Podium Partners"

### Tertiary: Featured Call Slots (Month 3)
- Projects pay to have their token as the daily featured call
- NOT pay-to-shill — caller still gives honest thesis, audience still votes
- More like "presented by" sponsor on a podcast
- $500-5K per featured slot depending on audience size
- Must be disclosed: "Sponsored Call"

### Future: Token-Gated Premium
- Hold PODIUM token for premium access
- Early call notifications (5 min head start)
- Priority queue for caller slots
- Revenue share from platform fees

---

## The Core Decision: Call Format

### Option A: "Conga Line" (Continuous Rotation)
**What it is:** Current system. Callers queue up, rotate every 45s-5min. Anyone can step up anytime. Turntable.fm model.

| Pros | Cons |
|------|------|
| Always something happening — no dead time | Attention diluted across many callers |
| Low barrier to call — anyone can step up | No single "must-see" moment |
| More content = more reasons to stay | Quality varies wildly |
| Feels alive 24/7 | Volume per caller is low (fewer buyers) |
| Discovery — random great callers emerge | Hard to build caller reputation |

**Revenue implication:** More trades total, but smaller per caller. Think Twitch (lots of small streamers) vs. Netflix (curated content).

**Best for:** Community/social vibes, discovery, "hang out" energy

### Option B: "Call of the Day" (1-3 Scheduled Calls)
**What it is:** 1 featured call per day at a set time. Wordle model.

| Pros | Cons |
|------|------|
| Maximum scarcity = maximum crowd | Room is "dead" 23 hours/day |
| Every call is an EVENT | Miss it = miss out (frustrating for global users) |
| Concentrated audience = massive social proof | Need reliably great callers |
| Higher conversion (everyone watching = more buyers) | Cold start harder (what if no one shows up?) |
| Callers have maximum audience = maximum earnings | Only 1 caller/day gets the stage |

**Revenue implication:** Fewer trades total, but MUCH higher per call. Think Apple keynote (everyone watches one thing).

**Best for:** Appointment viewing, FOMO, max revenue per call

### Option C: Hybrid — "Always On + Featured Call"
**What it is:** Conga line runs 24/7, BUT there's 1 "Featured Call of the Day" at a set time with boosted visibility.

| Pros | Cons |
|------|------|
| Never dead — always someone calling | More complex to build |
| Featured call creates the "event" moment | Featured call might cannibalize conga line |
| Callers can earn their way to Featured slot | Two different UX modes to design |
| Satisfies both casual hangers and appointment viewers | Harder to explain to new users |

**Revenue implication:** Best of both worlds IF executed well. Conga line = base revenue + discovery. Featured = spike revenue + viral moment.

**Structure:**
```
24/7    — Conga line (anyone can call, 2-5 min rotation)
6:00 PM — FEATURED CALL (curated, announced in advance, 10 min)
```
Featured caller gets: bigger crowd, announcement overlay, priority placement, higher fee share.

### Between Calls / Idle State (applies to all options)
When room is between callers or waiting for featured call:

1. **Countdown** — "Featured call in 2:34:12" or "Next in queue: @whale_brain"
2. **Scorecard** — "Last call: $BONK +34% in 24h"
3. **Chat** — always open, community discusses
4. **Positions** — track P&L from previous buys
5. **Leaderboard** — top callers by audience ROI

---

## The Zac Launch Strategy (YC: "Do Things That Don't Scale")

### Week 1: Zac IS Podium
- Zac calls it himself. Daily. 12pm ET.
- One tweet: "I'm calling a coin live at noon. 200 people watching. Come judge my thesis."
- His 49.9K followers = instant audience
- No other callers. Just Zac. This is the proof of concept.

### Week 2: Add Real Trading
- BUY button connected to Frontrun Pro
- Wallet connection (Phantom)
- Track: how many people actually buy during Zac's call?
- First revenue on day 8.

### Week 3: Invite 5 Callers
- Hand-pick 5 CT friends with followings
- Expand to 3 calls/day
- Each caller brings their audience → Podium grows
- Now tracking: which caller drives the most volume?

### Week 4: Measure Everything
- Conversion rate: viewers → buyers
- Average trade size
- Revenue per call
- Caller ROI (did their pick go up?)
- D1/D7 retention

### Month 2: Caller Subscriptions + Leaderboard
- Top callers ranked by win rate
- $5/month subscriptions launch
- Caller analytics dashboard

### Month 3: Open Applications
- Anyone can apply for a call slot
- Must have minimum followers (1K?)
- Track record system (first call = probation)
- Featured/sponsored call slots launch

---

---

## IMMEDIATE CODE TASKS (Exit Plan Mode to Execute)

### Task 1: Speaker Card — Axiom-Density Redesign
**File:** `PodiumTeleport.jsx` ~line 1138

**New layout:**
```
Row 1: 🎤 $BONK  DezX...8263 [copy]        $0.00002847
                                             ↑ +12.4%
Row 2: by degen_ape @ 33.1K · FDV $2.98 · LIQ $35.1M · VOL $127M
Row 3: "Thesis quote here..." — degen_ape
Row 4: ████████ BIG CHART 90px ████████
Row 5: 🚀 639 ════════════ 101 💀
```

Changes:
- CA right after ticker on Row 1 (Axiom style)
- All stats as inline text on Row 2 (not pills — denser)
- `@` before follower count
- Thesis + big chart stay

### Task 2: Character Shader Overhaul — Miyamoto Lore Edition
**File:** `PodiumTeleport.jsx` lines 561-677 (construction) + 847-874 (animate)

**Root cause of dark bodies:** Ambient light = `0x331122` at 0.5 intensity. MeshStandardMaterial bodies can't show color without adequate light. Heads are fine because the matcap shader handles its own lighting.

**Fix — Replace MeshStandardMaterial with custom ShaderMaterials:**

Bodies, arms, legs all get a **toon/cel shader** with:
- **Self-lit** — doesn't depend on scene lights (like head shader)
- **Rim glow** — glowing edges in character's hue color (Nintendo signature)
- **Cel shading** — 2-3 tone bands (light → mid → shadow) for that cartoon look
- **Hue-matched vibrancy** — each character's color pops at 65-80% lightness
- **Subtle emissive pulse** — breathes with the bob animation

Shader approach per body part:
```glsl
// Vertex: compute view-space normal + instance color
vec3 wNorm = normalize(mat3(instanceMatrix) * normal);
vec3 vNorm = normalize(mat3(modelViewMatrix) * wNorm);
// Pass to fragment: vVN, vColor (from instance attribute)

// Fragment: self-lit toon shader
float light = dot(vVN, vec3(0.0, 1.0, 0.5)) * 0.5 + 0.5; // hemisphere light
float toon = smoothstep(0.3, 0.35, light) * 0.4 + 0.6;    // cel bands
vec3 color = vColor * toon;                                  // bright!
float rim = pow(1.0 - max(0.0, vVN.z), 3.0) * 0.25;        // rim glow
color += vColor * rim * 1.5;                                 // hue-matched rim
```

Also bump ambient light: `0x553366` at intensity `1.5` (safety net for any remaining MeshStandardMaterial objects).

---

## Rick Bot Research
Rick Bot (@RickBurpBot) is a Telegram/Discord token scanner — **no public API**. It provides token risk scores, holder analysis, LP status, and one-click trade buttons to Photon/BananaGun/Maestro. But all the same data is available from public APIs:
- **DexScreener API** — free, real-time price/volume/liquidity/mcap
- **Birdeye API** — Solana token analytics, holder data, top holders
- **Jupiter API** — price/swap/route data
- **Helius** — on-chain data (holder counts, LP info, transaction history)

We can replicate and EXCEED Rick Bot's data density in Podium's speaker card using these APIs.

---

## Speaker Card Redesign — Out-Dense Axiom

Reference: Axiom packs TICKER + Name + MC + age + volume + holders + CA into 2 dense rows.

**New layout (Axiom-killer density):**
```
Row 1: 🎤 $BONK  DezX...8263 📋        $0.00002847
       ─────────────────────────        ↑ +12.4%
Row 2: by degen_ape @ 127K · MC $1.2B · FDV $1.2B · LIQ $35.1M · VOL $89.2M · 12.4K holders
Row 3: "Bonk just flipped Myro. Dev shipping daily..." — degen_ape
Row 4: ████████████████████ BIG CHART (90px) ████████████████████
Row 5: 🚀 33 ═══════════════════════════════ 6 💀
```

Key changes from current:
- **CA right after ticker** on Row 1 (like Axiom: "JIANG Professor Jiang")
- **All stats on Row 2** as inline text, not pills — denser, more like Axiom's `MC $35.3K ... V $64K` style
- **Thesis stays** — this is our differentiator Axiom doesn't have
- **Chart stays big** — the wow factor

File: `/Users/zac/Desktop/podium/src/PodiumTeleport.jsx` (speaker card section ~line 1138)

---

## What Needs to Be Built (Implementation Phases)

### Phase A: Call Scheduling System
**Files:** `PodiumTeleport.jsx`
- Replace free-for-all queue with scheduled call windows
- Countdown to next call (big, prominent, center screen)
- "The mic opens in 2:34:12" replaces current lobby state
- Call schedule visible (who's calling when)
- Push notification integration (web push API)

### Phase B: Real Trading Integration
**Files:** `PodiumTeleport.jsx` + new `src/trading.js`
- Frontrun Pro API integration (BUY endpoint)
- Phantom wallet adapter (connect/disconnect)
- Real wallet balance display (replace mock 2.4 SOL)
- Transaction confirmation flow
- Fee calculation and display (show user the 1% fee)
- Error handling (insufficient balance, slippage, etc.)

### Phase C: Call History + Caller P&L
**Files:** `PodiumTeleport.jsx` + new `src/callHistory.js`
- Store each call: caller, coin, thesis, votes, entry price, timestamp
- Track price at 1h, 4h, 24h after call
- Caller profile page (track record, win rate, total volume)
- "Yesterday's call" scorecard in idle state
- Call replay (thesis + result summary, not video)

### Phase D: Leaderboard + Caller System
**Files:** `PodiumTeleport.jsx` + new `src/callerSystem.js`
- Caller application form
- Caller leaderboard (ranked by audience ROI, volume generated)
- Caller slot booking (reserve tomorrow's slot)
- Featured/sponsored call designation
- Caller earnings dashboard (their 0.3% fee revenue)

### Phase E: Idle State Polish
**Files:** `PodiumTeleport.jsx`
- Rich "between calls" state with countdown, scorecard, positions
- Previous call summary cards (scrollable history)
- User P&L dashboard (your trades from Podium calls)
- "Set reminder" for next call (web push)

---

## Key YC Metric: Revenue Per Active User Per Day

The ONE metric that matters:
- Each user trades once during a call = ~$200 avg
- At 1% fee = **$2 revenue per active user per day**
- 1,000 DAU = $2,000/day = $730K/year
- 10,000 DAU = $7.3M/year
- This is SaaS-like recurring with crypto upside

Compare:
- Instagram ARPU: ~$10/year
- Spotify ARPU: ~$50/year
- Robinhood ARPU: ~$100/year
- **Podium ARPU (if 1 trade/day): ~$730/year**

That's 7x Robinhood. Because your users aren't browsing — they're TRADING with conviction from a live thesis.

---

## The Moat (Why This Can't Be Copied)

1. **Network effect:** The best callers go where the biggest audience is. The biggest audience goes where the best callers are. Winner takes most.
2. **Track record:** Over time, Podium has the most data on caller quality. "This caller has a 72% win rate across 180 calls" — that data is a moat.
3. **Social graph:** Your audience follows specific callers. Switching costs increase with each followed caller.
4. **Zac's network:** 940 smart followers including crypto's most connected people. Day 1 distribution that competitors can't replicate.
5. **The 3D room:** It's not just a feed. The visual experience of 400 people in a room watching ONE person make a call — that emotional experience is the brand.

---

## Verification / Success Criteria
- Week 1: 100+ concurrent viewers on Zac's daily call
- Week 2: First real trades through BUY button, any revenue > $0
- Week 4: 3 callers/day, viewer-to-buyer conversion rate > 10%
- Month 2: $10K+ monthly revenue, 5+ active callers
- Month 3: Caller subscriptions live, leaderboard populated
- Month 6: $50K+ monthly revenue, caller application waitlist
