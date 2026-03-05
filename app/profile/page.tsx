"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { format, isToday, isTomorrow, isPast, isFuture } from "date-fns"
import { User, MapPin, Calendar, Lock, Globe, Camera, ChevronRight, TrendingUp, Award, Zap, CheckCircle2, Edit3, Activity, Trophy, Flame, Crown, Clock } from "lucide-react"
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

      // Profile load
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

      // Event registrations load
      const { data: regs } = await supabase.from("registrations").select("*").eq("user_id", user.id).order("registered_at", { ascending: false })
      if (regs && regs.length > 0) {
        const { data: eventData } = await supabase.from("events").select("*").in("id", regs.map(r => r.event_id))
        setRegistrations(regs.map(r => ({ ...r, events: eventData?.find(e => e.id === r.event_id) ?? null })))
      }

      // Activity logs load
      const { data: logs } = await supabase.from("activity_logs").select("*").eq("user_id", user.id).order("logged_at", { ascending: false }).limit(20)
      setActivityLogs(logs || [])

      // Base user stats
      const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", user.id)
      setUserStats(stats || [])

      // Badges
      const { data: badges } = await supabase.from("user_badges").select("*").eq("user_id", user.id)
      setUserBadges(badges || [])

      // Leagues Load (Your custom fix!)
      const { data: memberData } = await supabase.from("league_members").select("*, leagues(*)").eq("user_id", user.id)
      if (memberData && memberData.length > 0) {
        setLeagues(memberData.map(m => m.leagues).filter(Boolean))
        setLeagueMembers(memberData)
      }

      // Global Rank Calculation & Bragging Rights (Original Logic Maintained!)
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

  // --- Derived stats ---
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
    <div className="min-h-screen bg-slate-50/50 font-sans pb-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-16">
        
        {/* Bragging rights */}
        {braggingRights && (
          <Link href="/compete" className="group inline-flex items-center gap-2 mb-8 rounded-full border border-teal-100 bg-teal-50 px-5 py-2 text-sm hover:border-teal-200 transition-colors shadow-sm animate-in fade-in slide-in-from-top-4">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-teal-900">{braggingRights}</span>
            <span className="text-teal-700/70">· #1 on leaderboard</span>
            <ChevronRight className="size-4 text-teal-600 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {/* ── HEADER & PROFILE INFO ── */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mb-10 bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left w-full">
            <div className="relative shrink-0">
              <div className="size-24 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 p-1 shadow-md">
                <div className="size-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                  {form.avatar_url
                    ? <img src={form.avatar_url} alt="Avatar" className="size-full object-cover" />
                    : <User className="size-10 text-teal-300" />
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
            
            <div className="pt-2 flex-1 w-full">
              {editing ? (
                 <input className="text-3xl font-black bg-transparent border-b-2 border-teal-200 focus:border-teal-500 outline-none w-full text-center md:text-left mb-2" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your name" />
              ) : (
                 <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{form.full_name || "Set your name"}</h1>
              )}
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm font-medium text-slate-500">
                <span className="flex items-center gap-1.5">
                  {form.is_public ? <Globe className="size-4" /> : <Lock className="size-4" />} 
                  {form.is_public ? "Public Profile" : "Private Profile"}
                </span>
                {form.location && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {form.location}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => editing ? handleSave() : setEditing(true)} 
            disabled={saving} 
            className="flex items-center justify-center gap-2 rounded-full border-2 border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-700 hover:border-teal-400 hover:text-teal-700 transition-all shadow-sm disabled:opacity-50 shrink-0 w-full md:w-auto"
          >
            <Edit3 className="size-4" /> {saving ? "Saving..." : editing ? "Save Changes" : "Edit Profile"}
          </button>
        </div>

        {/* ── STATS BENTO ── */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100 mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
            <div className="text-center sm:border-r border-slate-100">
              <p className="text-3xl font-black text-teal-600 tracking-tight">{totalPoints.toLocaleString()}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Points</p>
            </div>
            <div className="text-center sm:border-r border-slate-100">
              <p className="text-3xl font-black text-slate-800 tracking-tight">{leaderboardRank ? `#${leaderboardRank}` : "—"}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Global Rank</p>
            </div>
            <div className="text-center sm:border-r border-slate-100">
              <p className="text-3xl font-black text-slate-800 tracking-tight">{totalEvents}</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Events</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-orange-500 tracking-tight flex items-center justify-center gap-1">
                {maxStreak > 0 ? maxStreak : "—"} {maxStreak > 0 && <Flame className="size-6" fill="currentColor"/>}
              </p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Wk Streak</p>
            </div>
          </div>

          {/* Level Progress */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{level.emoji}</span>
                <span className="font-black text-slate-800 uppercase tracking-wider text-sm">{level.name}</span>
              </div>
              {level.max !== Infinity && (
                <span className="text-xs font-bold text-slate-500">{level.max - totalPoints + 1} points to next level</span>
              )}
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-2 border-b border-slate-200 mb-8 overflow-x-auto pb-px" style={{ scrollbarWidth: "none" }}>
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "activity", label: "Activity Log", icon: Clock },
            { id: "schedule", label: "Schedule", icon: Calendar },
            { id: "leagues", label: "Leagues", icon: Trophy },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-black transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? "border-teal-500 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <tab.icon className="size-4.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ── */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-8">

              {/* Edit fields */}
              {editing && (
                <div className="space-y-4 rounded-[2rem] bg-white border border-slate-100 shadow-sm p-6 sm:p-8">
                  <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Edit Details</h2>
                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl">
                    <MapPin className="size-5 text-slate-400 shrink-0 ml-2" />
                    <input className="text-base bg-transparent border-none outline-none w-full font-medium" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Your city" />
                  </div>
                  <div className="flex items-start gap-4 bg-slate-50 p-3 rounded-xl pt-4">
                    <User className="size-5 text-slate-400 shrink-0 ml-2" />
                    <textarea className="text-base bg-transparent border-none outline-none w-full resize-none font-medium" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Write a short bio about your fitness goals..." rows={3} />
                  </div>
                  <div className="flex items-center justify-between p-2 pt-4">
                    <span className="text-base font-bold text-slate-700">Make my profile public</span>
                    <button onClick={() => setForm({ ...form, is_public: !form.is_public })} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${form.is_public ? "bg-teal-500" : "bg-slate-300"}`}>
                      <span className={`inline-block size-5 rounded-full bg-white transition-transform ${form.is_public ? "translate-x-6" : "translate-x-1"}`} />
                    </button>
                  </div>
                </div>
              )}

              {/* Bio */}
              {!editing && form.bio && (
                <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
                  <p className="text-base text-slate-600 leading-relaxed font-medium whitespace-pre-line">{form.bio}</p>
                </div>
              )}

              {/* Favourite Sports */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Favourite Sports</h2>
                {form.favourite_categories.length === 0 && !editing ? (
                  <p className="text-slate-500 font-medium">No favourite sports selected yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    {ALL_CATEGORIES.map(cat => {
                      const isSelected = form.favourite_categories.includes(cat);
                      if (!editing && !isSelected) return null; // Hide unselected when not editing
                      return (
                        <button
                          key={cat}
                          onClick={() => editing && toggleCategory(cat)}
                          className={`rounded-full px-5 py-2.5 text-sm font-bold capitalize transition-all ${
                            isSelected
                              ? "bg-teal-600 text-white shadow-md"
                              : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"
                          } ${editing ? "cursor-pointer" : "cursor-default"}`}
                        >
                          {cat}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Trophy cabinet (Original badge logic preserved) */}
              <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">Trophy Cabinet</h2>
                  <span className="text-sm font-bold text-teal-600 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-100">{userBadges.length}/{BADGES.length} Unlocked</span>
                </div>

                {/* Earned Badges */}
                {userBadges.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {userBadges.map(ub => {
                      const badge = BADGES.find(b => b.id === ub.badge_id)
                      if (!badge) return null
                      const color = BADGE_COLORS[badge.id] ?? "#0D9488"
                      return (
                        <div key={ub.badge_id} className="rounded-3xl border border-slate-100 p-5 flex flex-col items-center gap-2 text-center shadow-sm hover:shadow-md transition-shadow" style={{ borderTopColor: color, borderTopWidth: 4 }}>
                          <span className="text-4xl">{badge.emoji}</span>
                          <p className="text-sm font-black leading-tight text-slate-800 mt-1">{badge.name}</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{format(new Date(ub.earned_at), "MMM d")}</p>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Locked Badges */}
                <div className="space-y-3 pt-6 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Locked Badges</p>
                  {BADGES.filter(b => !userBadges.find(ub => ub.badge_id === b.id)).map(badge => (
                    <div key={badge.id} className="flex items-center gap-4 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 opacity-75">
                      <div className="size-12 rounded-xl bg-slate-200 flex items-center justify-center text-xl grayscale">{badge.emoji}</div>
                      <div className="flex-1">
                        <span className="text-sm font-bold text-slate-700">{badge.name}</span>
                        <span className="block text-xs font-medium text-slate-500 mt-0.5">{badge.description}</span>
                      </div>
                      <Lock className="size-4 text-slate-300" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ACTIVITY LOG TAB */}
          {activeTab === "activity" && (
            <div className="space-y-8">
              {/* Per sport stats */}
              {userStats.length > 0 && (
                <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-slate-100">
                  <h2 className="text-xl font-black text-slate-800 mb-6">Stats By Sport</h2>
                  <div className="space-y-4">
                    {userStats.sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).map(stat => (
                      <div key={stat.id} className="flex items-center gap-5 bg-slate-50 rounded-2xl px-6 py-5 border border-slate-100 hover:border-teal-200 transition-colors">
                        <div className="size-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl font-mono font-bold text-slate-500 shadow-sm">
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
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Activity feed */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 sm:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-black text-slate-800">Timeline</h2>
                  <Link href="/compete/log" className="text-sm font-bold text-white bg-teal-600 px-5 py-2 rounded-full hover:bg-teal-700 shadow-sm transition-colors">+ Log new</Link>
                </div>
                
                {activityLogs.length === 0 ? (
                  <div className="rounded-[1.5rem] border-2 border-dashed border-slate-200 p-12 text-center bg-slate-50">
                    <p className="text-lg font-medium text-slate-500 mb-3">No activity logged yet</p>
                    <Link href="/compete/log" className="text-base font-bold text-teal-600 hover:text-teal-800">Log your first activity →</Link>
                  </div>
                ) : (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.4rem] before:-translate-x-px before:h-full before:w-[2px] before:bg-gradient-to-b before:from-teal-100 before:to-transparent">
                    {activityLogs.map(log => (
                      <div key={log.id} className="relative flex items-start gap-5">
                        <div className="relative z-10 size-12 rounded-full bg-white border-[3px] border-white shadow-sm overflow-hidden flex items-center justify-center ring-1 ring-slate-200">
                          <span className="text-lg font-bold text-slate-500">{ACTIVITY_ICONS[log.activity_type] ?? "·"}</span>
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-3xl p-5 border border-slate-100 hover:border-teal-200 transition-colors">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-slate-800 capitalize text-lg">
                              {log.log_type === "match_win" ? "Won " : log.log_type === "match_loss" ? "Lost " : ""}{log.activity_type}
                            </h4>
                            <span className="text-xs font-black text-teal-700 bg-teal-100 px-2.5 py-1 rounded-md">+{log.points} pts</span>
                          </div>
                          <p className="text-sm font-medium text-slate-500 mb-2">
                            {log.duration_mins && `${log.duration_mins} mins`} 
                            {log.duration_mins && log.distance && " · "}
                            {log.distance && `${log.distance} km`}
                          </p>
                          {log.notes && <p className="text-sm text-slate-600 italic border-l-2 border-slate-200 pl-3 mt-3">"{log.notes}"</p>}
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">{format(new Date(log.logged_at), "MMM do, h:mm a")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SCHEDULE TAB */}
          {activeTab === "schedule" && (
            <div className="space-y-8">
              {/* UPCOMING */}
              <div>
                <div className="flex items-center justify-between mb-4 ml-2">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Upcoming ({upcomingEvents.length})</h3>
                  <Link href="/events" className="text-sm font-bold text-teal-600 hover:text-teal-800 bg-teal-50 px-4 py-1.5 rounded-full transition-colors">+ Find Events</Link>
                </div>
                
                {upcomingEvents.length === 0 ? (
                  <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100 shadow-sm">
                    <p className="text-xl font-black text-slate-800 mb-2">Schedule is clear</p>
                    <p className="text-slate-500 font-medium mb-6">You don't have any upcoming events booked.</p>
                    <Link href="/events" className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-8 py-3 text-base font-bold hover:bg-slate-800 shadow-md transition-all">
                      Browse Calendar
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {upcomingEvents.map(reg => (
                      <Link key={reg.id} href={`/events/${reg.events.id}`} className="flex flex-col justify-between bg-white rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 group">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="size-16 rounded-2xl bg-slate-100 shrink-0 overflow-hidden border border-slate-200">
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
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 ml-2">Completed ({pastEvents.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-75">
                    {pastEvents.map(reg => (
                      <Link key={reg.id} href={`/events/${reg.events.id}`} className="flex items-center gap-4 bg-white rounded-3xl p-4 border border-slate-200 hover:border-slate-300 hover:opacity-100 transition-all group grayscale hover:grayscale-0">
                        <div className="size-14 rounded-xl bg-slate-100 shrink-0 overflow-hidden">
                          {reg.events.image ? <img src={reg.events.image} alt="" className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-xl">✅</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-600 text-base truncate">{reg.events.title}</h4>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">{format(new Date(reg.events.date), "MMM d, yyyy")}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LEAGUES TAB */}
          {activeTab === "leagues" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4 ml-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">My Leagues</h3>
                <Link href="/compete?tab=leagues" className="text-sm font-bold text-teal-600 hover:text-teal-800 bg-teal-50 px-4 py-1.5 rounded-full transition-colors">Find more</Link>
              </div>
              
              {leagues.length === 0 ? (
                <div className="bg-white rounded-[2rem] p-12 text-center border border-slate-100 shadow-sm">
                  <Crown className="size-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-xl font-black text-slate-800 mb-2">No active leagues</p>
                  <p className="text-lg font-medium text-slate-500 mb-6">Challenge friends, track results, and climb the table.</p>
                  <Link href="/compete?tab=leagues" className="inline-block rounded-full bg-teal-600 text-white px-8 py-3.5 text-base font-bold shadow-md hover:bg-teal-700 transition-all">
                    Browse Leagues
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {leagues.map(league => {
                    const member = leagueMembers.find(m => m.league_id === league.id)
                    const winRate = member?.matches_played > 0 ? Math.round((member.matches_won / member.matches_played) * 100) : 0
                    return (
                      <Link key={league.id} href={`/compete/leagues/${league.id}`} className="group block h-full">
                        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:border-teal-300 hover:shadow-md transition-all duration-300 h-full flex flex-col">
                          <div className="flex justify-between items-start mb-6">
                            <div className="size-12 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-xl flex items-center justify-center text-xl shadow-sm">
                              {league.activity_type?.includes('padel') ? '🎾' : league.activity_type?.includes('running') ? '🏃' : '🏆'}
                            </div>
                            <div className="text-right">
                              <span className="text-3xl font-black tabular-nums text-teal-600 leading-none">{member?.total_points || 0}</span>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Your Points</span>
                            </div>
                          </div>
                          
                          <h3 className="text-lg font-black text-slate-800 mb-1 group-hover:text-teal-600 transition-colors line-clamp-1">{league.name}</h3>
                          
                          <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
                            {league.is_public ? (
                              <span className="flex items-center gap-1 text-teal-700 bg-teal-50 px-2 py-0.5 rounded text-xs font-bold"><Globe className="size-3" /> Public</span>
                            ) : (
                              <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs font-bold"><Lock className="size-3" /> Private</span>
                            )}
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{league.scoring_mode} Scoring</span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}