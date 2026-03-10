"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { format, isToday, isTomorrow } from "date-fns"
import { 
  User, MapPin, Calendar, Lock, Globe, Camera, ChevronRight, 
  Edit3, Activity, Trophy, Flame, Crown, Clock, Hash,
  Settings, Share2, Plus, CheckCircle2
} from "lucide-react"
import { getLevel, BADGES } from "@/lib/points"
import Link from "next/link"
import { cn } from "@/lib/utils"

const ALL_CATEGORIES = ["padel", "running", "yoga", "tennis", "cycling", "crossfit", "swimming", "hiking"]
const TABS = ["overview", "activity", "schedule", "leagues"] as const
type Tab = typeof TABS[number]

const BADGE_COLORS: Record<string, string> = {
  first_event: "#0D9488", five_events: "#059669", ten_events: "#0284C7",
  first_win: "#EAB308", five_wins: "#10B981", explorer: "#06B6D4",
  streaker: "#F97316", all_rounder: "#6366F1",
}

const ACTIVITY_ICONS: Record<string, string> = {
  running: "🏃", cycling: "🚲", swimming: "🏊", hiking: "🥾",
  crossfit: "🏋️", padel: "🎾", tennis: "🎾", yoga: "🧘",
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
      }

      setLoading(false)
    }
    load()
  }, [router])

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
  const maxStreak = Math.max(...userStats.map(s => s.streak_weeks || 0), 0)
  
  const level = getLevel(totalPoints)
  const progressPct = level.max !== Infinity ? Math.min(((totalPoints - level.min) / (level.max - level.min)) * 100, 100) : 100

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh] bg-[#F5FFFC]">
      <div className="size-10 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F5FFFC] pb-32">
      
      {/* ── PROFILE HERO ── */}
      <div className="relative h-64 w-full overflow-hidden bg-gradient-to-br from-orange-50 via-white to-teal-100">
        <div className="absolute top-[-20%] right-[-5%] w-[500px] h-[500px] rounded-full bg-teal-200/50 blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-5%] w-[400px] h-[400px] rounded-full bg-orange-100/60 blur-[80px] pointer-events-none" />
        <div className="absolute top-8 left-1/3 w-[300px] h-[300px] rounded-full bg-teal-100/40 blur-[60px] pointer-events-none" />
      </div>

      <div className="mx-auto max-w-5xl px-6 -mt-32 relative z-10">
        
        {/* ── MAIN IDENTITY CARD ── */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 border border-white flex flex-col md:flex-row items-center md:items-end justify-between gap-8 mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-8 text-center md:text-left">
            <div className="relative group">
              <div className="size-40 rounded-[2.5rem] bg-gradient-to-br from-teal-400 to-emerald-500 p-1.5 shadow-2xl transition-transform group-hover:scale-[1.02] duration-500">
                <div className="size-full rounded-[2.2rem] bg-white overflow-hidden flex items-center justify-center border-4 border-white shadow-inner">
                  {form.avatar_url
                    ? <img src={form.avatar_url} alt="Avatar" className="size-full object-cover" />
                    : <User className="size-16 text-slate-200" />
                  }
                </div>
              </div>
              {editing && (
                <label className="absolute -bottom-2 -right-2 cursor-pointer rounded-2xl bg-teal-500 p-3 shadow-xl hover:bg-teal-400 transition-all duration-300 border-4 border-white active:scale-90">
                  <Camera className="size-5 text-white" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </label>
              )}
            </div>

            <div className="space-y-3 pb-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className="bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-teal-100">
                  Level {level.level} Athlete
                </span>
                {leaderboardRank && (
                  <span className="bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-amber-100 flex items-center gap-1">
                    <Crown className="size-3" /> Rank #{leaderboardRank}
                  </span>
                )}
              </div>
              
              {editing ? (
                 <input className="text-4xl font-black bg-slate-50 rounded-2xl px-4 py-2 border-none outline-none focus:ring-2 focus:ring-teal-500 transition-all w-full md:w-auto" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              ) : (
                 <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{form.full_name || "New Athlete"}</h1>
              )}
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm font-bold text-slate-400">
                <span className="flex items-center gap-2">
                  <MapPin className="size-4 text-teal-500" /> {form.location || "Location not set"}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="size-4 text-slate-300" /> Joined {profile?.created_at ? format(new Date(profile.created_at), 'MMM yyyy') : 'Recently'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto">
            <button className="flex-1 md:flex-none p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all active:scale-95">
              <Share2 className="size-5 text-slate-600" />
            </button>
            <button 
              onClick={() => editing ? handleSave() : setEditing(true)} 
              className={cn(
                "flex-1 md:flex-none flex items-center justify-center gap-2 rounded-2xl px-8 py-3.5 text-sm font-black transition-all active:scale-95 shadow-lg",
                editing ? "bg-teal-500 text-white hover:bg-teal-400 shadow-teal-200" : "bg-teal-500 text-white hover:bg-teal-400 shadow-teal-200"
              )}
            >
              {editing ? (saving ? "Saving..." : "Save Profile") : "Edit Profile"}
            </button>
          </div>
        </div>

        {/* ── CONTENT GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR: Stats & Progress */}
          <div className="lg:col-span-4 space-y-8 sticky top-24">
            
            {/* XP Progression Card */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 overflow-hidden relative group transition-all hover:shadow-xl hover:shadow-slate-200/50">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="size-14 rounded-2xl bg-teal-50 flex items-center justify-center text-3xl shadow-inner">
                    {level.emoji}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total XP</p>
                    <p className="text-2xl font-black text-slate-900">{totalPoints.toLocaleString()}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-black uppercase tracking-wider">
                    <span className="text-teal-600">{level.name}</span>
                    <span className="text-slate-400">{progressPct.toFixed(0)}%</span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50 shadow-inner">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(20,184,166,0.3)]"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm text-center space-y-1">
                <Trophy className="size-5 text-amber-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-slate-900">{totalEvents}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Events</p>
              </div>
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm text-center space-y-1">
                <Flame className="size-5 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-black text-slate-900">{maxStreak}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Streak</p>
              </div>
            </div>

            {/* Favorite Sports Card */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900">Interests</h3>
                {editing && <Settings className="size-4 text-slate-400" />}
              </div>
              <div className="flex flex-wrap gap-2">
                {ALL_CATEGORIES.map(cat => {
                  const isSelected = form.favourite_categories.includes(cat);
                  if (!editing && !isSelected) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => editing && toggleCategory(cat)}
                      className={cn(
                        "rounded-xl px-4 py-2 text-xs font-bold capitalize transition-all duration-300",
                        isSelected
                          ? "bg-teal-500 text-white shadow-lg shadow-teal-200"
                          : "bg-teal-50 text-slate-400 hover:text-teal-600 hover:bg-teal-100"
                      )}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* RIGHT CONTENT: Dynamic Tabs */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Glassmorphic Tab Switcher */}
            <div className="bg-white/80 backdrop-blur-xl sticky top-20 z-20 rounded-3xl border border-white p-1.5 shadow-xl shadow-slate-200/40 flex gap-1 animate-in fade-in slide-in-from-top-4 duration-1000">
              {TABS.map(tab => {
                const isActive = activeTab === tab;
                const Icon = { overview: Activity, activity: Clock, schedule: Calendar, leagues: Trophy }[tab];
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95",
                      isActive
                        ? "bg-teal-500 text-white shadow-lg shadow-teal-200"
                        : "text-slate-400 hover:text-teal-600 hover:bg-teal-50"
                    )}
                  >
                    <Icon className="size-3.5" />
                    <span className="hidden sm:inline">{tab}</span>
                  </button>
                )
              })}
            </div>

            {/* TAB CONTENT */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-8">
                  {/* Bio Card */}
                  <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Bio</h3>
                    {editing ? (
                      <textarea 
                        className="w-full bg-slate-50 rounded-2xl p-4 text-sm font-medium border-none outline-none focus:ring-2 focus:ring-teal-500 transition-all resize-none"
                        rows={4}
                        placeholder="Tell the community about your goals..."
                        value={form.bio}
                        onChange={e => setForm({...form, bio: e.target.value})}
                      />
                    ) : (
                      <p className="text-slate-600 leading-relaxed font-medium italic">
                        {form.bio || "No bio set yet. Level up your profile by adding one!"}
                      </p>
                    )}
                  </div>

                  {/* Trophy Cabinet Grid */}
                  <div className="bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8">
                       <Crown className="size-20 text-slate-50 rotate-12" />
                    </div>
                    <div className="relative z-10">
                      <h3 className="text-2xl font-black text-slate-900 mb-8">Achievements</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        {BADGES.map(badge => {
                          const earned = userBadges.find(ub => ub.badge_id === badge.id);
                          return (
                            <div key={badge.id} className={cn(
                              "relative group flex flex-col items-center text-center gap-3 p-4 rounded-3xl transition-all duration-500",
                              earned ? "bg-white shadow-xl shadow-slate-100" : "bg-slate-50/50 opacity-40 grayscale"
                            )}>
                              <div className={cn(
                                "size-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner transition-transform group-hover:scale-110 duration-300",
                                earned ? "bg-slate-50" : "bg-slate-100"
                              )}>
                                {badge.emoji}
                              </div>
                              <div className="space-y-1">
                                <p className="text-xs font-black text-slate-800 line-clamp-1">{badge.name}</p>
                                {earned && <p className="text-[8px] font-black text-teal-600 uppercase tracking-widest">Unlocked</p>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ACTIVITY TAB */}
              {activeTab === "activity" && (
                <div className="space-y-6">
                  {activityLogs.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-20 text-center border border-slate-100 shadow-sm">
                      <div className="size-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-3xl">🏜️</div>
                      <h3 className="text-xl font-black text-slate-900 mb-2">No activities yet</h3>
                      <p className="text-slate-500 mb-8">Log your first session to start earning points.</p>
                      <Link href="/compete/log" className="bg-teal-500 text-white px-8 py-3 rounded-full font-black text-sm active:scale-95 transition-all hover:bg-teal-400">
                        Log Activity
                      </Link>
                    </div>
                  ) : (
                    activityLogs.map((log, i) => (
                      <div key={log.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/30 transition-all flex items-center gap-6 group animate-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="size-16 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl border border-slate-100 group-hover:bg-white group-hover:border-teal-100 transition-colors">
                          {ACTIVITY_ICONS[log.activity_type] || "🔥"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded-md">+{log.points} XP</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(log.logged_at), 'MMM d, h:mm a')}</span>
                          </div>
                          <h4 className="text-lg font-black text-slate-900 capitalize">{log.activity_type} session</h4>
                          <p className="text-sm text-slate-500 font-medium">
                            {log.duration_mins} mins {log.distance && `· ${log.distance} km`}
                          </p>
                        </div>
                        <ChevronRight className="size-5 text-slate-300 group-hover:text-teal-500 transition-colors" />
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* SCHEDULE TAB */}
              {activeTab === "schedule" && (
                <div className="space-y-8">
                  <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Calendar className="size-5 text-teal-500" /> Upcoming
                      </h3>
                      <Link href="/events" className="size-10 bg-teal-500 text-white rounded-full flex items-center justify-center hover:bg-teal-400 transition-all active:scale-90">
                        <Plus className="size-5" />
                      </Link>
                    </div>

                    {upcomingEvents.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 font-medium italic">
                        No events on the horizon.
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {upcomingEvents.map(reg => (
                          <Link key={reg.id} href={`/events/${reg.events.id}`} className="group flex items-center gap-6 p-4 rounded-3xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-xl transition-all">
                            <div className="size-20 rounded-2xl bg-white border border-slate-100 overflow-hidden shrink-0">
                               <img src={reg.events.image || '/images/event-placeholder.jpg'} className="size-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                            </div>
                            <div className="flex-1">
                              <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-1">{formatEventDate(reg.events.date)}</p>
                              <h4 className="text-base font-black text-slate-900 group-hover:text-teal-600 transition-colors">{reg.events.title}</h4>
                              <p className="text-sm text-slate-500 font-medium flex items-center gap-1 mt-1">
                                <MapPin className="size-3.5" /> {reg.events.location}
                              </p>
                            </div>
                            <div className="pr-2">
                               <div className="size-8 rounded-full border-2 border-slate-200 flex items-center justify-center group-hover:border-teal-500 group-hover:bg-teal-50 transition-all">
                                  <ChevronRight className="size-4 text-slate-300 group-hover:text-teal-600" />
                               </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* LEAGUES TAB */}
              {activeTab === "leagues" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {leagues.length === 0 ? (
                    <div className="col-span-full bg-white rounded-[2.5rem] p-20 text-center border border-slate-100 shadow-sm">
                      <Trophy className="size-16 text-slate-100 mx-auto mb-6" />
                      <h3 className="text-xl font-black text-slate-900 mb-2">Join a League</h3>
                      <p className="text-slate-500 mb-8">Compete against others and track your rank.</p>
                      <Link href="/compete?tab=leagues" className="bg-teal-500 text-white px-8 py-3 rounded-full font-black text-sm active:scale-95 transition-all hover:bg-teal-400">
                        Find Leagues
                      </Link>
                    </div>
                  ) : (
                    leagues.map(league => {
                      const member = leagueMembers.find(m => m.league_id === league.id)
                      return (
                        <Link key={league.id} href={`/compete/leagues/${league.id}`} className="group bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all">
                           <div className="flex justify-between items-start mb-6">
                              <div className="size-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:bg-white group-hover:border group-hover:border-teal-100 transition-all">
                                {league.activity_type?.includes('padel') ? '🎾' : '🏃'}
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">League Points</p>
                                <p className="text-2xl font-black text-teal-600">{member?.total_points || 0}</p>
                              </div>
                           </div>
                           <h4 className="text-xl font-black text-slate-900 mb-4 group-hover:text-teal-600 transition-colors line-clamp-1">{league.name}</h4>
                           <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                {league.is_public ? <Globe className="size-3" /> : <Lock className="size-3" />}
                                {league.is_public ? 'Public' : 'Private'}
                              </span>
                              <div className="flex items-center gap-1 text-[10px] font-black text-teal-600 uppercase tracking-widest">
                                View Table <ChevronRight className="size-3" />
                              </div>
                           </div>
                        </Link>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}