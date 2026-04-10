Below is a **complete replacement implementation** of the Anticipation Algorithm that fits the architecture we discussed. It is **stronger than the original** because it:

* Uses **event tags instead of weak title matching**
* Uses **event importance**
* Uses **market stagnation detection**
* Scores opportunities instead of just flagging flat markets
* Returns **WATCHLIST opportunities instead of forcing trades**
* Works with your **normalized market structure**

You can replace your existing anticipation file with this.

Suggested path in your project:

```
src/algorithms/algorithm11_event_anticipation/detectAnticipation.ts
```

---

# Full Anticipation Algorithm Code

```ts
/**
 * Algorithm 11 — Event Anticipation Engine
 *
 * Purpose:
 * Detect markets that may produce structural distortions ahead of scheduled events.
 *
 * This algorithm does NOT directly produce trades.
 * Instead it produces WATCHLIST signals for markets likely to move soon.
 *
 * Works best for:
 * - CPI releases
 * - Fed meetings
 * - Elections
 * - Crypto launches
 * - Weather reports
 */

export interface CalendarEvent {
  name: string
  timestamp: number
  type?: string
  importance?: "LOW" | "MEDIUM" | "HIGH"
  tags?: string[]
}

export interface MarketOutcome {
  price: number
  history?: number[] // optional historical price snapshots
}

export interface Market {
  id: string
  question?: string
  title?: string
  resolutionDate?: string
  outcomes: MarketOutcome[]
  volume?: number
  tags?: string[]
}

export interface EventGroup {
  id: string
  title?: string
  markets: Market[]
  tags?: string[]
}

export interface AnticipationResult {
  type: "ANTICIPATION_WATCHLIST"
  score: number
  priority: "HIGH" | "MEDIUM" | "LOW"
  calendarEvent: string
  eventGroup: string
  market: string
  daysToEvent: number
  reason: string
}

interface Options {
  anticipationWindowDays?: number
  stagnationThreshold?: number
  debug?: boolean
}

export function analyzeAnticipationOpportunities(
  events: EventGroup[],
  calendar: CalendarEvent[],
  options: Options = {}
): AnticipationResult[] {

  const results: AnticipationResult[] = []

  const anticipationWindowDays = options.anticipationWindowDays ?? 7
  const stagnationThreshold = options.stagnationThreshold ?? 0.03
  const debug = options.debug ?? false

  const now = Date.now()
  const windowEnd = now + anticipationWindowDays * 86400000

  const upcomingEvents = calendar.filter(
    (e) => e.timestamp > now && e.timestamp <= windowEnd
  )

  for (const calEvent of upcomingEvents) {

    const daysToEvent = Math.round(
      (calEvent.timestamp - now) / 86400000
    )

    const importanceScore = getEventImportanceScore(calEvent.importance)

    for (const eventGroup of events) {

      if (!isEventRelevant(eventGroup, calEvent)) continue

      for (const market of eventGroup.markets) {

        const stagnationScore = detectMarketStagnation(
          market,
          stagnationThreshold
        )

        const proximityScore = calculateProximityScore(daysToEvent)

        const totalScore =
          importanceScore * 0.4 +
          stagnationScore * 0.4 +
          proximityScore * 0.2

        if (totalScore < 50) continue

        results.push({
          type: "ANTICIPATION_WATCHLIST",
          score: Math.round(totalScore),
          priority: getPriority(totalScore),
          calendarEvent: calEvent.name,
          eventGroup: eventGroup.title || eventGroup.id,
          market: market.question || market.id,
          daysToEvent,
          reason: buildReason(calEvent, stagnationScore, proximityScore)
        })
      }
    }
  }

  if (debug && results.length === 0) {
    console.log("No anticipation signals detected.")
  }

  return results.sort((a, b) => b.score - a.score)
}


/**
 * Event importance scoring
 */
function getEventImportanceScore(
  importance?: "LOW" | "MEDIUM" | "HIGH"
): number {

  switch (importance) {
    case "HIGH":
      return 100
    case "MEDIUM":
      return 70
    case "LOW":
      return 40
    default:
      return 50
  }
}


/**
 * Detect if a market is stagnating
 * (price not moving despite upcoming catalyst)
 */
function detectMarketStagnation(
  market: Market,
  threshold: number
): number {

  if (!market.outcomes || market.outcomes.length < 2) return 0

  let totalMovement = 0
  let samples = 0

  for (const outcome of market.outcomes) {

    if (!outcome.history || outcome.history.length < 2) continue

    const oldest = outcome.history[0]
    const latest = outcome.history[outcome.history.length - 1]

    totalMovement += Math.abs(latest - oldest)
    samples++
  }

  if (samples === 0) return 50

  const avgMovement = totalMovement / samples

  if (avgMovement < threshold) {
    return 100
  }

  if (avgMovement < threshold * 2) {
    return 60
  }

  return 20
}


/**
 * Score based on how close the event is
 */
function calculateProximityScore(days: number): number {

  if (days <= 1) return 100
  if (days <= 3) return 80
  if (days <= 5) return 60
  if (days <= 7) return 40

  return 20
}


/**
 * Match markets to events using tags
 */
function isEventRelevant(
  eventGroup: EventGroup,
  calendarEvent: CalendarEvent
): boolean {

  if (!calendarEvent.tags || calendarEvent.tags.length === 0) return false

  const marketTags = [
    ...(eventGroup.tags || []),
    ...(eventGroup.title ? [eventGroup.title.toLowerCase()] : [])
  ]

  for (const tag of calendarEvent.tags) {
    if (marketTags.some((t) => t.includes(tag))) {
      return true
    }
  }

  return false
}


/**
 * Convert score to priority level
 */
function getPriority(score: number): "HIGH" | "MEDIUM" | "LOW" {

  if (score >= 80) return "HIGH"
  if (score >= 65) return "MEDIUM"
  return "LOW"
}


/**
 * Build explanation message
 */
function buildReason(
  event: CalendarEvent,
  stagnationScore: number,
  proximityScore: number
): string {

  const stagnation =
    stagnationScore > 80
      ? "market showing stagnation"
      : "moderate stagnation"

  const proximity =
    proximityScore > 80
      ? "event imminent"
      : "event approaching"

  return `${stagnation} ahead of ${event.name} (${proximity})`
}
```

