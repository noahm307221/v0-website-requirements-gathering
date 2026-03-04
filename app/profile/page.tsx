"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { User, MapPin, Calendar, Lock, Globe, Camera, ChevronRight, TrendingUp, Award, Zap } from "lucide-react"
import { getLevel, BADGES } from "@/lib/points"
import Link from "next/link"

const ALL_CATEGORIES = ["padel", "running", "yoga", "tennis", "cycling", "crossfit", "swimming", "hiking"]
const TABS = ["overview", "activity", "events", "leagues"] as const
type Tab = typeof TABS[number]

const BADGE_COLORS: Record<string, string> = {
  first_event: "#3B82F6",
  five_events: "#F97316",
  ten_events: "#8B5CF6",
  first_win: "#EAB308",
  five_wins: "#10B981",
  explorer: "#06B6D4",
  streaker: "#EF4444",
  all_rounder: "#6366F1",
}

const ACTIVITY_ICONS: Record<string, string> = {
  running: "↗", cycling: "⟳", swimming: "≋", hiking: "△",
  crossfit: "✕", padel: "◎", tennis: "◎", yoga: "☽",
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
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="size-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">

      {/* Bragging rights — minimal pill */}
      {braggingRights && (
        <Link href="/compete" className="group inline-flex items-center gap-2 mb-8 rounded-full border border-border bg-card px-4 py-2 text-sm hover:border-foreground transition-colors">
          <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="font-medium">{braggingRights}</span>
          <span className="text-muted-foreground">· #1 on leaderboard</span>
          <ChevronRight className="size-3.5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
        </Link>
      )}

      {/* Profile header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="size-16 rounded-2xl bg-muted overflow-hidden flex items-center justify-center">
              {form.avatar_url
                ? <img src={form.avatar_url} alt="Avatar" className="size-full object-cover" />
                : <User className="size-6 text-muted-foreground" />
              }
            </div>
            {editing && (
              <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-foreground p-1 shadow">
                <Camera className="size-3 text-background" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            )}
          </div>
          <div>
            {editing
              ? <input className="text-xl font-bold bg-transparent border-b border-border focus:outline-none" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Your name" />
              : <h1 className="text-xl font-bold tracking-tight">{form.full_name || "Set your name"}</h1>
            }
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
              {form.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{form.location}</span>}
              {form.location && <span>·</span>}
              <span className="flex items-center gap-1">
                {form.is_public ? <Globe className="size-3" /> : <Lock className="size-3" />}
                {form.is_public ? "Public" : "Private"}
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => editing ? handleSave() : setEditing(true)} disabled={saving} className="text-sm font-medium px-4 py-2 rounded-xl border hover:bg-muted transition-colors disabled:opacity-40">
          {saving ? "Saving..." : editing ? "Save" : "Edit"}
        </button>
      </div>

      {/* Stats strip — big bold numbers, no cards */}
      <div className="grid grid-cols-4 gap-0 mb-8 border rounded-2xl overflow-hidden">
        {[
          { value: totalPoints.toLocaleString(), label: "Points" },
          { value: leaderboardRank ? `#${leaderboardRank}` : "—", label: "Global rank" },
          { value: totalEvents, label: "Events" },
          { value: maxStreak > 0 ? `${maxStreak}` : "—", label: "Wk streak" },
        ].map(({ value, label }, i) => (
          <div key={label} className={`px-4 py-4 text-center ${i < 3 ? "border-r" : ""}`}>
            <p className="text-2xl font-black tracking-tight tabular-nums">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Level — clean progress bar, no background */}
      <div className="mb-8 px-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{level.name}</span>
            <span className="text-xs text-muted-foreground">· {totalPoints} pts</span>
          </div>
          {level.max !== Infinity && (
            <span className="text-xs text-muted-foreground">{level.max - totalPoints + 1} to {BADGES.find(() => true) ? "next" : "max"}</span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-foreground transition-all duration-700" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-8">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-8">

          {/* Edit fields */}
          {editing && (
            <div className="space-y-3 rounded-2xl border p-5">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Edit Profile</h2>
              <div className="flex items-center gap-3">
                <MapPin className="size-4 text-muted-foreground shrink-0" />
                <input className="text-sm bg-transparent border-b border-border focus:outline-none w-full py-1" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Your city" />
              </div>
              <div className="flex items-start gap-3">
                <User className="size-4 text-muted-foreground shrink-0 mt-1" />
                <textarea className="text-sm bg-transparent border-b border-border focus:outline-none w-full resize-none py-1" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Short bio" rows={2} />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <span className="text-sm text-muted-foreground">Public profile</span>
                <button onClick={() => setForm({ ...form, is_public: !form.is_public })} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_public ? "bg-foreground" : "bg-border"}`}>
                  <span className={`inline-block size-3.5 rounded-full bg-background transition-transform ${form.is_public ? "translate-x-4.5" : "translate-x-0.5"}`} />
                </button>
              </div>
            </div>
          )}

          {/* Bio — only show when not editing */}
          {!editing && form.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed">{form.bio}</p>
          )}

          {/* Activities */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Activities</h2>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => editing && toggleCategory(cat)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-all ${
                    form.favourite_categories.includes(cat)
                      ? "bg-foreground text-background"
                      : "border border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                  } ${editing ? "cursor-pointer" : "cursor-default"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Trophy cabinet */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Badges</h2>
              <span className="text-xs text-muted-foreground">{userBadges.length}/{BADGES.length}</span>
            </div>

            {/* Earned */}
            {userBadges.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                {userBadges.map(ub => {
                  const badge = BADGES.find(b => b.id === ub.badge_id)
                  if (!badge) return null
                  const color = BADGE_COLORS[badge.id] ?? "#6B7280"
                  return (
                    <div key={ub.badge_id} className="rounded-2xl border p-4 flex flex-col items-center gap-2 text-center hover:border-foreground transition-colors" style={{ borderTopColor: color, borderTopWidth: 3 }}>
                      <span className="text-2xl">{badge.emoji}</span>
                      <p className="text-xs font-bold leading-tight">{badge.name}</p>
                      <p className="text-[10px] text-muted-foreground">{format(new Date(ub.earned_at), "MMM d")}</p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Locked — compact list */}
            <div className="space-y-1">
              {BADGES.filter(b => !userBadges.find(ub => ub.badge_id === b.id)).map(badge => (
                <div key={badge.id} className="flex items-center gap-3 px-3 py-2 rounded-xl opacity-35">
                  <div className="size-7 rounded-lg bg-muted flex items-center justify-center text-sm grayscale">{badge.emoji}</div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{badge.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">{badge.description}</span>
                  </div>
                  <Lock className="size-3 text-muted-foreground" />
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
            <div className="flex items-center gap-4 rounded-2xl border p-5">
              <div className="text-4xl font-black tabular-nums text-orange-500">{maxStreak}</div>
              <div>
                <p className="font-bold text-sm">Week streak</p>
                <p className="text-xs text-muted-foreground">
                  {maxStreak >= 8 ? "On fire — don't break it" :
                   maxStreak >= 4 ? "Great momentum, keep going" :
                   "Log this week to extend your streak"}
                </p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {Array.from({ length: Math.min(maxStreak, 8) }).map((_, i) => (
                  <div key={i} className="w-1.5 rounded-full bg-orange-400" style={{ height: `${16 + (i / Math.max(maxStreak - 1, 1)) * 16}px`, opacity: 0.4 + (i / Math.max(maxStreak - 1, 1)) * 0.6 }} />
                ))}
              </div>
            </div>
          )}

          {/* Per sport stats */}
          {userStats.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">By Sport</h2>
              <div className="space-y-1">
                {userStats.sort((a, b) => (b.total_points || 0) - (a.total_points || 0)).map(stat => (
                  <div key={stat.id} className="flex items-center gap-4 rounded-xl px-4 py-3 hover:bg-muted transition-colors">
                    <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-sm font-mono font-bold text-muted-foreground">
                      {ACTIVITY_ICONS[stat.activity_type] ?? "·"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold capitalize">{stat.activity_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.events_attended || 0} events
                        {stat.matches_played > 0 ? ` · ${stat.matches_won}W ${stat.matches_played - stat.matches_won}L` : ""}
                      </p>
                    </div>
                    <p className="text-lg font-black tabular-nums">{stat.total_points || 0}</p>
                    <p className="text-xs text-muted-foreground w-6">pts</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity feed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Recent</h2>
              <Link href="/compete/log" className="text-xs font-medium text-muted-foreground hover:text-foreground">+ Log activity</Link>
            </div>
            {activityLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-10 text-center">
                <p className="text-sm text-muted-foreground mb-3">No activity logged yet</p>
                <Link href="/compete/log" className="text-sm font-medium underline">Log your first activity →</Link>
              </div>
            ) : (
              <div className="space-y-1">
                {activityLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors">
                    <div className="size-7 rounded-lg bg-muted flex items-center justify-center text-xs font-mono font-bold text-muted-foreground">
                      {ACTIVITY_ICONS[log.activity_type] ?? "·"}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">
                        {log.log_type === "match_win" ? "Won · " : log.log_type === "match_loss" ? "Lost · " : ""}{log.activity_type}
                        {log.distance ? ` · ${log.distance}km` : ""}
                        {log.duration_mins ? ` · ${log.duration_mins}min` : ""}
                      </p>
                      {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                    </div>
                    <p className="text-sm font-bold text-green-600">+{log.points}</p>
                    <p className="text-xs text-muted-foreground w-12 text-right">{format(new Date(log.logged_at), "MMM d")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── EVENTS ── */}
      {activeTab === "events" && (
        <div className="space-y-8">
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Upcoming · {upcomingEvents.length}</h2>
            {upcomingEvents.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-10 text-center">
                <p className="text-sm text-muted-foreground mb-3">No upcoming events</p>
                <Link href="/events" className="text-sm font-medium underline">Browse events →</Link>
              </div>
            ) : (
              <div className="space-y-1">
                {upcomingEvents.map(reg => (
                  <Link key={reg.id} href={`/events/${reg.events.id}`} className="flex items-center gap-4 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors group">
                    {reg.events.image && <img src={reg.events.image} alt={reg.events.title} className="size-12 rounded-xl object-cover shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{reg.events.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(reg.events.date), "EEE, MMM d")} · {reg.events.location}</p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {pastEvents.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Completed · {pastEvents.length}</h2>
              <div className="space-y-1">
                {pastEvents.map(reg => (
                  <Link key={reg.id} href={`/events/${reg.events.id}`} className="flex items-center gap-4 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors opacity-50 hover:opacity-100 group">
                    {reg.events.image && <img src={reg.events.image} alt={reg.events.title} className="size-12 rounded-xl object-cover shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{reg.events.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(reg.events.date), "EEE, MMM d")} · {reg.events.location}</p>
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
        <div className="space-y-3">
          {leagues.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <p className="text-sm font-semibold mb-1">No leagues yet</p>
              <p className="text-xs text-muted-foreground mb-4">Challenge friends, track results, climb the table</p>
              <Link href="/compete/leagues" className="text-sm font-medium underline">Create or join a league →</Link>
            </div>
          ) : (
            leagues.map(league => {
              const member = leagueMembers.find(m => m.league_id === league.id)
              const winRate = member?.matches_played > 0 ? Math.round((member.matches_won / member.matches_played) * 100) : 0
              return (
                <Link key={league.id} href={`/compete/leagues/${league.id}`}>
                  <div className="rounded-2xl border px-5 py-4 hover:border-foreground transition-colors group">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold">{league.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{league.activity_type}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-2xl font-black tabular-nums">{member?.total_points || 0}</span>
                        <span className="text-xs text-muted-foreground ml-1">pts</span>
                      </div>
                    </div>
                    {member?.matches_played > 0 && (
                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-semibold">{member.matches_won}W</span>
                        <span className="text-muted-foreground">{member.matches_played - member.matches_won}L</span>
                        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-foreground rounded-full transition-all" style={{ width: `${winRate}%` }} />
                        </div>
                        <span className="text-muted-foreground">{winRate}%</span>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })
          )}
          <Link href="/compete/leagues" className="flex items-center justify-center gap-2 rounded-2xl border border-dashed py-4 text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
            + Create or join another league
          </Link>
        </div>
      )}
    </div>
  )
}