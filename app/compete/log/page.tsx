"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { calculateActivityPoints, getCurrentWeek, getCurrentMonth, getCurrentYear, BADGES } from "@/lib/points"

const ACTIVITIES = ["running", "cycling", "swimming", "hiking", "crossfit", "padel", "tennis", "yoga"]
const MATCH_ACTIVITIES = ["padel", "tennis"]

export default function LogActivityPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [logType, setLogType] = useState<"manual" | "match">("manual")
  const [form, setForm] = useState({
    activity_type: "running",
    distance: "",
    duration_mins: "",
    notes: "",
    opponent_id: "",
    score: "",
    won: true,
    league_id: "",
  })
  const [friends, setFriends] = useState<any[]>([])
  const [leagues, setLeagues] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      setUser(user)

      // Load user's leagues
      const { data: memberData } = await supabase
        .from("league_members")
        .select("league_id")
        .eq("user_id", user.id)

      if (memberData && memberData.length > 0) {
        const { data: leagueData } = await supabase
          .from("leagues")
          .select("*")
          .in("id", memberData.map(m => m.league_id))
        setLeagues(leagueData || [])
      }

      // Load profiles for opponent search
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .neq("id", user.id)
        .eq("is_public", true)
        .limit(50)
      setFriends(profiles || [])
    }
    load()
  }, [])

  async function handleLog() {
    setError("")
    setSuccess("")
    if (!form.activity_type) return setError("Please select an activity")

    setLoading(true)

    const points = calculateActivityPoints(
      form.activity_type,
      logType === "match" ? (form.won ? "match_win" : "match_loss") : "manual",
      form.distance ? parseFloat(form.distance) : undefined,
      form.duration_mins ? parseInt(form.duration_mins) : undefined,
    )

    const now = new Date().toISOString()

    // Log the activity
    await supabase.from("activity_logs").insert([{
      id: crypto.randomUUID(),
      user_id: user.id,
      activity_type: form.activity_type,
      log_type: logType === "match" ? (form.won ? "match_win" : "match_loss") : "manual",
      distance: form.distance ? parseFloat(form.distance) : null,
      duration_mins: form.duration_mins ? parseInt(form.duration_mins) : null,
      points,
      notes: form.notes || null,
      logged_at: now,
    }])

    // Log match result if applicable
    if (logType === "match" && form.opponent_id) {
      await supabase.from("match_results").insert([{
        id: crypto.randomUUID(),
        league_id: form.league_id || null,
        winner_id: form.won ? user.id : form.opponent_id,
        loser_id: form.won ? form.opponent_id : user.id,
        score: form.score,
        activity_type: form.activity_type,
        played_at: now,
        logged_by: user.id,
      }])

      // Update opponent points too
      const opponentPoints = calculateActivityPoints(form.activity_type, form.won ? "match_loss" : "match_win")
      await updateUserStats(form.opponent_id, form.activity_type, opponentPoints, logType === "match")

      // Update league member points if in a league
      if (form.league_id) {
        await updateLeagueMember(user.id, form.league_id, points, form.won)
        await updateLeagueMember(form.opponent_id, form.league_id, opponentPoints, !form.won)
      }
    }

    // Update user stats
    await updateUserStats(user.id, form.activity_type, points, logType === "match")

    // Check and award badges
    await checkBadges(user.id)

    setSuccess(`Activity logged! You earned ${points} points 🎉`)
    setLoading(false)
    setForm({ activity_type: "running", distance: "", duration_mins: "", notes: "", opponent_id: "", score: "", won: true, league_id: "" })
  }

  async function updateUserStats(userId: string, activityType: string, points: number, isMatch: boolean) {
    const month = getCurrentMonth()
    const year = getCurrentYear()
    const week = getCurrentWeek()

    // Check existing stats
    const { data: existing } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("activity_type", activityType)
      .maybeSingle()

    if (existing) {
      const lastWeek = existing.last_active_week
      const newStreak = lastWeek === week ? existing.streak_weeks :
        lastWeek === getPreviousWeek() ? (existing.streak_weeks || 0) + 1 : 1

      await supabase.from("user_stats").update({
        total_points: (existing.total_points || 0) + points,
        events_attended: isMatch ? existing.events_attended : (existing.events_attended || 0) + 1,
        matches_played: isMatch ? (existing.matches_played || 0) + 1 : existing.matches_played,
        matches_won: (isMatch && form.won) ? (existing.matches_won || 0) + 1 : existing.matches_won,
        streak_weeks: newStreak,
        last_active_week: week,
        month,
        year,
      }).eq("id", existing.id)
    } else {
      await supabase.from("user_stats").insert([{
        id: crypto.randomUUID(),
        user_id: userId,
        activity_type: activityType,
        total_points: points,
        events_attended: isMatch ? 0 : 1,
        matches_played: isMatch ? 1 : 0,
        matches_won: (isMatch && form.won) ? 1 : 0,
        streak_weeks: 1,
        last_active_week: week,
        month,
        year,
      }])
    }
  }

  async function updateLeagueMember(userId: string, leagueId: string, points: number, won: boolean) {
    const { data: existing } = await supabase
      .from("league_members")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", userId)
      .maybeSingle()

    if (existing) {
      await supabase.from("league_members").update({
        total_points: (existing.total_points || 0) + points,
        matches_played: (existing.matches_played || 0) + 1,
        matches_won: won ? (existing.matches_won || 0) + 1 : existing.matches_won,
      }).eq("id", existing.id)
    }
  }

  async function checkBadges(userId: string) {
    const { data: existing } = await supabase
      .from("user_badges")
      .select("badge_id")
      .eq("user_id", userId)

    const earnedIds = new Set(existing?.map(b => b.badge_id) || [])
    const { data: logs } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", userId)

    const { data: wins } = await supabase
      .from("match_results")
      .select("*")
      .eq("winner_id", userId)

    const totalEvents = logs?.filter(l => l.log_type === "manual" || l.log_type === "event").length || 0
    const totalWins = wins?.length || 0
    const activityTypes = new Set(logs?.map(l => l.activity_type) || [])
    const locations = new Set(logs?.map(l => l.notes).filter(Boolean) || [])

    const newBadges = []
    if (!earnedIds.has("first_event") && totalEvents >= 1) newBadges.push("first_event")
    if (!earnedIds.has("five_events") && totalEvents >= 5) newBadges.push("five_events")
    if (!earnedIds.has("ten_events") && totalEvents >= 10) newBadges.push("ten_events")
    if (!earnedIds.has("first_win") && totalWins >= 1) newBadges.push("first_win")
    if (!earnedIds.has("five_wins") && totalWins >= 5) newBadges.push("five_wins")
    if (!earnedIds.has("all_rounder") && activityTypes.size >= 3) newBadges.push("all_rounder")

    if (newBadges.length > 0) {
      await supabase.from("user_badges").insert(
        newBadges.map(badge_id => ({
          id: crypto.randomUUID(),
          user_id: userId,
          badge_id,
          earned_at: new Date().toISOString(),
        }))
      )
    }
  }

  function getPreviousWeek(): string {
    const now = new Date()
    now.setDate(now.getDate() - 7)
    const start = new Date(now.getFullYear(), 0, 1)
    const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${week}`
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Log Activity</h1>
      <p className="text-muted-foreground mb-8">Record your activity and earn points</p>

      {success && (
        <div className="rounded-xl bg-green-50 text-green-700 p-4 mb-6 font-medium">{success}</div>
      )}
      {error && (
        <div className="rounded-xl bg-destructive/10 text-destructive p-4 mb-6 text-sm">{error}</div>
      )}

      <div className="space-y-5">
        {/* Log type */}
        <div className="flex gap-3">
          <button
            onClick={() => setLogType("manual")}
            className={`flex-1 rounded-xl border p-4 text-left transition-colors ${logType === "manual" ? "border-foreground" : "border-border"}`}
          >
            <p className="font-medium text-sm mb-1">🏃 Log Activity</p>
            <p className="text-xs text-muted-foreground">Run, ride, swim, workout</p>
          </button>
          <button
            onClick={() => setLogType("match")}
            className={`flex-1 rounded-xl border p-4 text-left transition-colors ${logType === "match" ? "border-foreground" : "border-border"}`}
          >
            <p className="font-medium text-sm mb-1">🎾 Log Match</p>
            <p className="text-xs text-muted-foreground">Padel, tennis vs opponent</p>
          </button>
        </div>

        {/* Activity type */}
        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Activity</label>
          <div className="flex flex-wrap gap-2">
            {(logType === "match" ? MATCH_ACTIVITIES : ACTIVITIES).map(act => (
              <button
                key={act}
                onClick={() => setForm({ ...form, activity_type: act })}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  form.activity_type === act
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        {logType === "manual" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Distance (km)</label>
                <input
                  type="number"
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                  placeholder="e.g. 5.2"
                  value={form.distance}
                  onChange={(e) => setForm({ ...form, distance: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Duration (mins)</label>
                <input
                  type="number"
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                  placeholder="e.g. 45"
                  value={form.duration_mins}
                  onChange={(e) => setForm({ ...form, duration_mins: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Notes (optional)</label>
              <input
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                placeholder="e.g. Morning run around the park"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </>
        ) : (
          <>
            {/* Opponent */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Opponent</label>
              <select
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                value={form.opponent_id}
                onChange={(e) => setForm({ ...form, opponent_id: e.target.value })}
              >
                <option value="">Select opponent...</option>
                {friends.map(f => (
                  <option key={f.id} value={f.id}>{f.full_name}</option>
                ))}
              </select>
            </div>

            {/* Score */}
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Score</label>
              <input
                className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                placeholder="e.g. 6-3, 6-4"
                value={form.score}
                onChange={(e) => setForm({ ...form, score: e.target.value })}
              />
            </div>

            {/* Result */}
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Result</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setForm({ ...form, won: true })}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${form.won ? "border-foreground bg-foreground text-background" : "border-border"}`}
                >
                  🏆 I won
                </button>
                <button
                  onClick={() => setForm({ ...form, won: false })}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-colors ${!form.won ? "border-foreground bg-foreground text-background" : "border-border"}`}
                >
                  😅 I lost
                </button>
              </div>
            </div>

            {/* League */}
            {leagues.length > 0 && (
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">League (optional)</label>
                <select
                  className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
                  value={form.league_id}
                  onChange={(e) => setForm({ ...form, league_id: e.target.value })}
                >
                  <option value="">No league</option>
                  {leagues.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        <button
          onClick={handleLog}
          disabled={loading}
          className="w-full rounded-xl bg-foreground text-background py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Logging..." : "Log Activity"}
        </button>
      </div>
    </div>
  )
}

