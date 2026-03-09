"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel, BADGES, LEVELS } from "@/lib/points"
import {
  Trophy, Plus, Activity, Users, Flame,
  Search, Globe, Lock, Crown, ChevronRight, Zap, ArrowRight
} from "lucide-react"
import { cn } from "@/lib/utils"

function getLevelNumber(levelObj: { name: string; emoji: string; min: number; max: number }) {
  return LEVELS.findIndex(l => l.name === levelObj.name) + 1
}

const ACTIVITIES = ["all", "running", "cycling", "swimming", "hiking", "crossfit", "padel", "tennis", "yoga"]
const TIME_PERIODS = ["month", "year", "alltime"]
type MainTab = "rankings" | "leagues"

const sportEmoji: Record<string, string> = {
  padel: "🎾", tennis: "🎾", running: "🏃", cycling: "🚴",
  swimming: "🏊", hiking: "🥾", crossfit: "🏋️", yoga: "🧘", default: "🏆",
}
const getSportEmoji = (type?: string) =>
  type ? (sportEmoji[type.toLowerCase()] ?? sportEmoji.default) : sportEmoji.default

// Sport background images for leaderboard entries
const sportBgs: Record<string, string> = {
  running:  "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80",
  cycling:  "https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?w=800&q=80",
  padel:    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80",
  swimming: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80",
  gym:      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80",
  football: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
  default:  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
}

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

  const userRank = userStats ? leaderboard.findIndex(e => e.user_id === user?.id) + 1 : null
  const userLevel = userStats ? getLevel(userStats.total_points) : null

  return (
    <div className="min-h-screen pb-32" style={{ background: '#F0EFEC' }}>

      {/* ── Dark hero header ── */}
      <div className="bg-slate-900 px-10 pt-12 pb-10 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        <div className="mx-auto max-w-[1200px] relative z-10 flex items-end justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="size-3.5 text-amber-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-stone-400">Competition Hub</span>
            </div>
            <h1 className="text-6xl font-black italic uppercase tracking-[-0.03em] text-white leading-none mb-4">
              COMPETE.<br />
              <span className="text-teal-400">DOMINATE.</span>
            </h1>
            <p className="text-stone-400 font-medium text-base max-w-md leading-relaxed">
              Climb the city rankings, join private leagues, and log your hustle.
            </p>
          </div>

          {/* Hero stats — only if user has data */}
          <div className="flex items-end gap-10 pb-1 shrink-0">
            {userStats && (
              <>
                <div className="text-right">
                  <p className="text-5xl font-black text-white leading-none">{userStats.total_points.toLocaleString()}</p>
                  <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mt-1">Your Points</p>
                </div>
                {userRank && (
                  <div className="text-right">
                    <p className="text-5xl font-black text-white leading-none">
                      #{userRank}
                    </p>
                    <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mt-1">City Rank</p>
                  </div>
                )}
              </>
            )}
            <div className="flex flex-col gap-3">
              <Link href="/compete/log"
                className="flex items-center gap-2.5 bg-teal-500 hover:bg-teal-400 text-slate-900 font-black text-[11px] uppercase tracking-[0.15em] px-7 py-4 rounded-2xl transition-colors shadow-xl shadow-teal-900/30"
              >
                <Activity className="size-4 stroke-[3px]" /> Log Activity
              </Link>
              {activeTab === "leagues" && (
                <Link href="/compete/leagues/create"
                  className="flex items-center gap-2.5 bg-white/10 hover:bg-white/20 text-white font-black text-[11px] uppercase tracking-[0.15em] px-7 py-4 rounded-2xl transition-colors border border-white/10"
                >
                  <Plus className="size-4 stroke-[3px]" /> Create League
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar inside hero footer */}
        <div className="mx-auto max-w-[1200px] mt-10 relative z-10 flex gap-1 border-t border-white/10 pt-6">
          {[
            { id: "rankings", label: "City Rankings", icon: Crown },
            { id: "leagues",  label: "Leagues",       icon: Trophy },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as MainTab)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all",
                activeTab === tab.id
                  ? "bg-white text-slate-900"
                  : "text-stone-400 hover:text-white hover:bg-white/10"
              )}
            >
              <tab.icon className="size-4" /> {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Page content ── */}
      <div className="mx-auto max-w-[1200px] px-8 py-10">
        {loading ? (
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="size-8 border-[3px] border-teal-200 border-t-teal-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ════════════════════════════
                RANKINGS TAB
            ════════════════════════════ */}
            {activeTab === "rankings" && (
              <div className="grid grid-cols-12 gap-8">

                {/* Main leaderboard — left 8 cols */}
                <div className="col-span-8 space-y-6">

                  {/* Filters */}
                  <div className="bg-white rounded-3xl border border-stone-200/50 shadow-sm overflow-hidden">
                    {/* Sports scroll */}
                    <div className="flex gap-2 overflow-x-auto px-5 py-4 border-b border-stone-100" style={{ scrollbarWidth: "none" }}>
                      {ACTIVITIES.map(act => (
                        <button key={act} onClick={() => setActivity(act)}
                          className={cn(
                            "shrink-0 rounded-2xl px-5 py-2 text-[11px] font-black uppercase tracking-wider capitalize transition-all",
                            activity === act
                              ? "bg-slate-900 text-white"
                              : "text-stone-500 hover:text-slate-900 hover:bg-stone-50"
                          )}>
                          {act === "all" ? "All Sports" : act}
                        </button>
                      ))}
                    </div>
                    {/* Time period */}
                    <div className="flex gap-2 px-5 py-3">
                      {TIME_PERIODS.map(p => (
                        <button key={p} onClick={() => setPeriod(p)}
                          className={cn(
                            "rounded-2xl px-5 py-2 text-[11px] font-black uppercase tracking-wider transition-all",
                            period === p
                              ? "bg-teal-500 text-white"
                              : "text-stone-400 hover:text-slate-900"
                          )}>
                          {p === "alltime" ? "All Time" : p === "month" ? "This Month" : "This Year"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Leaderboard list */}
                  {leaderboard.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-stone-200/50 shadow-sm py-24 flex flex-col items-center justify-center gap-4 text-center">
                      <Crown className="size-12 text-stone-200" />
                      <h3 className="text-2xl font-black italic uppercase text-slate-900">No Activity Yet</h3>
                      <p className="text-stone-400 text-sm max-w-xs">No one has logged anything for this period. Be the first.</p>
                      <Link href="/compete/log"
                        className="mt-2 bg-teal-500 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-teal-600 transition-colors">
                        Log Activity
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Top 3 — special big cards */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {leaderboard.slice(0, 3).map((entry, index) => {
                          const isMe = user?.id === entry.user_id
                          const medals = ["🥇", "🥈", "🥉"]
                          const heights = ["h-52", "h-44", "h-40"]
                          const bgImg = sportBgs[entry.activity_type?.toLowerCase()] ?? sportBgs.default
                          return (
                            <Link key={entry.user_id} href={`/profile/${entry.user_id}`}
                              className={cn("group relative rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-shadow", heights[index])}
                            >
                              <img src={bgImg} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                              {/* Medal */}
                              <div className="absolute top-3 left-3 text-2xl">{medals[index]}</div>
                              {isMe && (
                                <div className="absolute top-3 right-3 bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">You</div>
                              )}
                              {/* Bottom */}
                              <div className="absolute bottom-0 left-0 right-0 p-4">
                                <p className="text-white font-black text-sm leading-none mb-1 truncate">{entry.profile?.full_name ?? "Unknown"}</p>
                                <p className="text-2xl font-black text-teal-400 leading-none">{entry.total_points.toLocaleString()}<span className="text-sm font-bold text-teal-300 ml-1">pts</span></p>
                              </div>
                            </Link>
                          )
                        })}
                      </div>

                      {/* Remaining rows */}
                      {leaderboard.slice(3).map((entry, index) => {
                        const isMe = user?.id === entry.user_id
                        const rank = index + 4
                        const level = getLevel(entry.total_points)
                        return (
                          <Link key={entry.user_id} href={`/profile/${entry.user_id}`}>
                            <div className={cn(
                              "flex items-center gap-4 rounded-2xl border px-5 py-4 transition-all hover:shadow-md hover:-translate-y-0.5",
                              isMe ? "border-teal-200 bg-teal-50/60" : "border-stone-200/50 bg-white hover:border-stone-300"
                            )}>
                              <span className="w-7 text-sm font-black text-stone-400 shrink-0 text-center">{rank}</span>
                              <div className="size-10 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center">
                                {entry.profile?.avatar_url
                                  ? <img src={entry.profile.avatar_url} className="size-full object-cover" />
                                  : <span className="text-sm font-black text-stone-400">{entry.profile?.full_name?.[0] ?? "?"}</span>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-slate-900 truncate text-[13px]">{entry.profile?.full_name ?? "Unknown"}</p>
                                  {isMe && <span className="text-[10px] font-black uppercase tracking-widest text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">You</span>}
                                </div>
                                <p className="text-[11px] text-stone-400 mt-0.5">{level.emoji} {level.name} · {entry.events_attended} events</p>
                              </div>
                              <p className={cn("text-lg font-black tabular-nums", isMe ? "text-teal-600" : "text-slate-900")}>
                                {entry.total_points.toLocaleString()}
                                <span className="text-xs font-bold text-stone-400 ml-1">pts</span>
                              </p>
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Right sidebar — 4 cols */}
                <aside className="col-span-4 space-y-5 sticky top-8">

                  {/* Your performance card */}
                  {user && userStats ? (
                    <div className="bg-slate-900 rounded-3xl p-6 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.05]"
                        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                      <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 mb-5">Your Performance</p>
                        <div className="grid grid-cols-2 gap-3 mb-5">
                          {[
                            { label: "Points",  value: userStats.total_points.toLocaleString(), accent: "text-teal-400" },
                            { label: "Rank",    value: userRank ? `#${userRank}` : "—",          accent: "text-white"   },
                            { label: "Events",  value: userStats.events_attended,                accent: "text-white"   },
                            { label: "Streak",  value: `${userStats.streak_weeks || 0}wk`,       accent: "text-orange-400" },
                          ].map(({ label, value, accent }) => (
                            <div key={label} className="bg-white/8 rounded-2xl p-4 border border-white/10">
                              <p className={cn("text-2xl font-black leading-none", accent)}>{value}</p>
                              <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mt-1.5">{label}</p>
                            </div>
                          ))}
                        </div>
                        {/* Level */}
                        {userLevel && (
                          <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-4 py-3 border border-white/10">
                            <span className="text-2xl">{userLevel.emoji}</span>
                            <div>
                              <p className="text-sm font-black text-white">{userLevel.name}</p>
                              <p className="text-[10px] text-white/40 font-medium">Level {getLevelNumber(userLevel)}</p>
                            </div>
                          </div>
                        )}
                        {/* Badges */}
                        {userBadges.length > 0 && (
                          <div className="mt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Badges</p>
                            <div className="flex flex-wrap gap-2">
                              {userBadges.map(ub => {
                                const badge = BADGES.find(b => b.id === ub.badge_id)
                                if (!badge) return null
                                return (
                                  <div key={ub.badge_id} className="flex items-center gap-1.5 bg-white/10 border border-white/10 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold">
                                    <span>{badge.emoji}</span> {badge.name}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-900 rounded-3xl p-8 text-center relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.05]"
                        style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                      <div className="relative z-10">
                        <Crown className="size-10 text-white/20 mx-auto mb-3" />
                        <p className="text-white font-black text-base mb-1">Start competing</p>
                        <p className="text-white/40 text-sm mb-5">Log your first activity to appear on the rankings.</p>
                        <Link href="/compete/log"
                          className="inline-flex items-center gap-2 bg-teal-500 text-slate-900 font-black text-[11px] uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-teal-400 transition-colors">
                          <Activity className="size-4" /> Log Activity
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Quick link to leagues */}
                  <button
                    onClick={() => setActiveTab("leagues")}
                    className="w-full bg-white rounded-3xl p-5 border border-stone-200/50 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                        <Trophy className="size-5 text-amber-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-black text-slate-900">My Leagues</p>
                        <p className="text-[11px] text-stone-400">{myLeagues.length} active league{myLeagues.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 text-stone-200 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </aside>
              </div>
            )}

            {/* ════════════════════════════
                LEAGUES TAB
            ════════════════════════════ */}
            {activeTab === "leagues" && (
              <div className="space-y-6">

                {/* Sub-nav + search */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex gap-1 bg-white rounded-2xl border border-stone-200/50 p-1 shadow-sm">
                    {(["mine", "discover"] as const).map(v => (
                      <button key={v} onClick={() => setLeagueView(v)}
                        className={cn(
                          "px-6 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-xl transition-all",
                          leagueView === v ? "bg-slate-900 text-white shadow-sm" : "text-stone-500 hover:text-slate-900"
                        )}>
                        {v === "mine" ? "My Leagues" : "Discover"}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                      <input
                        placeholder="Search leagues..."
                        value={leagueSearch}
                        onChange={e => setLeagueSearch(e.target.value)}
                        className="bg-white border border-stone-200/50 rounded-2xl pl-10 pr-5 py-3 text-sm font-medium placeholder:text-stone-400 focus:outline-none focus:border-teal-400 transition-colors shadow-sm w-64"
                      />
                    </div>
                    <Link href="/compete/leagues/create"
                      className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-black text-[11px] uppercase tracking-wider px-5 py-3 rounded-2xl transition-colors shadow-sm"
                    >
                      <Plus className="size-4 stroke-[2.5px]" /> Create
                    </Link>
                  </div>
                </div>

                {filteredLeagues.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-stone-200/50 shadow-sm py-24 flex flex-col items-center justify-center gap-4 text-center">
                    <Trophy className="size-12 text-stone-200" />
                    <h3 className="text-2xl font-black italic uppercase text-slate-900">No Leagues Found</h3>
                    <p className="text-stone-400 text-sm max-w-xs">
                      {leagueView === "mine" ? "You haven't joined any leagues yet." : "No public leagues match your search."}
                    </p>
                    {leagueView === "mine" && (
                      <Link href="/compete/leagues/create"
                        className="mt-2 flex items-center gap-2 bg-slate-900 text-white px-8 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-teal-600 transition-colors">
                        <Plus className="size-4" /> Create a League
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredLeagues.map(league => {
                      const primarySport = league.activity_type?.split(",")[0]?.trim()
                      const bgImg = sportBgs[primarySport?.toLowerCase()] ?? sportBgs.default
                      return (
                        <Link key={league.id} href={`/compete/leagues/${league.id}`} className="group block">
                          {/* Photo card — matches events page style */}
                          <div className="relative h-56 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300">
                            <img src={bgImg} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />

                            {/* Top pills */}
                            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                              <span className="text-2xl">{getSportEmoji(primarySport)}</span>
                              {league.is_public
                                ? <span className="bg-teal-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl flex items-center gap-1"><Globe className="size-3" /> Public</span>
                                : <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl flex items-center gap-1 border border-white/20"><Lock className="size-3" /> Private</span>
                              }
                            </div>

                            {/* Bottom content */}
                            <div className="absolute bottom-0 left-0 right-0 p-5">
                              <h3 className="text-lg font-black text-white uppercase italic tracking-tight leading-tight mb-2 line-clamp-1 group-hover:text-teal-300 transition-colors">
                                {league.name}
                              </h3>
                              <div className="flex items-center justify-between">
                                <p className="text-[11px] text-white/50 line-clamp-1 flex-1 mr-4">
                                  {league.description || "A competitive leaderboard."}
                                </p>
                                <div className="size-7 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center group-hover:bg-teal-500 group-hover:border-teal-500 transition-all shrink-0">
                                  <ArrowRight className="size-3.5 text-white" />
                                </div>
                              </div>
                              {/* Sport tags */}
                              {league.activity_type && (
                                <div className="flex gap-1.5 mt-3 flex-wrap">
                                  {league.activity_type.split(",").slice(0, 3).map((sport: string) => (
                                    <span key={sport} className="bg-white/15 backdrop-blur-sm text-white text-[10px] font-bold capitalize px-2.5 py-1 rounded-lg border border-white/10">
                                      {sport.trim()}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </Link>
                      )
                    })}

                    {/* Create new league CTA card */}
                    <Link href="/compete/leagues/create"
                      className="group block h-56 rounded-3xl border-2 border-dashed border-stone-300 hover:border-teal-400 bg-white/50 hover:bg-white flex flex-col items-center justify-center gap-3 transition-all shadow-sm hover:shadow-md"
                    >
                      <div className="size-12 rounded-2xl bg-stone-100 group-hover:bg-teal-50 flex items-center justify-center transition-colors">
                        <Plus className="size-6 text-stone-400 group-hover:text-teal-600" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-stone-500 group-hover:text-slate-900 uppercase tracking-wider transition-colors">Create League</p>
                        <p className="text-[11px] text-stone-400 mt-1">Start your own competition</p>
                      </div>
                    </Link>
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