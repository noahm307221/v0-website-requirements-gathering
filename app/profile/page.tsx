"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { User, MapPin, Calendar, Lock, Globe, Camera, Trophy, Activity, Flame, ChevronRight, Star, Zap } from "lucide-react"
import { getLevel, BADGES } from "@/lib/points"
import Link from "next/link"

const ALL_CATEGORIES = ["padel", "running", "yoga", "tennis", "cycling", "crossfit", "swimming", "hiking"]
const TABS = ["overview", "activity", "events", "leagues"] as const
type Tab = typeof TABS[number]

const BADGE_STYLES: Record<string, { bg: string, text: string, border: string, glow: string }> = {
  first_event:  { bg: "from-sky-500 to-blue-600",     text: "text-white", border: "border-sky-400/30",    glow: "shadow-sky-500/20" },
  five_events:  { bg: "from-orange-500 to-red-600",   text: "text-white", border: "border-orange-400/30", glow: "shadow-orange-500/20" },
  ten_events:   { bg: "from-violet-500 to-purple-700",text: "text-white", border: "border-violet-400/30", glow: "shadow-violet-500/20" },
  first_win:    { bg: "from-yellow-400 to-amber-600", text: "text-white", border: "border-yellow-400/30", glow: "shadow-yellow-500/20" },
  five_wins:    { bg: "from-emerald-400 to-teal-600", text: "text-white", border: "border-emerald-400/30",glow: "shadow-emerald-500/20" },
  explorer:     { bg: "from-cyan-500 to-blue-700",    text: "text-white", border: "border-cyan-400/30",   glow: "shadow-cyan-500/20" },
  streaker:     { bg: "from-rose-500 to-pink-700",    text: "text-white", border: "border-rose-400/30",   glow: "shadow-rose-500/20" },
  all_rounder:  { bg: "from-indigo-500 to-violet-700",text: "text-white", border: "border-indigo-400/30", glow: "shadow-indigo-500/20" },
}