---

# What this new version improves

Your old code only did:

```
flat odds → opportunity
```

This new version evaluates:

```
event importance
+ event proximity
+ market stagnation
= anticipation score
```

So output now looks like:

```
ANTICIPATION WATCHLIST
Score: 86
Event: US CPI Release
Market: Inflation above 3.2%
Reason: market showing stagnation ahead of CPI release (event imminent)
```

This is **far more useful than the previous algorithm**.

---

# How this fits your scanner

The scanner flow becomes:

```
scan markets
↓
run structural algorithms
↓
run anticipation engine
↓
add watchlist markets
↓
score signals
↓
display results
```

Important:

**Anticipation does not produce trades by itself.**

It tells the system:

```
focus attention here
distortion likely soon
```

---

# Recommended calendar format

Example economic calendar input:

```ts
const calendar = [
  {
    name: "US CPI Release",
    timestamp: 1781203200000,
    importance: "HIGH",
    tags: ["inflation", "cpi", "fed"]
  },
  {
    name: "FOMC Meeting",
    timestamp: 1781808000000,
    importance: "HIGH",
    tags: ["fed", "rates", "interest"]
  }
]
```

---

# Next improvement (very powerful)

Once this algorithm is working, the **next major upgrade** would be:

**Anticipation + Structural Trigger Engine**

Meaning:

```
event approaching
+
DDS spike appears
+
ladder distortion appears
```

That combination produces **very strong signals**.

This is how many professional trading systems operate.

---

If you'd like, the next thing I can show you is **the event calendar system that feeds this algorithm automatically (CPI, Fed, elections, crypto unlocks, weather reports)** so you never have to manually input events.
Good — this is the **next major piece of infrastructure** your system needs.

Right now your anticipation algorithm requires **manual calendar input** like:

```ts
const calendar = [
 { name: "US CPI Release", timestamp: ..., importance: "HIGH", tags: ["cpi","inflation"] }
]
```

But in a real system you want the calendar to **build itself automatically**.

So we create an **Event Calendar Engine**.

This engine continuously gathers scheduled events from multiple domains:

```text
economic events
crypto events
political events
weather forecasts
token unlocks
earnings releases
```

Then it feeds those events directly into your **Anticipation Algorithm**.

---

# 1. New System Component

Add a new module to your architecture:

```text
src/events/calendarEngine/
```

Example structure:

```text
src/events/
   calendarEngine/
       fetchEconomicCalendar.ts
       fetchCryptoCalendar.ts
       fetchWeatherCalendar.ts
       fetchPoliticalCalendar.ts
       mergeCalendars.ts
       normalizeEvent.ts
       index.ts
```

This module produces **one unified event list**.

---

# 2. Event Object Standard

All events must be normalized to one format.

Example normalized event:

```ts
{
  name: "US CPI Release",
  timestamp: 1781203200000,
  importance: "HIGH",
  type: "macro",
  tags: ["inflation","cpi","fed"]
}
```

Another example:

```ts
{
  name: "Ethereum Shanghai Upgrade",
  timestamp: 1781550000000,
  importance: "HIGH",
  type: "crypto",
  tags: ["ethereum","upgrade"]
}
```

Another:

```ts
{
  name: "US Presidential Debate",
  timestamp: 1781808000000,
  importance: "HIGH",
  type: "politics",
  tags: ["election","debate"]
}
```

All algorithms read the **same structure**.

---

# 3. Calendar Engine Core File

Create this file:

```text
src/events/calendarEngine/index.ts
```

Code:

