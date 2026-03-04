export const ACTIVITY_POINTS = {
  running: { perKm: 2, perEvent: 10 },
  cycling: { perKm: 1, perEvent: 10 },
  swimming: { perKm: 5, perEvent: 10 },
  hiking: { perKm: 1.5, perEvent: 8 },
  crossfit: { perMin: 0.5, perEvent: 8 },
  padel: { win: 15, loss: 5, perEvent: 6 },
  tennis: { win: 15, loss: 5, perEvent: 6 },
  yoga: { perMin: 0.3, perEvent: 5 },
}

export const BADGES = [
  { id: "first_event", name: "First Steps", emoji: "👟", description: "Attended your first event" },
  { id: "five_events", name: "Getting Going", emoji: "🔥", description: "Attended 5 events" },
  { id: "ten_events", name: "Dedicated", emoji: "💪", description: "Attended 10 events" },
  { id: "first_win", name: "Winner", emoji: "🏆", description: "Won your first match" },
  { id: "five_wins", name: "On a Roll", emoji: "🎯", description: "Won 5 matches" },
  { id: "explorer", name: "Explorer", emoji: "🌍", description: "Attended events in 3+ locations" },
  { id: "streaker", name: "Streaker", emoji: "📅", description: "Active 4 weeks in a row" },
  { id: "all_rounder", name: "All-Rounder", emoji: "⭐", description: "Tried 3+ different activities" },
]

export const LEVELS = [
  { name: "Bronze", emoji: "🥉", min: 0, max: 99 },
  { name: "Silver", emoji: "🥈", min: 100, max: 299 },
  { name: "Gold", emoji: "🥇", min: 300, max: 599 },
  { name: "Diamond", emoji: "💎", min: 600, max: Infinity },
]

export function getLevel(points: number) {
  return LEVELS.find(l => points >= l.min && points <= l.max) ?? LEVELS[0]
}

export function calculateActivityPoints(
  activityType: string,
  logType: "event" | "manual" | "match_win" | "match_loss",
  distance?: number,
  durationMins?: number
): number {
  const config = ACTIVITY_POINTS[activityType as keyof typeof ACTIVITY_POINTS]
  if (!config) return 5

  if (logType === "event") return (config as any).perEvent ?? 5
  if (logType === "match_win") return (config as any).win ?? 15
  if (logType === "match_loss") return (config as any).loss ?? 5
  if (logType === "manual") {
    if (distance && (config as any).perKm) return Math.round(distance * (config as any).perKm)
    if (durationMins && (config as any).perMin) return Math.round(durationMins * (config as any).perMin)
  }
  return 5
}

export function getCurrentWeek(): string {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 1)
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
  return `${now.getFullYear()}-W${week}`
}

export function getCurrentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function getCurrentYear(): string {
  return String(new Date().getFullYear())
}

