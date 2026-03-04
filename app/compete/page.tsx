"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel, BADGES } from "@/lib/points"
import { Trophy, Plus, Activity, Users } from "lucide-react"

const ACTIVITIES = ["all", "running", "cycling", "swimming", "hiking", "crossfit", "padel", "tennis", "yoga"]
const TIME_PERIODS = ["month", "year", "alltime"]

export default function CompetePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any>(null)
  const [userBadges, setUserBadges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activity, setActivity] = useState("all")
  const [period, setPeriod] = useState("month")

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    fetchLeaderboard()
  }, [activity, period])

  async function fetchLeaderboard() {
    setLoading(true)

    let query = supabase
      .from("user_stats")
      .select("user_id, total_points, events_attended, matches_won, matches_played, streak_weeks, activity_type")

    if (activity !== "all") {
      query = query.eq("activity_type", activity)
    }

    const now = new Date()
    if (period === "month") {
      query = query.eq("month", `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
    } else if (period === "year") {
      query = query.eq("year", String(now.getFullYear()))
    }

    const { data: statsData } = await query.order("total_points", { ascending: false }).limit(50)

    if (!statsData || statsData.length === 0) {
      setLeaderboard([])
      setLoading(false)
      return
    }

    // Aggregate points per user if showing "all" activities
    const aggregated: Record<string, any> = {}
    statsData.forEach(stat => {
      if (!aggregated[stat.user_id]) {
        aggregated[stat.user_id] = { ...stat, total_points: 0, events_attended: 0, matches_won: 0, matches_played: 0 }
      }
      aggregated[stat.user_id].total_points += stat.total_points || 0
      aggregated[stat.user_id].events_attended += stat.events_attended || 0
      aggregated[stat.user_id].matches_won += stat.matches_won || 0
      aggregated[stat.user_id].matches_played += stat.matches_played || 0
    })

    const userIds = Object.keys(aggregated)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, location")
      .in("id", userIds)

    const profileMap: Record<string, any> = {}
    profiles?.forEach(p => { profileMap[p.id] = p })

    const ranked = Object.values(aggregated)
      .map(stat => ({ ...stat, profile: profileMap[stat.user_id] }))
      .sort((a, b) => b.total_points - a.total_points)

    setLeaderboard(ranked)

    // Load current user stats & badges
    if (user) {
      const myStats = ranked.find(r => r.user_id === user.id)
      setUserStats(myStats)

      const { data: badges } = await supabase
        .from("user_badges")
        .select("badge_id, earned_at")
        .eq("user_id", user.id)
      setUserBadges(badges || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    if (user) fetchLeaderboard()
  }, [user])

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <p className="mb-3 text-[0.8rem] font-medium uppercase tracking-widest text-muted-foreground">Compete</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Leader<span className="font-serif italic text-accent">board</span>
          </h1>
          <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
            See who's most active in your area. Log activities and climb the ranks.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/compete/log"
            className="flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:opacity-90"
          >
            <Activity className="size-4" />
            Log activity
          </Link>
          <Link
            href="/compete/leagues"
            className="flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted"
          >
            <Trophy className="size-4" />
            Leagues
          </Link>
        </div>
      </div>

      {/* My stats card */}
      {user && userStats && (
        <div className="rounded-2xl border bg-muted/30 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Your Stats</h2>
            <span className="text-2xl">{getLevel(userStats.total_points).emoji}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Points", value: userStats.total_points },
              { label: "Level", value: getLevel(userStats.total_points).name },
              { label: "Events", value: userStats.events_attended },
              { label: "Week streak", value: `${userStats.streak_weeks || 0}🔥` },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border bg-background p-3 text-center">
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Badges */}
          {userBadges.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">Your badges</p>
              <div className="flex flex-wrap gap-2">
                {userBadges.map(ub => {
                  const badge = BADGES.find(b => b.id === ub.badge_id)
                  if (!badge) return null
                  return (
                    <div key={ub.badge_id} className="flex items-center gap-1.5 rounded-full bg-background border px-3 py-1 text-xs font-medium" title={badge.description}>
                      <span>{badge.emoji}</span>
                      <span>{badge.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {ACTIVITIES.map(act => (
            <button
              key={act}
              onClick={() => setActivity(act)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                activity === act ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {act}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {TIME_PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                period === p ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "alltime" ? "All time" : p === "month" ? "This month" : "This year"}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="text-muted-foreground">Loading leaderboard...</div>
      ) : leaderboard.length === 0 ? (
        <div className="text-center py-20">
          <Trophy className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-4">No activity logged yet for this period</p>
          <Link href="/compete/log" className="text-sm underline">Be the first to log an activity</Link>
        </div>
      ) : (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => {
            const isMe = user?.id === entry.user_id
            const level = getLevel(entry.total_points)
            const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null

            return (
              <Link key={entry.user_id} href={`/profile/${entry.user_id}`}>
                <div className={`flex items-center gap-4 rounded-xl border px-4 py-3 hover:bg-muted transition-colors ${isMe ? "border-foreground bg-muted/30" : ""}`}>
                  <span className="text-lg w-8 text-center font-bold text-muted-foreground">
                    {medal ?? `#${index + 1}`}
                  </span>
                  <div className="size-10 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {entry.profile?.avatar_url
                      ? <img src={entry.profile.avatar_url} alt={entry.profile?.full_name} className="size-full object-cover" />
                      : <span className="text-sm font-medium">{entry.profile?.full_name?.[0] ?? "?"}</span>
                    }
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {entry.profile?.full_name ?? "Unknown"} {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{entry.profile?.location} · {level.emoji} {level.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{entry.total_points} pts</p>
                    <p className="text-xs text-muted-foreground">{entry.events_attended} events · {entry.matches_won}W</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
