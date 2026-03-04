"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { User, MapPin, Calendar, Star, Lock, Globe, Camera, Trophy, Activity, Flame, ChevronRight } from "lucide-react"
import { getLevel, BADGES } from "@/lib/points"
import Link from "next/link"

const ALL_CATEGORIES = ["padel", "running", "yoga", "tennis", "cycling", "crossfit", "swimming", "hiking"]
const TABS = ["overview", "activity", "events", "leagues"] as const
type Tab = typeof TABS[number]

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
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>("overview")
  const [form, setForm] = useState({
    full_name: "",
    location: "",
    bio: "",
    favourite_categories: [] as string[],
    is_public: true,
    avatar_url: "",
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      setUser(user)

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (profileData) {
        setProfile(profileData)
        setForm({
          full_name: profileData.full_name ?? user.user_metadata?.full_name ?? "",
          location: profileData.location ?? "",
          bio: profileData.bio ?? "",
          favourite_categories: profileData.favourite_categories
            ? profileData.favourite_categories.split(",").filter(Boolean)
            : [],
          is_public: profileData.is_public ?? true,
          avatar_url: profileData.avatar_url ?? "",
        })
      } else {
        const newProfile = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name ?? "",
          is_public: true,
          created_at: new Date().toISOString(),
        }
        await supabase.from("profiles").insert([newProfile])
        setProfile(newProfile)
        setForm({ full_name: newProfile.full_name, location: "", bio: "", favourite_categories: [], is_public: true, avatar_url: "" })
      }

      // Load registrations
      const { data: regs } = await supabase
        .from("registrations")
        .select("*")
        .eq("user_id", user.id)
        .order("registered_at", { ascending: false })

      if (regs && regs.length > 0) {
        const { data: eventData } = await supabase
          .from("events")
          .select("*")
          .in("id", regs.map(r => r.event_id))
        setRegistrations(regs.map(r => ({ ...r, events: eventData?.find(e => e.id === r.event_id) ?? null })))
      }

      // Load activity logs
      const { data: logs } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(20)
      setActivityLogs(logs || [])

      // Load user stats
      const { data: stats } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
      setUserStats(stats || [])

      // Load badges
      const { data: badges } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", user.id)
      setUserBadges(badges || [])

      // Load leagues
      const { data: memberData } = await supabase
        .from("league_members")
        .select("*, leagues(*)")
        .eq("user_id", user.id)
      
      if (memberData && memberData.length > 0) {
        setLeagues(memberData.map(m => m.leagues).filter(Boolean))
        setLeagueMembers(memberData)
      }

      // Get leaderboard rank
      const { data: allStats } = await supabase
        .from("user_stats")
        .select("user_id, total_points")
      
      if (allStats) {
        const aggregated: Record<string, number> = {}
        allStats.forEach(s => {
          aggregated[s.user_id] = (aggregated[s.user_id] || 0) + (s.total_points || 0)
        })
        const sorted = Object.entries(aggregated).sort((a, b) => b[1] - a[1])
        const rank = sorted.findIndex(([uid]) => uid === user.id)
        if (rank !== -1) setLeaderboardRank(rank + 1)
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      ...form,
      favourite_categories: form.favourite_categories.join(","),
    })
    setProfile({ ...profile, ...form })
    setEditing(false)
    setSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const fileName = `${user.id}-${Date.now()}.${file.name.split(".").pop()}`
    const { error } = await supabase.storage.from("avatars").upload(fileName, file)
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
      setForm({ ...form, avatar_url: data.publicUrl })
    }
    setUploadingAvatar(false)
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

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">

      {/* Profile header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="size-20 rounded-full bg-muted overflow-hidden flex items-center justify-center border-2 border-border">
              {form.avatar_url
                ? <img src={form.avatar_url} alt="Avatar" className="size-full object-cover" />
                : <User className="size-8 text-muted-foreground" />
              }
            </div>
            {editing && (
              <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-foreground p-1.5">
                <Camera className="size-3 text-background" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            )}
          </div>
          <div>
            {editing ? (
              <input
                className="text-2xl font-bold bg-transparent border-b border-border focus:outline-none w-full"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Your name"
              />
            ) : (
              <h1 className="text-2xl font-bold">{form.full_name || "No name set"}</h1>
            )}
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1">
              {form.is_public
                ? <><Globe className="size-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Public</span></>
                : <><Lock className="size-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Private</span></>
              }
              {form.location && (
                <><span className="text-muted-foreground">·</span><MapPin className="size-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">{form.location}</span></>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          disabled={saving}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : editing ? "Save" : "Edit profile"}
        </button>
      </div>

      {/* Level & points hero card */}
      <div className="rounded-2xl border bg-gradient-to-br from-muted/50 to-muted p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Your level</p>
            <div className="flex items-center gap-2">
              <span className="text-4xl">{level.emoji}</span>
              <div>
                <p className="text-xl font-bold">{level.name}</p>
                <p className="text-sm text-muted-foreground">{totalPoints} points</p>
              </div>
            </div>
          </div>
          {leaderboardRank && (
            <Link href="/compete" className="text-right hover:opacity-80 transition-opacity">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Global rank</p>
              <p className="text-3xl font-bold">#{leaderboardRank}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">View leaderboard <ChevronRight className="size-3" /></p>
            </Link>
          )}
        </div>

        {/* Progress to next level */}
        {level.max !== Infinity && (
          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{totalPoints} pts</span>
              <span>{level.max + 1} pts to next level</span>
            </div>
            <div className="h-2 rounded-full bg-background overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground transition-all"
                style={{ width: `${Math.min(((totalPoints - level.min) / (level.max - level.min)) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: "Events", value: totalEvents },
            { label: "Matches", value: totalMatches },
            { label: "Wins", value: totalWins },
            { label: "Streak", value: `${maxStreak}🔥` },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-background/70 p-3 text-center">
              <p className="font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
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
          <div className="rounded-xl border p-6">
            <h2 className="font-semibold mb-4">About</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                {editing ? (
                  <input
                    className="text-sm bg-transparent border-b border-border focus:outline-none w-full"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    placeholder="Your city"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">{form.location || "No location set"}</span>
                )}
              </div>
              <div className="flex items-start gap-3">
                <User className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                {editing ? (
                  <textarea
                    className="text-sm bg-transparent border-b border-border focus:outline-none w-full resize-none"
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="Tell us about yourself"
                    rows={2}
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">{form.bio || "No bio yet"}</span>
                )}
              </div>
              {editing && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-sm text-muted-foreground">Profile visibility</span>
                  <button
                    onClick={() => setForm({ ...form, is_public: !form.is_public })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_public ? "bg-foreground" : "bg-muted-foreground"}`}
                  >
                    <span className={`inline-block size-4 transform rounded-full bg-background transition-transform ${form.is_public ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                  <span className="text-sm">{form.is_public ? "Public" : "Private"}</span>
                </div>
              )}
            </div>
          </div>

          {/* Favourite activities */}
          <div className="rounded-xl border p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Star className="size-4 text-muted-foreground" /> Favourite Activities
            </h2>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => editing && toggleCategory(cat)}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-colors capitalize ${
                    form.favourite_categories.includes(cat)
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  } ${editing ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                >
                  {cat}
                </button>
              ))}
            </div>
            {!editing && form.favourite_categories.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">No favourite activities set — click Edit profile to add some</p>
            )}
          </div>

          {/* Badges */}
          <div className="rounded-xl border p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Trophy className="size-4 text-muted-foreground" /> Badges
            </h2>
            {userBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground">No badges yet — log activities and attend events to earn them!</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {userBadges.map(ub => {
                  const badge = BADGES.find(b => b.id === ub.badge_id)
                  if (!badge) return null
                  return (
                    <div key={ub.badge_id} className="flex items-center gap-3 rounded-xl border p-3">
                      <span className="text-2xl">{badge.emoji}</span>
                      <div>
                        <p className="text-sm font-medium">{badge.name}</p>
                        <p className="text-xs text-muted-foreground">{badge.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {/* Locked badges */}
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Locked</p>
              <div className="flex flex-wrap gap-2">
                {BADGES.filter(b => !userBadges.find(ub => ub.badge_id === b.id)).map(badge => (
                  <div key={badge.id} className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-xs text-muted-foreground opacity-50" title={badge.description}>
                    <span>🔒</span>
                    <span>{badge.name}</span>
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
          {/* Stats per activity */}
          {userStats.length > 0 && (
            <div className="rounded-xl border p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" /> Stats by Activity
              </h2>
              <div className="space-y-3">
                {userStats.map(stat => (
                  <div key={stat.id} className="flex items-center justify-between rounded-xl bg-muted/50 px-4 py-3">
                    <div>
                      <p className="font-medium capitalize text-sm">{stat.activity_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {stat.events_attended || 0} events · {stat.matches_won || 0}W / {stat.matches_played || 0} matches
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{stat.total_points || 0} pts</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Flame className="size-3" /> {stat.streak_weeks || 0} wk streak
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity log */}
          <div className="rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Activity className="size-4 text-muted-foreground" /> Recent Activity
              </h2>
              <Link href="/compete/log" className="text-xs text-muted-foreground underline">Log activity</Link>
            </div>
            {activityLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity logged yet — <Link href="/compete/log" className="underline">log your first activity</Link></p>
            ) : (
              <div className="space-y-2">
                {activityLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted transition-colors">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {log.log_type === "match_win" ? "🏆 Won" : log.log_type === "match_loss" ? "😅 Lost" : "🏃"} {log.activity_type}
                        {log.distance ? ` · ${log.distance}km` : ""}
                        {log.duration_mins ? ` · ${log.duration_mins} mins` : ""}
                      </p>
                      {log.notes && <p className="text-xs text-muted-foreground">{log.notes}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">+{log.points} pts</p>
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
          <div className="rounded-xl border p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Calendar className="size-4 text-muted-foreground" /> Upcoming Events ({upcomingEvents.length})
            </h2>
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming events — <Link href="/events" className="underline">browse events</Link></p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(reg => (
                  <Link key={reg.id} href={`/events/${reg.events.id}`} className="flex items-center gap-4 rounded-lg hover:bg-muted p-2 transition-colors">
                    {reg.events.image && <img src={reg.events.image} alt={reg.events.title} className="size-12 rounded-lg object-cover shrink-0" />}
                    <div>
                      <p className="font-medium text-sm">{reg.events.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(reg.events.date), "EEE, MMM d")} · {reg.events.location}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border p-6">
            <h2 className="font-semibold mb-4">Past Events ({pastEvents.length})</h2>
            {pastEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No past events yet</p>
            ) : (
              <div className="space-y-3">
                {pastEvents.map(reg => (
                  <Link key={reg.id} href={`/events/${reg.events.id}`} className="flex items-center gap-4 rounded-lg hover:bg-muted p-2 transition-colors opacity-60">
                    {reg.events.image && <img src={reg.events.image} alt={reg.events.title} className="size-12 rounded-lg object-cover shrink-0" />}
                    <div>
                      <p className="font-medium text-sm">{reg.events.title}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(reg.events.date), "EEE, MMM d")} · {reg.events.location}</p>
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
        <div className="space-y-4">
          {leagues.length === 0 ? (
            <div className="rounded-xl border p-12 text-center">
              <Trophy className="size-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground mb-3">You're not in any leagues yet</p>
              <Link href="/compete/leagues" className="text-sm underline">Create or join a league</Link>
            </div>
          ) : (
            leagues.map(league => {
              const member = leagueMembers.find(m => m.league_id === league.id)
              return (
                <Link key={league.id} href={`/compete/leagues/${league.id}`}>
                  <div className="flex items-center justify-between rounded-xl border px-5 py-4 hover:bg-muted transition-colors">
                    <div>
                      <p className="font-medium">{league.name}</p>
                      <p className="text-sm text-muted-foreground capitalize">{league.activity_type} · {member?.matches_played || 0} matches played</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="font-bold">{member?.total_points || 0} pts</p>
                        <p className="text-xs text-muted-foreground">{member?.matches_won || 0}W / {member?.matches_played || 0}</p>
                      </div>
                      <ChevronRight className="size-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              )
            })
          )}
          <Link
            href="/compete/leagues"
            className="flex items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
          >
            <Trophy className="size-4" /> Create or join another league
          </Link>
        </div>
      )}
    </div>
  )
}