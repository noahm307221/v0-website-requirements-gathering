"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel, BADGES } from "@/lib/points"
import { Trophy, Plus, Activity, Users, Flame, Medal } from "lucide-react"

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
    <div className="min-h-screen bg-slate-50/50 font-sans pb-24">
      <div className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        
        {/* ── BOLD HEADER ── */}
        <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-teal-600">Compete</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl mb-4">
              Local{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">
                Rankings.
              </span>
            </h1>
            <p className="max-w-xl text-lg font-medium leading-relaxed text-slate-500">
              See who's most active in your area. Log activities and climb the ranks.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/compete/leagues"
              className="flex items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-600 hover:border-teal-200 hover:text-teal-700 transition-colors shadow-sm"
            >
              <Trophy className="size-4.5" />
              Leagues
            </Link>
            <Link
              href="/compete/log"
              className="flex items-center justify-center gap-2 rounded-full bg-teal-600 text-white px-6 py-3.5 text-sm font-bold hover:bg-teal-700 shadow-md transition-all hover:-translate-y-0.5"
            >
              <Activity className="size-4.5" />
              Log Activity
            </Link>
          </div>
        </div>

        {/* ── MY STATS (BENTO CARD) ── */}
        {user && userStats && (
          <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 mb-10 transition-all hover:shadow-md">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Your Performance</h2>
              <div className="flex items-center gap-2 bg-teal-50 px-4 py-2 rounded-full border border-teal-100">
                <span className="text-2xl">{getLevel(userStats.total_points).emoji}</span>
                <span className="font-bold text-teal-700 text-sm hidden sm:block">{getLevel(userStats.total_points).name}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Points", value: userStats.total_points, color: "text-teal-600" },
                { label: "Level", value: getLevel(userStats.total_points).level, color: "text-slate-800" },
                { label: "Events", value: userStats.events_attended, color: "text-slate-800" },
                { label: "Week Streak", value: `${userStats.streak_weeks || 0}`, icon: <Flame className="size-5 text-orange-500" />, color: "text-orange-500" },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className="rounded-3xl bg-slate-50 border border-slate-100 p-5 text-center flex flex-col items-center justify-center">
                  <p className={`text-3xl font-black tracking-tight mb-1 flex items-center gap-1 ${color}`}>
                    {value} {icon}
                  </p>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                </div>
              ))}
            </div>

            {/* Badges */}
            {userBadges.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Unlocked Badges</p>
                <div className="flex flex-wrap gap-2">
                  {userBadges.map(ub => {
                    const badge = BADGES.find(b => b.id === ub.badge_id)
                    if (!badge) return null
                    return (
                      <div key={ub.badge_id} className="flex items-center gap-2 rounded-full bg-white border border-slate-200 shadow-sm px-4 py-2 text-xs font-bold text-slate-700" title={badge.description}>
                        <span className="text-lg">{badge.emoji}</span>
                        <span>{badge.name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── FILTER HUB ── */}
        <div className="bg-white p-5 sm:p-6 rounded-[2rem] shadow-sm border border-slate-100 mb-8 flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
          
          {/* Activities */}
          <div className="w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 -mx-2 px-2" style={{ scrollbarWidth: "none" }}>
            <div className="flex gap-2">
              {ACTIVITIES.map(act => (
                <button
                  key={act}
                  onClick={() => setActivity(act)}
                  className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-bold capitalize transition-all shadow-sm ${
                    activity === act 
                      ? "bg-teal-600 text-white shadow-md scale-105" 
                      : "bg-white border border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {act === "all" ? "All Sports" : act}
                </button>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-px h-px lg:h-10 bg-slate-200 shrink-0" />

          {/* Time Periods */}
          <div className="flex gap-2 shrink-0">
            {TIME_PERIODS.map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-full px-5 py-2.5 text-sm font-bold capitalize transition-all shadow-sm ${
                  period === p 
                    ? "bg-slate-800 text-white shadow-md scale-105" 
                    : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {p === "alltime" ? "All Time" : p === "month" ? "This Month" : "This Year"}
              </button>
            ))}
          </div>
        </div>

        {/* ── LEADERBOARD LIST ── */}
        {loading ? (
          <div className="flex items-center justify-center min-h-[30vh]">
            <div className="size-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-5 py-24 text-center bg-white rounded-[2rem] border border-slate-100 shadow-sm mt-4">
            <div className="flex size-20 items-center justify-center rounded-3xl bg-teal-50 text-teal-600 mb-2">
              <Trophy className="size-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">No activity found</h3>
            <p className="max-w-md text-base font-medium text-slate-500 leading-relaxed">
              Looks like no one has logged anything for this period yet.
            </p>
            <Link href="/compete/log" className="mt-4 rounded-full bg-teal-600 text-white px-8 py-3.5 text-base font-bold hover:bg-teal-700 shadow-md transition-all hover:scale-105">
              Be the first to log
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => {
              const isMe = user?.id === entry.user_id
              const level = getLevel(entry.total_points)
              
              // Top 3 Medal Styling
              const isFirst = index === 0;
              const isSecond = index === 1;
              const isThird = index === 2;
              
              let rankStyle = "bg-slate-100 text-slate-500 border-slate-200";
              if (isFirst) rankStyle = "bg-amber-100 text-amber-600 border-amber-200";
              if (isSecond) rankStyle = "bg-slate-200 text-slate-600 border-slate-300";
              if (isThird) rankStyle = "bg-orange-100 text-orange-600 border-orange-200";

              return (
                <Link key={entry.user_id} href={`/profile/${entry.user_id}`} className="block">
                  <div className={`flex items-center gap-4 rounded-3xl border p-4 sm:p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 ${
                    isMe 
                      ? "border-teal-300 bg-teal-50/50 shadow-sm" 
                      : "border-slate-100 bg-white"
                  }`}>
                    
                    {/* Rank Number/Medal */}
                    <div className={`size-10 sm:size-12 shrink-0 rounded-2xl flex items-center justify-center font-black text-lg border ${rankStyle}`}>
                      {isFirst ? "1" : isSecond ? "2" : isThird ? "3" : index + 1}
                    </div>

                    {/* Avatar */}
                    <div className="size-12 sm:size-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {entry.profile?.avatar_url
                        ? <img src={entry.profile.avatar_url} alt={entry.profile?.full_name} className="size-full object-cover" />
                        : <span className="text-lg font-bold text-slate-400">{entry.profile?.full_name?.[0] ?? "?"}</span>
                      }
                    </div>

                    {/* Name & Details */}
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-slate-800 text-base sm:text-lg truncate">
                        {entry.profile?.full_name ?? "Unknown Athlete"} 
                        {isMe && <span className="ml-2 text-xs font-black uppercase tracking-widest text-teal-600 bg-teal-100 px-2 py-0.5 rounded-md">You</span>}
                      </p>
                      <p className="text-sm font-medium text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                        <span className="text-base">{level.emoji}</span> {level.name} 
                        {entry.profile?.location && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span>{entry.profile.location}</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <p className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${isFirst ? "text-amber-500" : isMe ? "text-teal-600" : "text-slate-800"}`}>
                        {entry.total_points.toLocaleString()}
                      </p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {entry.events_attended} Events <span className="hidden sm:inline">· {entry.matches_won}W</span>
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}