const LEVEL_STYLES: Record<string, { bg: string, text: string, accent: string }> = {
  Bronze:  { bg: "from-amber-900/40 to-amber-800/20",  text: "text-amber-300",  accent: "bg-amber-400" },
  Silver:  { bg: "from-slate-700/40 to-slate-600/20",  text: "text-slate-200",  accent: "bg-slate-300" },
  Gold:    { bg: "from-yellow-800/40 to-yellow-700/20",text: "text-yellow-300", accent: "bg-yellow-400" },
  Diamond: { bg: "from-cyan-900/40 to-blue-900/20",    text: "text-cyan-300",   accent: "bg-cyan-400" },
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
  const [newBadge, setNewBadge] = useState<any>(null)
  const [form, setForm] = useState({
    full_name: "", location: "", bio: "",
    favourite_categories: [] as string[],
    is_public: true, avatar_url: "",
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      setUser(user)

      const { data: profileData } = await supabase
        .from("profiles").select("*").eq("id", user.id).maybeSingle()

      if (profileData) {
        setProfile(profileData)
        setForm({
          full_name: profileData.full_name ?? user.user_metadata?.full_name ?? "",
          location: profileData.location ?? "",
          bio: profileData.bio ?? "",
          favourite_categories: profileData.favourite_categories
            ? profileData.favourite_categories.split(",").filter(Boolean) : [],
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

        // Bragging rights — check if #1 in any activity
        const activityTotals: Record<string, Record<string, number>> = {}
        allStats.forEach(s => {
          if (!activityTotals[s.activity_type]) activityTotals[s.activity_type] = {}
          activityTotals[s.activity_type][s.user_id] = (activityTotals[s.activity_type][s.user_id] || 0) + (s.total_points || 0)
        })
        for (const [activity, totals] of Object.entries(activityTotals)) {
          const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]
          if (top && top[0] === user.id && top[1] > 0) {
            setBraggingRights(`#1 ${activity.charAt(0).toUpperCase() + activity.slice(1)} athlete`)
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
  const levelStyle = LEVEL_STYLES[level.name] ?? LEVEL_STYLES.Bronze

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading profile...</p>
      </div>
    </div>
  )

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">

      {/* Badge unlock animation overlay */}
      {newBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setNewBadge(null)}>
          <div className="rounded-3xl border-2 border-yellow-400/50 bg-gradient-to-br from-yellow-900/40 to-amber-900/20 p-10 text-center shadow-2xl shadow-yellow-500/20 animate-bounce-once">
            <p className="text-xs font-medium uppercase tracking-widest text-yellow-400 mb-3">Badge Unlocked</p>
            <div className={`size-24 rounded-2xl bg-gradient-to-br ${BADGE_STYLES[newBadge.id]?.bg ?? "from-gray-500 to-gray-700"} mx-auto mb-4 flex items-center justify-center text-5xl shadow-xl`}>
              {newBadge.emoji}
            </div>
            <p className="text-2xl font-bold mb-1">{newBadge.name}</p>
            <p className="text-muted-foreground text-sm">{newBadge.description}</p>
            <p className="text-xs text-muted-foreground mt-4">Tap to close</p>
          </div>
        </div>
      )}

      {/* Bragging rights banner */}
      {braggingRights && (
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/20 px-5 py-3 flex items-center gap-3">
          <span className="text-xl">👑</span>
          <div>
            <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{braggingRights}</p>
            <p className="text-xs text-muted-foreground">You're leading the pack — keep it up</p>
          </div>
          <Link href="/compete" className="ml-auto text-xs text-yellow-600 dark:text-yellow-400 underline">View leaderboard</Link>
        </div>
      )}

      {/* Profile header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className={`p-0.5 rounded-full bg-gradient-to-br ${levelStyle.bg} shadow-lg ${levelStyle.glow ?? ""}`}>
              <div className="size-20 rounded-full bg-background overflow-hidden flex items-center justify-center">
                {form.avatar_url
                  ? <img src={form.avatar_url} alt="Avatar" className="size-full object-cover" />
                  : <User className="size-8 text-muted-foreground" />
                }
              </div>
            </div>
            {editing && (
              <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-foreground p-1.5 shadow-md">
                <Camera className="size-3 text-background" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            )}
            {/* Level badge */}
            <div className={`absolute -bottom-1 -right-1 rounded-full px-1.5 py-0.5 text-xs font-bold bg-gradient-to-br ${levelStyle.bg} ${levelStyle.text} border border-border shadow-sm`}>
              {level.emoji}
            </div>
          </div>
          <div>
            {editing ? (
              <input className="text-2xl font-bold bg-transparent border-b border-border focus:outline-none w-full" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your name" />
            ) : (
              <h1 className="text-2xl font-bold tracking-tight">{form.full_name || "No name set"}</h1>
            )}
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {form.is_public
                ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Globe className="size-3" /> Public</span>
                : <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Private</span>
              }
              {form.location && <><span className="text-muted-foreground/40">·</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" />{form.location}</span></>}
              {userBadges.length > 0 && <><span className="text-muted-foreground/40">·</span><span className="text-xs text-muted-foreground">{userBadges.length} badge{userBadges.length !== 1 ? "s" : ""}</span></>}
            </div>
          </div>
        </div>
        <button onClick={() => editing ? handleSave() : setEditing(true)} disabled={saving} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50">
          {saving ? "Saving..." : editing ? "Save" : "Edit profile"}
        </button>
      </div>

      {/* Level hero card */}
      <div className={`rounded-2xl bg-gradient-to-br ${levelStyle.bg} border border-border/50 p-6 mb-6 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
        <div className="relative">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className={`text-xs font-medium uppercase tracking-widest mb-1 ${levelStyle.text} opacity-70`}>Athlete Level</p>
              <div className="flex items-center gap-3">
                <span className="text-5xl">{level.emoji}</span>
                <div>
                  <p className={`text-2xl font-black tracking-tight ${levelStyle.text}`}>{level.name}</p>
                  <p className={`text-sm font-medium ${levelStyle.text} opacity-70`}>{totalPoints.toLocaleString()} pts</p>
                </div>
              </div>
            </div>
            {leaderboardRank && (
              <Link href="/compete" className="text-right group">
                <p className={`text-xs font-medium uppercase tracking-widest mb-1 ${levelStyle.text} opacity-70`}>Global Rank</p>
                <p className={`text-4xl font-black ${levelStyle.text}`}>#{leaderboardRank}</p>
                <p className={`text-xs ${levelStyle.text} opacity-60 flex items-center gap-1 justify-end group-hover:opacity-100 transition-opacity`}>
                  Leaderboard <ChevronRight className="size-3" />
                </p>
              </Link>
            )}
          </div>

          {/* Progress bar */}
          {level.max !== Infinity && (
            <div className="mb-5">
              <div className="flex justify-between text-xs mb-1.5 opacity-60" style={{ color: "inherit" }}>
                <span className={levelStyle.text}>{totalPoints} pts</span>
                <span className={levelStyle.text}>{level.max + 1} to next level</span>
              </div>
              <div className="h-2 rounded-full bg-black/20 overflow-hidden">
                <div
                  className={`h-full rounded-full ${levelStyle.accent} transition-all duration-1000`}
                  style={{ width: `${Math.min(((totalPoints - level.min) / (level.max - level.min)) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Events", value: totalEvents, icon: "🎯" },
              { label: "Matches", value: totalMatches, icon: "⚔️" },
              { label: "Wins", value: totalWins, icon: "🏆" },
              { label: "Streak", value: maxStreak, icon: "🔥", suffix: "wk" },
            ].map(({ label, value, icon, suffix }) => (
              <div key={label} className="rounded-xl bg-black/20 p-3 text-center backdrop-blur-sm">
                <p className="text-lg mb-0.5">{icon}</p>
                <p className={`text-xl font-black ${levelStyle.text}`}>{value}{suffix ?? ""}</p>
                <p className={`text-xs ${levelStyle.text} opacity-60`}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-semibold capitalize transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* About */}
          <div className="rounded-2xl border p-6">
            <h2 className="font-bold mb-4 tracking-tight">About</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                {editing
                  ? <input className="text-sm bg-transparent border-b border-border focus:outline-none w-full" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Your city" />
                  : <span className="text-sm text-muted-foreground">{form.location || "No location set"}</span>
                }
              </div>
              <div className="flex items-start gap-3">
                <User className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                {editing
                  ? <textarea className="text-sm bg-transparent border-b border-border focus:outline-none w-full resize-none" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself" rows={2} />
                  : <span className="text-sm text-muted-foreground">{form.bio || "No bio yet"}</span>
                }
              </div>
              {editing && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-sm text-muted-foreground">Profile visibility</span>
                  <button onClick={() => setForm({ ...form, is_public: !form.is_public })} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_public ? "bg-foreground" : "bg-muted-foreground"}`}>
                    <span className={`inline-block size-4 transform rounded-full bg-background transition-transform ${form.is_public ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <span className="text-sm">{form.is_public ? "Public" : "Private"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Favourite activities */}
          <div className="rounded-2xl border p-6">
            <h2 className="font-bold mb-4 tracking-tight flex items-center gap-2">
              <Star className="size-4 text-muted-foreground" /> Favourite Activities
            </h2>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => editing && toggleCategory(cat)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all capitalize ${
                    form.favourite_categories.includes(cat)
                      ? "bg-foreground text-background scale-105 shadow-sm"
                      : "bg-muted text-muted-foreground"
                  } ${editing ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Trophy cabinet */}
          <div className="rounded-2xl border p-6">
            <h2 className="font-bold mb-1 tracking-tight flex items-center gap-2">
              <Trophy className="size-4 text-muted-foreground" /> Trophy Cabinet
            </h2>
            <p className="text-xs text-muted-foreground mb-5">{userBadges.length} of {BADGES.length} badges earned</p>

            {userBadges.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
                {userBadges.map(ub => {
                  const badge = BADGES.find(b => b.id === ub.badge_id)
                  if (!badge) return null
                  const style = BADGE_STYLES[badge.id] ?? { bg: "from-gray-500 to-gray-700", text: "text-white", border: "border-gray-400/30", glow: "shadow-gray-500/20" }
                  return (
                    <div key={ub.badge_id} className={`relative rounded-2xl bg-gradient-to-br ${style.bg} border ${style.border} p-4 shadow-lg ${style.glow} overflow-hidden`}>
                      <div className="absolute top-0 right-0 size-16 rounded-full bg-white/5 -translate-y-4 translate-x-4" />
                      <span className="text-3xl block mb-2">{badge.emoji}</span>
                      <p className={`text-sm font-bold ${style.text}`}>{badge.name}</p>
                      <p className={`text-xs ${style.text} opacity-70 mt-0.5`}>{badge.description}</p>
                      <p className={`text-xs ${style.text} opacity-50 mt-2`}>{format(new Date(ub.earned_at), "MMM d, yyyy")}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Locked badges */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">Locked</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {BADGES.filter(b => !userBadges.find(ub => ub.badge_id === b.id)).map(badge => (
                  <div key={badge.id} className="rounded-xl border border-dashed p-3 opacity-40 flex items-center gap-2" title={badge.description}>
                    <span className="text-xl grayscale">{badge.emoji}</span>
                    <div>
                      <p className="text-xs font-medium">{badge.name}</p>
                      <p className="text-xs text-muted-foreground">{badge.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVITY TAB */}
      {activeTab === "activity" && (
        <div className="space-y-6">
          {/* Streak card */}
          {maxStreak > 0 && (
            <div className="rounded-2xl border bg-gradient-to-br from-orange-500/10 to-red-500/5 border-orange-500/20 p-5 flex items-center gap-4">
              <div className="relative">
                <span className="text-5xl">🔥</span>
                {maxStreak >= 4 && <span className="absolute -top-1 -right-1 size-4 rounded-full bg-orange-500 animate-ping opacity-75" />}
              </div>
              <div>
                <p className="text-2xl font-black text-orange-500">{maxStreak} week streak</p>
                <p className="text-sm text-muted-foreground">
                  {maxStreak >= 8 ? "You're on fire 🔥 Don't stop now" :
                   maxStreak >= 4 ? "Great consistency! Keep it going" :
                   "Building momentum — log activity this week!"}
                </p>
              </div>
            </div>
          )}

          {/* Stats per activity */}
          {userStats.length > 0 && (
            <div className="rounded-2xl border p-6">
              <h2 className="font-bold mb-4 tracking-tight flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" /> Stats by Sport
              </h2>
              <div className="space-y-2">
                {userStats.sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).map(stat => (
                  <div key={stat.id} className="flex items-center gap-4 rounded-xl bg-muted/50 px-4 py-3">
                    <div className="flex-1">
                      <p className="font-semibold capitalize text-sm">{stat.activity_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.events_attended || 0} events · {stat.matches_won || 0}W / {stat.matches_played || 0} matches
                        {stat.streak_weeks > 0 ? ` · 🔥 ${stat.streak_weeks}wk` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg">{stat.total_points || 0}</p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity log */}
          <div className="rounded-2xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold tracking-tight">Recent Activity</h2>
              <Link href="/compete/log" className="text-xs font-medium text-muted-foreground hover:text-foreground underline">+ Log activity</Link>
            </div>
            {activityLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm mb-3">No activity logged yet</p>
                <Link href="/compete/log" className="rounded-xl bg-foreground text-background px-4 py-2 text-sm font-medium">Log your first activity</Link>
              </div>
            ) : (
              <div className="space-y-1">
                {activityLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {log.log_type === "match_win" ? "🏆" : log.log_type === "match_loss" ? "😅" : "🏃"}
                      </span>
                      <div>
                        <p className="text-sm font-semibold capitalize">
                          {log.activity_type}
                          {log.distance ? ` · ${log.distance}km` : ""}
                          {log.duration_mins ? ` · ${log.duration_mins}min` : ""}
                        </p>
                        {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-green-600">+{log.points}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(log.logged_at), "MMM d")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* EVENTS TAB */}
      {activeTab === "events" && (
        <div className="space-y-6">
          <div className="rounded-2xl border p-6">
            <h2 className="font-bold mb-4 tracking-tight flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" /> Upcoming ({upcomingEvents.length})
            </h2>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm mb-3">No upcoming events</p>
                <Link href="/events" className="rounded-xl bg-foreground text-background px-4 py-2 text-sm font-medium">Browse events</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map(reg => (
                  <Link key={reg.id} href={`/events/${reg.events.id}`} className="flex items-center gap-4 rounded-xl hover:bg-muted p-2 transition-colors">
                    {reg.events.image && <img src={reg.events.image} alt={reg.events.title} className="size-14 rounded-xl object-cover shrink-0" />}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{reg.events.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(reg.events.date), "EEE, MMM d")} · {reg.events.location}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {pastEvents.length > 0 && (
            <div className="rounded-2xl border p-6">
              <h2 className="font-bold mb-4 tracking-tight">Past Events ({pastEvents.length})</h2>
              <div className="space-y-2">
                {pastEvents.map(reg => (
                  <Link key={reg.id} href={`/events/${reg.events.id}`} className="flex items-center gap-4 rounded-xl hover:bg-muted p-2 transition-colors opacity-50">
                    {reg.events.image && <img src={reg.events.image} alt={reg.events.title} className="size-14 rounded-xl object-cover shrink-0" />}
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{reg.events.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(reg.events.date), "EEE, MMM d")} · {reg.events.location}</p>
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
        <div className="space-y-4">
          {leagues.length === 0 ? (
            <div className="rounded-2xl border p-12 text-center">
              <Trophy className="size-12 mx-auto mb-3 text-muted-foreground opacity-20" />
              <p className="font-semibold mb-1">No leagues yet</p>
              <p className="text-sm text-muted-foreground mb-4">Challenge your friends and track head-to-head results</p>
              <Link href="/compete/leagues" className="rounded-xl bg-foreground text-background px-5 py-2.5 text-sm font-medium">Create or join a league</Link>
            </div>
          ) : (
            leagues.map(league => {
              const member = leagueMembers.find(m => m.league_id === league.id)
              const winRate = member?.matches_played > 0 ? Math.round((member.matches_won / member.matches_played) * 100) : 0
              return (
                <Link key={league.id} href={`/compete/leagues/${league.id}`}>
                  <div className="rounded-2xl border px-5 py-4 hover:bg-muted transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold">{league.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{league.activity_type}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black">{member?.total_points || 0} <span className="text-sm font-normal text-muted-foreground">pts</span></p>
                      </div>
                    </div>
                    {member?.matches_played > 0 && (
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <span className="text-green-600 font-semibold">{member.matches_won}W</span>
                        <span className="text-red-500 font-semibold">{(member.matches_played - member.matches_won)}L</span>
                        <span className="text-muted-foreground">{winRate}% win rate</span>
                        <div className="ml-auto flex-1 max-w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${winRate}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })
          )}
          <Link href="/compete/leagues" className="flex items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-4 text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
            <Trophy className="size-4" /> Create or join another league
          </Link>
        </div>
      )}
    </div>
  )
}