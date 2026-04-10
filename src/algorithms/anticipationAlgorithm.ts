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