```ts
export async function loadEventCalendar() {

  const economic = await fetchEconomicCalendar()
  const crypto = await fetchCryptoCalendar()
  const weather = await fetchWeatherCalendar()
  const political = await fetchPoliticalCalendar()

  const allEvents = [
    ...economic,
    ...crypto,
    ...weather,
    ...political
  ]

  return normalizeEvents(allEvents)
}
```

This returns **one master calendar**.

---

# 4. Economic Calendar Loader

Create:

```text
src/events/calendarEngine/fetchEconomicCalendar.ts
```

Example basic version:

```ts
export async function fetchEconomicCalendar() {

  // simplified mock version
  // later replace with API sources

  const events = [
    {
      name: "US CPI Release",
      timestamp: Date.parse("2026-06-12T13:30:00Z"),
      importance: "HIGH",
      type: "macro",
      tags: ["inflation","cpi","fed"]
    },
    {
      name: "US Non-Farm Payrolls",
      timestamp: Date.parse("2026-06-05T13:30:00Z"),
      importance: "HIGH",
      type: "macro",
      tags: ["jobs","employment"]
    },
    {
      name: "FOMC Interest Rate Decision",
      timestamp: Date.parse("2026-06-18T18:00:00Z"),
      importance: "HIGH",
      type: "macro",
      tags: ["fed","rates"]
    }
  ]

  return events
}
```

Later you can connect to **real economic calendar APIs**.

---

# 5. Crypto Calendar Loader

Create:

```text
src/events/calendarEngine/fetchCryptoCalendar.ts
```

Example:

```ts
export async function fetchCryptoCalendar() {

  const events = [
    {
      name: "Ethereum Hard Fork",
      timestamp: Date.parse("2026-07-10T00:00:00Z"),
      importance: "HIGH",
      type: "crypto",
      tags: ["ethereum","upgrade"]
    },
    {
      name: "Bitcoin Halving Anniversary",
      timestamp: Date.parse("2026-04-20T00:00:00Z"),
      importance: "MEDIUM",
      type: "crypto",
      tags: ["bitcoin","halving"]
    }
  ]

  return events
}
```

Later this can pull from:

```text
token unlock APIs
crypto event trackers
protocol upgrade feeds
```

---

# 6. Weather Event Calendar

Weather markets often react to **forecast model updates**.

Create:

```text
src/events/calendarEngine/fetchWeatherCalendar.ts
```

Example:

```ts
export async function fetchWeatherCalendar() {

  const events = [
    {
      name: "NOAA Forecast Update",
      timestamp: Date.now() + 86400000,
      importance: "MEDIUM",
      type: "weather",
      tags: ["temperature","rain","forecast"]
    }
  ]

  return events
}
```

This will later help your scanner anticipate **Kalshi weather markets**.

---

# 7. Political Calendar

Create:

```text
src/events/calendarEngine/fetchPoliticalCalendar.ts
```

Example:

```ts
export async function fetchPoliticalCalendar() {

  const events = [
    {
      name: "US Presidential Debate",
      timestamp: Date.parse("2026-09-10T02:00:00Z"),
      importance: "HIGH",
      type: "politics",
      tags: ["election","debate"]
    }
  ]

  return events
}
```

---

# 8. Event Normalizer

Create:

```text
src/events/calendarEngine/normalizeEvent.ts
```

Code:

```ts
export function normalizeEvents(events: any[]) {

  return events.map(e => ({
    name: e.name,
    timestamp: e.timestamp,
    importance: e.importance || "MEDIUM",
    type: e.type || "general",
    tags: e.tags || []
  }))
}
```

---

# 9. Integrating with your scanner

Inside your scanner engine:

```ts
const calendar = await loadEventCalendar()

const anticipationSignals =
  analyzeAnticipationOpportunities(events, calendar)
```

Now your anticipation engine always has **fresh upcoming events**.

---

# 10. Full Flow of the System

Your engine now becomes:

```text
scan markets
↓
load event calendar
↓
run structural algorithms
↓
run anticipation algorithm
↓
merge signals
↓
rank opportunities
```

---

# 11. Why this is powerful

This system now understands:

```text
space → multiple exchanges
structure → market distortions
time → upcoming events
```

Few trading systems combine all three.

---

# 12. Future Upgrades

Later this calendar engine can ingest real sources like:

```text
economic calendars
crypto unlock trackers
weather forecast models
earnings calendars
geopolitical events
```

Your anticipation engine then becomes extremely powerful.

---

# 13. Important Insight

Your anticipation algorithm will become **much stronger once you add historical price snapshots**.

Then it can detect:

```text
major event tomorrow
+
market has not moved for 48h
+
liquidity present
=
strong anticipation signal
```

That is where real opportunities appear.

---

If you'd like, the next step I recommend is something extremely useful for your system:

**The Market Snapshot Engine** — the component that stores price history so your algorithms can detect:

* stagnation
* volatility compression
* structural shifts
* pre-event calm before market moves.
