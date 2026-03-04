"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { format, isToday, isTomorrow } from "date-fns"
import { User, MapPin, Calendar, Lock, Globe, Camera, ChevronRight, TrendingUp, Award, Zap, CheckCircle2 } from "lucide-react"
import { getLevel, BADGES } from "@/lib/points"
import Link from "next/link"

const ALL_CATEGORIES = ["padel", "running", "yoga", "tennis", "cycling", "crossfit", "swimming", "hiking"]
const TABS = ["overview", "activity", "schedule", "leagues"] as const
type Tab = typeof TABS[number]

const BADGE_COLORS: Record<string, string> = {
  first_event: "#0D9488", // Teal 600
  five_events: "#059669", // Emerald 600
  ten_events: "#0284C7",  // Light Blue
  first_win: "#EAB308",   // Yellow
  five_wins: "#10B981",   // Emerald 500
  explorer: "#06B6D4",    // Cyan
  streaker: "#F97316",    // Orange
  all_rounder: "#6366F1", // Indigo
}

const ACTIVITY_ICONS: Record<string, string> = {
  running: "↗", cycling: "⟳", swimming: "≋", hiking: "△",
  crossfit: "✕", padel: "◎", tennis: "◎", yoga: "☽",
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  return format(d, "EEE, MMM do")
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [activityLogs, setActivityLogs] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any[]>([])
  const [userBadges, setUserBadges] = useState<any[]>([])
  const [leagues, setLeagues] = useState<any[]>([])
  const [leagueMembers, setLeagueMembers] = useState<any[]>([])
  const [leaderboardRank, setLeaderboardRank] = useState<number | null>(null)
  const [braggingRights, setBraggingRights] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [form, setForm] = useState({
    full_name: "", location: "", bio: "",
    favourite_categories: [] as string[],
    is_public: true, avatar_url: "",
  })

  // Deep linking logic (e.g., from Dashboard)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedTab = params.get("tab") as Tab
    if (requestedTab && TABS.includes(requestedTab)) {
      setActiveTab(requestedTab)
    }
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      setUser(user)

      const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      if (profileData) {
        setProfile(profileData)
        setForm({
          full_name: profileData.full_name ?? user.user_metadata?.full_name ?? "",
          location: profileData.location ?? "",
          bio: profileData.bio ?? "",
          favourite_categories: profileData.favourite_categories ? profileData.favourite_categories.split(",").filter(Boolean) : [],
          is_public: profileData.is_public ?? true,
          avatar_url: profileData.avatar_url ?? "",
        })
      } else {
        const newProfile = { id: user.id, email: user.email, full_name: user.user_metadata?.full_name ?? "", is_public: true, created_at: new Date().toISOString() }
        await supabase.from("profiles").insert([newProfile])
        setProfile(newProfile)
        setForm({ full_name: newProfile.full_name, location: "", bio: "", favourite_categories: [], is_public: true, avatar_url: "" })
      }

      const { data: regs } = await supabase.from("registrations").select("*").eq("user_id", user.id).order("registered_at", { ascending: false })
      if (regs && regs.length > 0) {
        const { data: eventData } = await supabase.from("events").select("*").in("id", regs.map(r => r.event_id))
        setRegistrations(regs.map(r => ({ ...r, events: eventData?.find(e => e.id === r.event_id) ?? null })))
      }

      const { data: logs } = await supabase.from("activity_logs").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(20)
      setActivityLogs(logs || [])

      const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", user.id)
      setUserStats(stats || [])

      const { data: badges } = await supabase.from("user_badges").select("*").eq("user_id", user.id)
      setUserBadges(badges || [])

      const { data: memberData } = await supabase.from("league_members").select("*, leagues(*)").eq("user_id", user.id)
      if (memberData && memberData.length > 0) {
        setLeagues(memberData.map(m => m.leagues).filter(Boolean))
        setLeagueMembers(memberData)
      }

      const { data: allStats } = await supabase.from("user_stats").select("user_id, total_points, activity_type")
      if (allStats) {
        const aggregated: Record<string, number> = {}
        allStats.forEach(s => { aggregated[s.user_id] = (aggregated[s.user_id] || 0) + (s.total_points || 0) })
        const sorted = Object.entries(aggregated).sort((a, b) => b[1] - a[1])
        const rank = sorted.findIndex(([uid]) => uid === user.id)
        if (rank !== -1) setLeaderboardRank(rank + 1)

        const activityTotals: Record<string, Record<string, number>> = {}
        allStats.forEach(s => {
          if (!activityTotals[s.activity_type]) activityTotals[s.activity_type] = {}
          activityTotals[s.activity_type][s.user_id] = (activityTotals[s.activity_type][s.user_id] || 0) + (s.total_points || 0)
        })
        for (const [activity, totals] of Object.entries(activityTotals)) {
          const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]
          if (top && top[0] === user.id && top[1] > 0) {
            setBraggingRights(`#1 ${activity.charAt(0).toUpperCase() + activity.slice(1)}`)
            break
          }
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    await supabase.from("profiles").upsert({ id: user.id, email: user.email, ...form, favourite_categories: form.favourite_categories.join(",") })
    setProfile({ ...profile, ...form })
    setEditing(false)
    setSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fileName = `${user.id}-${Date.now()}.${file.name.split(".").pop()}`
    const { error } = await supabase.storage.from("avatars").upload(fileName, file)
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
      setForm({ ...form, avatar_url: data.publicUrl })
    }
  }

  function toggleCategory(cat: string) {
    setForm(prev => ({
      ...prev,
      favourite_categories: prev.favourite_categories.includes(cat)
        ? prev.favourite_categories.filter(c => c !== cat)
        : [...prev.favourite_categories, cat]
    }))
  }

  const today = new Date().toISOString().split("T")[0]
  const upcomingEvents = registrations.filter(r => r.events && r.events.date >= today)
  const pastEvents = registrations.filter(r => r.events && r.events.date < today)
  const totalPoints = userStats.reduce((sum, s) => sum + (s.total_points || 0), 0)
  const totalEvents = userStats.reduce((sum, s) => sum + (s.events_attended || 0), 0)
  const totalMatches = userStats.reduce((sum, s) => sum + (s.matches_played || 0), 0)
  const totalWins = userStats.reduce((sum, s) => sum + (s.matches_won || 0), 0)
  const maxStreak = Math.max(...userStats.map(s => s.streak_weeks || 0), 0)
  const level = getLevel(totalPoints)
  const progressPct = level.max !== Infinity ? Math.min(((totalPoints - level.min) / (level.max - level.min)) * 100, 100) : 100

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh] bg-slate-50/50">
      <div className="size-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 font-sans">
      <div className="mx-auto max-w-3xl px-6 py-12">

        {/* Bragging rights */}
        {braggingRights && (
          <Link href="/compete" className="group inline-flex items-center gap-2 mb-8 rounded-full border border-teal-100 bg-teal-50 px-5 py-2 text-sm hover:border-teal-200 transition-colors shadow-sm">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-teal-900">{braggingRights}</span>
            <span className="text-teal-700/70">· #1 on leaderboard</span>
            <ChevronRight className="size-4 text-teal-600 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {/* Profile header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10 bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="size-20 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 p-1 shadow-md">
                <div className="size-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                  {form.avatar_url
                    ? <img src={form.avatar_url} alt="Avatar" className="size-full object-cover" />
                    : <User className="size-8 text-teal-300" />
                  }
                </div>
              </div>
              {editing && (
                <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-teal-600 p-2 shadow-lg hover:bg-teal-700 transition-colors border-2 border-white">
                  <Camera className="size-4 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              )}
            </div>
            <div>
              {editing
                ? <input className="text-2xl font-black bg-transparent border-b-2 border-teal-200 focus:border-teal-500 outline-none w-full" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your name" />
                : <h1 className="text-2xl font-black tracking-tight text-slate-900">{form.full_name || "Set your name"}</h1>
              }
              <div className="flex items-center gap-3 mt-2 text-sm text-slate-500 font-medium">
                {form.location && <span className="flex items-center gap-1.5"><MapPin className="size-4 text-slate-400" />{form.location}</span>}
                {form.location && <span className="text-slate-300">|</span>}
                <span className="flex items-center gap-1.5">
                  {form.is_public ? <Globe className="size-4 text-slate-400" /> : <Lock className="size-4 text-slate-400" />}
                  {form.is_public ? "Public Profile" : "Private"}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => editing ? handleSave() : setEditing(true)} disabled={saving} className="text-sm font-bold px-6 py-2.5 rounded-full border-2 border-slate-200 hover:border-teal-600 hover:text-teal-700 transition-colors disabled:opacity-50 sm:w-auto w-full">
            {saving ? "Saving..." : editing ? "Save Changes" : "Edit Profile"}
          </button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { value: totalPoints.toLocaleString(), label: "Total Points", color: "text-teal-600" },
            { value: leaderboardRank ? `#${leaderboardRank}` : "—", label: "Global Rank", color: "text-slate-800" },
            { value: totalEvents, label: "Events Joined", color: "text-slate-800" },
            { value: maxStreak > 0 ? `${maxStreak}w` : "—", label: "Best Streak", color: "text-orange-500" },
          ].map(({ value, label, color }) => (
            <div key={label} className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
              <p className={`text-3xl font-black tracking-tight mb-1 ${color}`}>{value}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>

        {/* Level Progress */}
        <div className="mb-8 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-widest text-teal-700">{level.name}</span>
              <span className="text-sm font-medium text-slate-400">· {totalPoints} pts</span>
            </div>
            {level.max !== Infinity && (
              <span className="text-sm font-bold text-slate-500">{level.max - totalPoints + 1} points to next level</span>
            )}
          </div>
          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-700" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 mb-8 overflow-x-auto pb-px" style={{ scrollbarWidth: "none" }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-black capitalize transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab ? "border-teal-500 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab === "schedule" ? "My Schedule" : tab}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="space-y-8">

            {/* Edit fields */}
            {editing && (
              <div className="space-y-4 rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6 sm:p-8">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Edit Details</h2>
                <div className="flex items-center gap-4">
                  <MapPin className="size-5 text-slate-400 shrink-0" />
                  <input className="text-base bg-transparent border-b-2 border-slate-100 focus:border-teal-500 outline-none w-full py-2 font-medium" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Your city" />
                </div>
                <div className="flex items-start gap-4 pt-2">
                  <User className="size-5 text-slate-400 shrink-0 mt-2" />
                  <textarea className="text-base bg-transparent border-b-2 border-slate-100 focus:border-teal-500 outline-none w-full resize-none py-2 font-medium" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Write a short bio about your fitness goals..." rows={3} />
                </div>
                <div className="flex items-center gap-4 pt-4 border-t border-slate-100 mt-2">
                  <span className="text-base font-medium text-slate-700">Public profile</span>
                  <button onClick={() => setForm({ ...form, is_public: !form.is_public })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_public ? "bg-teal-500" : "bg-slate-200"}`}>
                    <span className={`inline-block size-4 rounded-full bg-white transition-transform ${form.is_public ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </div>
            )}

            {/* Bio */}
            {!editing && form.bio && (
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
                <p className="text-base text-slate-600 leading-relaxed font-medium">{form.bio}</p>
              </div>
            )}

            {/* Activities */}
            <div>
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">Favourite Sports</h2>
              <div className="flex flex-wrap gap-2.5">
                {ALL_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => editing && toggleCategory(cat)}
                    className={`rounded-full px-5 py-2 text-sm font-bold capitalize transition-all ${
                      form.favourite_categories.includes(cat)
                        ? "bg-teal-600 text-white shadow-md"
                        : "bg-white border border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-700"
                    } ${editing ? "cursor-pointer" : "cursor-default"}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Trophy cabinet */}
            <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-slate-800 tracking-tight">Trophy Cabinet</h2>
                <span className="text-sm font-bold text-teal-600 bg-teal-50 px-3 py-1 rounded-full">{userBadges.length}/{BADGES.length} Unlocked</span>
              </div>

              {/* Earned */}
              {userBadges.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {userBadges.map(ub => {
                    const badge = BADGES.find(b => b.id === ub.badge_id)
                    if (!badge) return null
                    const color = BADGE_COLORS[badge.id] ?? "#0D9488"
                    return (
                      <div key={ub.badge_id} className="rounded-3xl border border-slate-100 p-5 flex flex-col items-center gap-2 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 4 }}>
                        <span className="text-3xl">{badge.emoji}</span>
                        <p className="text-sm font-black leading-tight text-slate-800 mt-1">{badge.name}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{format(new Date(ub.earned_at), "MMM d")}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Locked */}
              <div className="space-y-2">
                {BADGES.filter(b => !userBadges.find(ub => ub.badge_id === b.id)).map(badge => (
                  <div key={badge.id} className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-slate-50 opacity-60">
                    <div className="size-10 rounded-xl bg-slate-200 flex items-center justify-center text-lg grayscale">{badge.emoji}</div>
                    <div className="flex-1">
                      <span className="text-base font-bold text-slate-600">{badge.name}</span>
                      <span className="text-sm font-medium text-slate-400 ml-2">{badge.description}</span>
                    </div>
                    <Lock className="size-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ACTIVITY ── */}
        {activeTab === "activity" && (
          <div className="space-y-8">

            {/* Streak */}
            {maxStreak > 0 && (
              <div className="flex items-center gap-6 rounded-[2rem] bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 p-6 sm:p-8 shadow-sm">
                <div className="text-5xl font-black tabular-nums text-orange-500">{maxStreak}</div>
                <div className="flex-1">
                  <p className="font-black text-slate-800 text-lg">Week streak</p>
                  <p className="text-sm font-medium text-orange-600 mt-1">
                    {maxStreak >= 8 ? "On fire — don't break it 🔥" :
                     maxStreak >= 4 ? "Great momentum, keep going!" :
                     "Log this week to extend your streak."}
                  </p>
                </div>
                <div className="hidden sm:flex gap-1.5">
                  {Array.from({ length: Math.min(maxStreak, 8) }).map((_, i) => (
                    <div key={i} className="w-2.5 rounded-full bg-orange-400" style={{ height: `${24 + (i / Math.max(maxStreak - 1, 1)) * 24}px`, opacity: 0.4 + (i / Math.max(maxStreak - 1, 1)) * 0.6 }} />
                  ))}
                </div>
              </div>
            )}

            {/* Per sport stats */}
            {userStats.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">Stats By Sport</h2>
                <div className="space-y-3">
                  {userStats.sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).map(stat => (
                    <div key={stat.id} className="flex items-center gap-5 bg-white rounded-3xl px-6 py-5 shadow-sm border border-slate-100">
                      <div className="size-12 rounded-xl bg-teal-50 flex items-center justify-center text-xl font-mono font-bold text-teal-600">
                        {ACTIVITY_ICONS[stat.activity_type] ?? "·"}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-black capitalize text-slate-800">{stat.activity_type}</p>
                        <p className="text-sm font-medium text-slate-500 mt-0.5">
                          {stat.events_attended || 0} events
                          {stat.matches_played > 0 ? ` · ${stat.matches_won}W ${stat.matches_played - stat.matches_won}L` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black tabular-nums text-teal-600">{stat.total_points || 0}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity feed */}
            <div>
              <div className="flex items-center justify-between mb-4 ml-2">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Recent Activity</h2>
                <Link href="/compete/log" className="text-sm font-bold text-teal-600 hover:text-teal-800">+ Log new</Link>
              </div>
              {activityLogs.length === 0 ? (
                <div className="rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center bg-white">
                  <p className="text-lg font-medium text-slate-500 mb-3">No activity logged yet</p>
                  <Link href="/compete/log" className="text-base font-bold text-teal-600 hover:text-teal-800">Log your first activity →</Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLogs.map(log => (
                    <div key={log.id} className="flex items-center gap-4 bg-white rounded-3xl px-5 py-4 shadow-sm border border-slate-100">
                      <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-lg font-mono font-bold text-slate-400">
                        {ACTIVITY_ICONS[log.activity_type] ?? "·"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-bold capitalize text-slate-800 line-clamp-1">
                          {log.log_type === "match_win" ? "Won · " : log.log_type === "match_loss" ? "Lost · " : ""}{log.activity_type}
                          {log.distance ? ` · ${log.distance}km` : ""}
                          {log.duration_mins ? ` · ${log.duration_mins}min` : ""}
                        </p>
                        {log.notes && <p className="text-sm text-slate-500 mt-0.5 truncate">{log.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-base font-black text-emerald-500">+{log.points}</p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">{format(new Date(log.logged_at), "MMM d")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SCHEDULE ── */}
        {activeTab === "schedule" && (
          <div className="space-y-12">
            
            {/* UPCOMING */}
            <div>
              <div className="flex items-center justify-between mb-6 ml-2">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Upcoming ({upcomingEvents.length})</h2>
                {upcomingEvents.length > 0 && <Link href="/events" className="text-sm font-bold text-teal-600 hover:text-teal-800">+ Find more</Link>}
              </div>
              
              {upcomingEvents.length === 0 ? (
                <div className="rounded-[2rem] bg-teal-50 border-2 border-dashed border-teal-200 p-12 text-center">
                  <p className="text-xl font-black text-teal-900 mb-2">Nothing booked yet</p>
                  <p className="text-teal-700/70 text-base mb-6">Your schedule is wide open. Go find something fun to do!</p>
                  <Link href="/events" className="inline-flex items-center gap-2 rounded-full bg-teal-600 text-white px-8 py-3 text-base font-bold hover:bg-teal-700 shadow-md hover:shadow-lg transition-all">
                    Browse Events
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {upcomingEvents.map(reg => (
                    <Link key={reg.id} href={`/events/${reg.events.id}`} className="flex flex-col justify-between bg-white rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="size-16 rounded-2xl bg-slate-100 shrink-0 overflow-hidden">
                          {reg.events.image ? <img src={reg.events.image} alt="" className="size-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="size-full flex items-center justify-center text-2xl">🏆</div>}
                        </div>
                        <div className="flex-1 min-w-0 pt-1">
                          <h4 className="font-black text-slate-800 text-lg line-clamp-2 leading-tight group-hover:text-teal-600 transition-colors">{reg.events.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-50 pt-4">
                        <div className="flex items-center gap-3">
                           <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${isToday(new Date(reg.events.date)) ? 'bg-lime-100 text-lime-800' : 'bg-teal-50 text-teal-700'}`}>
                             {formatEventDate(reg.events.date)}
                           </span>
                           <span className="text-sm text-slate-500 font-medium flex items-center gap-1 truncate"><MapPin className="size-3.5" /> {reg.events.location}</span>
                        </div>
                        <CheckCircle2 className="size-5 text-emerald-500 opacity-30 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* PAST EVENTS */}
            {pastEvents.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 ml-2">Completed ({pastEvents.length})</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-75">
                  {pastEvents.map(reg => (
                    <Link key={reg.id} href={`/events/${reg.events.id}`} className="flex items-center gap-4 bg-white rounded-3xl p-4 border border-slate-200 hover:border-slate-300 hover:opacity-100 transition-all group grayscale hover:grayscale-0">
                      <div className="size-14 rounded-xl bg-slate-100 shrink-0 overflow-hidden">
                        {reg.events.image ? <img src={reg.events.image} alt="" className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-xl">✅</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-600 text-base truncate">{reg.events.title}</h4>
                        <p className="text-xs text-slate-400 font-medium">{format(new Date(reg.events.date), "MMM d, yyyy")}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LEAGUES ── */}
        {activeTab === "leagues" && (
          <div className="space-y-4">
            {leagues.length === 0 ? (
              <div className="rounded-[2rem] border-2 border-dashed border-slate-200 p-12 text-center bg-white">
                <p className="text-xl font-black text-slate-800 mb-2">No leagues yet</p>
                <p className="text-base text-slate-500 mb-6">Challenge friends, track results, and climb the table.</p>
                <Link href="/compete/leagues" className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-8 py-3 text-base font-bold hover:bg-slate-800 shadow-md transition-all">
                  Create or Join a League
                </Link>
              </div>
            ) : (
              leagues.map(league => {
                const member = leagueMembers.find(m => m.league_id === league.id)
                const winRate = member?.matches_played > 0 ? Math.round((member.matches_won / member.matches_played) * 100) : 0
                return (
                  <Link key={league.id} href={`/compete/leagues/${league.id}`} className="block">
                    <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 hover:border-teal-300 hover:shadow-md transition-all group">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                        <div>
                          <h3 className="text-xl font-black text-slate-800 group-hover:text-teal-700 transition-colors">{league.name}</h3>
                          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">{league.activity_type}</p>
                        </div>
                        <div className="sm:text-right bg-slate-50 sm:bg-transparent rounded-2xl p-4 sm:p-0">
                          <span className="text-4xl font-black tabular-nums text-teal-600">{member?.total_points || 0}</span>
                          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1.5">pts</span>
                        </div>
                      </div>
                      
                      {member?.matches_played > 0 && (
                        <div className="flex items-center gap-4 text-sm font-bold">
                          <span className="text-emerald-600 w-8">{member.matches_won}W</span>
                          <span className="text-slate-400 w-8">{member.matches_played - member.matches_won}L</span>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${winRate}%` }} />
                          </div>
                          <span className="text-slate-600 w-12 text-right">{winRate}%</span>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })
            )}
            
            {leagues.length > 0 && (
              <Link href="/compete/leagues" className="flex items-center justify-center gap-2 rounded-[2rem] border-2 border-dashed border-slate-200 py-6 text-base font-bold text-slate-500 hover:text-teal-700 hover:border-teal-200 hover:bg-teal-50/50 transition-all mt-6">
                + Create or join another league
              </Link>
            )}
          </div>
        )}

      </div>
    </div>
  )
}