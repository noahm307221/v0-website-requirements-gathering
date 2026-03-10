"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel, BADGES, LEVELS } from "@/lib/points"
import { Trophy, Plus, Activity, Users, Flame, Search, Globe, Lock, Crown, ChevronRight } from "lucide-react"

function getLevelNumber(levelObj: { name: string; emoji: string; min: number; max: number }) {
  return LEVELS.findIndex(l => l.name === levelObj.name) + 1
}

const ACTIVITIES = ["all", "running", "cycling", "swimming", "hiking", "crossfit", "padel", "tennis", "yoga"]
const TIME_PERIODS = ["month", "year", "alltime"]
type MainTab = "rankings" | "leagues"

export default function CompeteHubPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<MainTab>("rankings")
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any>(null)
  const [userBadges, setUserBadges] = useState<any[]>([])
  const [activity, setActivity] = useState("all")
  const [period, setPeriod] = useState("month")
  const [myLeagues, setMyLeagues] = useState<any[]>([])
  const [publicLeagues, setPublicLeagues] = useState<any[]>([])
  const [leagueSearch, setLeagueSearch] = useState("")
  const [leagueView, setLeagueView] = useState<"mine" | "discover">("mine")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("tab") === "leagues") setActiveTab("leagues")
  }, [])

  useEffect(() => {
    async function loadAllData() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) { setLoading(false); return }

      let query = supabase.from("user_stats").select("user_id, total_points, events_attended, matches_won, matches_played, streak_weeks, activity_type")
      if (activity !== "all") query = query.eq("activity_type", activity)
      const now = new Date()
      if (period === "month") query = query.eq("month", `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`)
      else if (period === "year") query = query.eq("year", String(now.getFullYear()))

      const { data: statsData } = await query.order("total_points", { ascending: false }).limit(50)

      if (statsData && statsData.length > 0) {
        const aggregated: Record<string, any> = {}
        statsData.forEach(stat => {
          if (!aggregated[stat.user_id]) aggregated[stat.user_id] = { ...stat, total_points: 0, events_attended: 0, matches_won: 0, matches_played: 0 }
          aggregated[stat.user_id].total_points += stat.total_points || 0
          aggregated[stat.user_id].events_attended += stat.events_attended || 0
          aggregated[stat.user_id].matches_won += stat.matches_won || 0
          aggregated[stat.user_id].matches_played += stat.matches_played || 0
        })
        const userIds = Object.keys(aggregated)
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url, location").in("id", userIds)
        const profileMap: Record<string, any> = {}
        profiles?.forEach(p => { profileMap[p.id] = p })
        const ranked = Object.values(aggregated)
          .map(stat => ({ ...stat, profile: profileMap[stat.user_id] }))
          .sort((a, b) => b.total_points - a.total_points)
        setLeaderboard(ranked)
        setUserStats(ranked.find(r => r.user_id === user.id) || null)
      } else {
        setLeaderboard([])
        setUserStats(null)
      }

      const { data: badges } = await supabase.from("user_badges").select("badge_id, earned_at").eq("user_id", user.id)
      setUserBadges(badges || [])

      const { data: memberData } = await supabase.from("league_members").select("league_id, leagues(*)").eq("user_id", user.id)
      const myLeaguesData = memberData?.map(m => m.leagues).filter(Boolean) || []
      setMyLeagues(myLeaguesData)
      const myLeagueIds = myLeaguesData.map((l: any) => l.id)
      const { data: publicData } = await supabase.from("leagues").select("*").eq("is_public", true)
      setPublicLeagues((publicData || []).filter(l => !myLeagueIds.includes(l.id)))

      setLoading(false)
    }
    loadAllData()
  }, [activity, period])

  const displayedLeagues = leagueView === "mine" ? myLeagues : publicLeagues
  const filteredLeagues = displayedLeagues.filter(l =>
    l.name.toLowerCase().includes(leagueSearch.toLowerCase()) ||
    l.activity_type?.toLowerCase().includes(leagueSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen pb-24">

      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-teal-50 border-b border-slate-100/60">
        <div className="absolute top-[-30%] right-[-5%] w-[500px] h-[500px] rounded-full bg-teal-100/40 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-30%] left-[-5%] w-[400px] h-[400px] rounded-full bg-orange-100/40 blur-[100px] pointer-events-none" />
        <div className="relative z-10 mx-auto max-w-5xl px-6 py-14 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-700 mb-5 rounded-full bg-white/80 border border-teal-100 px-4 py-2 shadow-sm">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-2 bg-teal-500" />
              </span>
              Compete
            </div>
            <h1 className="font-black tracking-tight leading-[1.05] text-slate-900 text-4xl md:text-5xl mb-4">
              Competition{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-400">Hub</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-xl">
              Climb the city rankings, join private leagues, and log your hustle.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            {activeTab === "leagues" && (
              <Link href="/compete/leagues/create"
                className="flex items-center gap-2 rounded-full border border-teal-200 bg-white px-5 py-2.5 text-sm font-bold text-teal-700 hover:bg-teal-50 transition-colors shadow-sm">
                <Plus className="size-4" /> Create League
              </Link>
            )}
            <Link href="/compete/log"
              className="flex items-center gap-2 rounded-full bg-teal-500 text-white px-5 py-2.5 text-sm font-bold hover:bg-teal-400 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-200/50">
              <Activity className="size-4" /> Log Activity
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">

        {/* ── TABS ── */}
        <div className="flex gap-1 border-b border-slate-200 mb-8">
          {[
            { id: "rankings", label: "City Rankings", icon: Crown },
            { id: "leagues",  label: "Leagues",       icon: Trophy },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as MainTab)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-teal-500 text-teal-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}>
              <tab.icon className="size-4" /> {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="size-8 border-[3px] border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── RANKINGS TAB ── */}
            {activeTab === "rankings" && (
              <div className="space-y-6">

                {/* Your performance card */}
                {user && userStats && (
                  <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="font-black text-slate-800 text-lg">Your Performance</h2>
                      <div className="flex items-center gap-2 bg-teal-50 border border-teal-100 px-3 py-1.5 rounded-full">
                        <span>{getLevel(userStats.total_points).emoji}</span>
                        <span className="text-sm font-bold text-teal-700">{getLevel(userStats.total_points).name}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                      {[
                        { label: "Points",      value: userStats.total_points,         color: "text-teal-600" },
                        { label: "Level",       value: getLevelNumber(getLevel(userStats.total_points)), color: "text-slate-800" },
                        { label: "Events",      value: userStats.events_attended,      color: "text-slate-800" },
                        { label: "Week Streak", value: userStats.streak_weeks || 0,    color: "text-orange-500", suffix: " 🔥" },
                      ].map(({ label, value, color, suffix }) => (
                        <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-center">
                          <p className={`text-2xl font-black tabular-nums ${color}`}>{value}{suffix ?? ""}</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
                        </div>
                      ))}
                    </div>

                    {userBadges.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Badges</p>
                        <div className="flex flex-wrap gap-2">
                          {userBadges.map(ub => {
                            const badge = BADGES.find(b => b.id === ub.badge_id)
                            if (!badge) return null
                            return (
                              <div key={ub.badge_id} className="flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                                <span>{badge.emoji}</span> {badge.name}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Filters */}
                <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                  {/* Sports row */}
                  <div className="flex gap-2 overflow-x-auto px-4 py-3 border-b border-slate-100" style={{ scrollbarWidth: "none" }}>
                    {ACTIVITIES.map(act => (
                      <button key={act} onClick={() => setActivity(act)}
                        className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-bold capitalize transition-all ${
                          activity === act
                            ? "bg-teal-600 text-white"
                            : "text-slate-500 hover:text-teal-700 hover:bg-teal-50"
                        }`}>
                        {act === "all" ? "All Sports" : act}
                      </button>
                    ))}
                  </div>
                  {/* Time row */}
                  <div className="flex gap-1 px-4 py-2.5">
                    {TIME_PERIODS.map(p => (
                      <button key={p} onClick={() => setPeriod(p)}
                        className={`rounded-full px-4 py-1.5 text-sm font-bold transition-all ${
                          period === p
                            ? "bg-teal-500 text-white"
                            : "text-slate-400 hover:text-teal-600"
                        }`}>
                        {p === "alltime" ? "All Time" : p === "month" ? "This Month" : "This Year"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Leaderboard */}
                {leaderboard.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-20 text-center bg-white rounded-2xl border border-slate-100">
                    <Crown className="size-10 text-teal-200" />
                    <h3 className="text-xl font-black text-slate-800">No activity yet</h3>
                    <p className="text-slate-500 text-sm max-w-xs">No one has logged anything for this period. Be the first.</p>
                    <Link href="/compete/log" className="mt-2 rounded-full bg-teal-500 text-white px-6 py-2.5 text-sm font-bold hover:bg-teal-400 transition-colors">
                      Log activity
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, index) => {
                      const isMe = user?.id === entry.user_id
                      const level = getLevel(entry.total_points)
                      const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null

                      return (
                        <Link key={entry.user_id} href={`/profile/${entry.user_id}`}>
                          <div className={`flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                            isMe
                              ? "border-teal-200 bg-teal-50/60"
                              : "border-slate-100 bg-white hover:border-slate-200"
                          }`}>
                            {/* Rank */}
                            <div className={`w-9 text-center shrink-0 ${
                              index === 0 ? "text-2xl" : index < 3 ? "text-xl" : "text-sm font-black text-slate-400"
                            }`}>
                              {medal ?? index + 1}
                            </div>

                            {/* Avatar */}
                            <div className="size-11 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                              {entry.profile?.avatar_url
                                ? <img src={entry.profile.avatar_url} alt="" className="size-full object-cover" />
                                : <span className="text-sm font-bold text-slate-400">{entry.profile?.full_name?.[0] ?? "?"}</span>
                              }
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-bold text-slate-800 truncate">{entry.profile?.full_name ?? "Unknown"}</p>
                                {isMe && <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-100 px-2 py-0.5 rounded-md">You</span>}
                              </div>
                              <p className="text-xs text-slate-400 font-medium mt-0.5">{level.emoji} {level.name} · {entry.events_attended} events</p>
                            </div>

                            {/* Points */}
                            <div className="text-right shrink-0">
                              <p className={`text-xl font-black tabular-nums ${index === 0 ? "text-amber-500" : isMe ? "text-teal-600" : "text-slate-800"}`}>
                                {entry.total_points.toLocaleString()}
                              </p>
                              <p className="text-xs text-slate-400 font-medium">pts</p>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── LEAGUES TAB ── */}
            {activeTab === "leagues" && (
              <div className="space-y-6">

                {/* Sub-tabs + search */}
                <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-100">
                    {(["mine", "discover"] as const).map(v => (
                      <button key={v} onClick={() => setLeagueView(v)}
                        className={`px-5 py-2 text-sm font-bold rounded-lg transition-all capitalize ${
                          leagueView === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                        }`}>
                        {v === "mine" ? "My Leagues" : "Discover"}
                      </button>
                    ))}
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                      placeholder="Search leagues..."
                      value={leagueSearch}
                      onChange={e => setLeagueSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:border-teal-400 transition-colors"
                    />
                  </div>
                </div>

                {filteredLeagues.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                    <Trophy className="size-10 text-teal-200 mx-auto mb-3" />
                    <h3 className="text-lg font-black text-slate-800 mb-2">No leagues found</h3>
                    <p className="text-slate-500 text-sm max-w-xs mx-auto mb-5">
                      {leagueView === "mine" ? "You haven't joined any leagues yet." : "No public leagues match your search."}
                    </p>
                    {leagueView === "mine" && (
                      <Link href="/compete/leagues/create" className="inline-flex items-center gap-2 rounded-full bg-teal-500 text-white px-6 py-2.5 text-sm font-bold hover:bg-teal-400 transition-colors">
                        <Plus className="size-4" /> Create a league
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLeagues.map(league => (
                      <Link key={league.id} href={`/compete/leagues/${league.id}`} className="group block">
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
                          <div className="flex items-start justify-between mb-4">
                            <div className="size-11 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center text-xl">
                              {league.activity_type?.includes("padel") ? "🎾" : league.activity_type?.includes("running") ? "🏃" : "🏆"}
                            </div>
                            {league.is_public
                              ? <span className="flex items-center gap-1 bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-xs font-bold border border-teal-100"><Globe className="size-3" /> Public</span>
                              : <span className="flex items-center gap-1 bg-slate-50 text-slate-600 px-2.5 py-1 rounded-full text-xs font-bold border border-slate-200"><Lock className="size-3" /> Private</span>
                            }
                          </div>
                          <h3 className="font-black text-slate-800 mb-1.5 group-hover:text-teal-600 transition-colors line-clamp-1">{league.name}</h3>
                          <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4 flex-1">{league.description || "A competitive leaderboard."}</p>
                          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100">
                            {league.activity_type?.split(",").slice(0, 3).map((sport: string) => (
                              <span key={sport} className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded-lg text-xs font-bold capitalize border border-slate-100">{sport.trim()}</span>
                            ))}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}