"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel, BADGES } from "@/lib/points"
import { format, isToday, isTomorrow } from "date-fns"
import { ChevronRight, MapPin, Users, Trophy, Flame, Calendar, User, Zap, ArrowRight } from "lucide-react"

interface Props { userId: string; userEmail: string }

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  return format(d, "EEE, MMM d")
}

const SECTION_COLORS = [
  "bg-violet-50 dark:bg-violet-950/20",
  "bg-orange-50 dark:bg-orange-950/20",
  "bg-emerald-50 dark:bg-emerald-950/20",
  "bg-sky-50 dark:bg-sky-950/20",
  "bg-rose-50 dark:bg-rose-950/20",
]

const LEVEL_ACCENTS: Record<string, { bar: string, text: string, bg: string }> = {
  Bronze:  { bar: "bg-amber-500",  text: "text-amber-600",  bg: "bg-amber-50" },
  Silver:  { bar: "bg-slate-400",  text: "text-slate-600",  bg: "bg-slate-50" },
  Gold:    { bar: "bg-yellow-500", text: "text-yellow-600", bg: "bg-yellow-50" },
  Diamond: { bar: "bg-cyan-500",   text: "text-cyan-600",   bg: "bg-cyan-50" },
}

export function Dashboard({ userId, userEmail }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [profileRes, statsRes, badgesRes, regsRes, groupsRes, leaguesRes, followsRes, allStatsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_stats").select("*").eq("user_id", userId),
        supabase.from("user_badges").select("*").eq("user_id", userId),
        supabase.from("registrations").select("*").eq("user_id", userId),
        supabase.from("group_members").select("group_id, groups(*)").eq("user_id", userId).limit(4),
        supabase.from("league_members").select("*, leagues(*)").eq("user_id", userId),
        supabase.from("follows").select("following_id").eq("follower_id", userId),
        supabase.from("user_stats").select("user_id, total_points"),
      ])

      const today = new Date().toISOString().split("T")[0]
      let upcomingEvents: any[] = []
      if (regsRes.data && regsRes.data.length > 0) {
        const { data: eventData } = await supabase.from("events").select("*").in("id", regsRes.data.map(r => r.event_id))
        upcomingEvents = regsRes.data
          .map(r => ({ ...r, event: eventData?.find(e => e.id === r.event_id) }))
          .filter(r => r.event && r.event.date >= today)
          .sort((a, b) => a.event.date.localeCompare(b.event.date))
          .slice(0, 4)
      }

      const profile = profileRes.data
      const favCats = profile?.favourite_categories?.split(",").filter(Boolean) || []
      let recommendedEvents: any[] = []
      const registeredIds = regsRes.data?.map(r => r.event_id) || []

      if (favCats.length > 0) {
        const { data: recEvents } = await supabase.from("events").select("*").in("category_id", favCats).gte("date", today).limit(8)
        recommendedEvents = (recEvents || []).filter(e => !registeredIds.includes(e.id)).slice(0, 6)
      }
      if (recommendedEvents.length < 6) {
        const { data: moreEvents } = await supabase.from("events").select("*").gte("date", today).limit(12)
        const extra = (moreEvents || []).filter(e => !registeredIds.includes(e.id) && !recommendedEvents.find(r => r.id === e.id))
        recommendedEvents = [...recommendedEvents, ...extra].slice(0, 6)
      }

      const stats = statsRes.data || []
      const totalPoints = stats.reduce((s: number, r: any) => s + (r.total_points || 0), 0)
      const totalEvents = stats.reduce((s: number, r: any) => s + (r.events_attended || 0), 0)
      const maxStreak = Math.max(...stats.map((r: any) => r.streak_weeks || 0), 0)
      const totalWins = stats.reduce((s: number, r: any) => s + (r.matches_won || 0), 0)
      const totalMatches = stats.reduce((s: number, r: any) => s + (r.matches_played || 0), 0)

      const allAgg: Record<string, number> = {}
      allStatsRes.data?.forEach((s: any) => { allAgg[s.user_id] = (allAgg[s.user_id] || 0) + (s.total_points || 0) })
      const sorted = Object.entries(allAgg).sort((a, b) => b[1] - a[1])
      const rank = sorted.findIndex(([uid]) => uid === userId)

      const earnedBadgeIds = new Set(badgesRes.data?.map((b: any) => b.badge_id) || [])
      const nextBadge = BADGES.find(b => !earnedBadgeIds.has(b.id))

      let friendActivity: any[] = []
      const followingIds = followsRes.data?.map(f => f.following_id) || []
      if (followingIds.length > 0) {
        const [logsRes, friendRegsRes] = await Promise.all([
          supabase.from("activity_logs").select("*").in("user_id", followingIds).order("logged_at", { ascending: false }).limit(6),
          supabase.from("registrations").select("*, events(title, date, location)").in("user_id", followingIds).order("registered_at", { ascending: false }).limit(6),
        ])
        const { data: friendProfiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", followingIds)
        const pMap: Record<string, any> = {}
        friendProfiles?.forEach(p => { pMap[p.id] = p })
        friendActivity = [
          ...(logsRes.data || []).map(l => ({ type: "log", timestamp: l.logged_at, profile: pMap[l.user_id], userId: l.user_id, data: l })),
          ...(friendRegsRes.data || []).map(r => ({ type: "reg", timestamp: r.registered_at, profile: pMap[r.user_id], userId: r.user_id, data: r })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6)
      }

      let suggestedPeople: any[] = []
      if (followingIds.length < 10) {
        const { data: suggestions } = await supabase.from("profiles").select("id, full_name, avatar_url, location, favourite_categories").eq("is_public", true).neq("id", userId).limit(20)
        suggestedPeople = (suggestions || []).filter(p => !followingIds.includes(p.id)).slice(0, 5)
      }

      setData({
        profile, totalPoints, totalEvents, maxStreak, totalWins, totalMatches,
        rank: rank !== -1 ? rank + 1 : null,
        level: getLevel(totalPoints),
        upcomingEvents, recommendedEvents,
        myGroups: groupsRes.data?.map(m => m.groups).filter(Boolean) || [],
        myLeagues: leaguesRes.data || [],
        friendActivity, suggestedPeople, nextBadge,
        earnedBadges: badgesRes.data || [],
      })
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground tracking-widest uppercase">Loading</p>
      </div>
    </div>
  )

  const { profile, totalPoints, totalEvents, maxStreak, totalWins, totalMatches,
    rank, level, upcomingEvents, recommendedEvents, myGroups, myLeagues,
    friendActivity, suggestedPeople, nextBadge, earnedBadges } = data

  const firstName = profile?.full_name?.split(" ")[0] || "Athlete"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"
  const accent = LEVEL_ACCENTS[level.name] ?? LEVEL_ACCENTS.Bronze
  const progressPct = level.max !== Infinity ? Math.min(((totalPoints - level.min) / (level.max - level.min)) * 100, 100) : 100

  return (
    <div className="w-full">

      {/* ── HERO SECTION ── */}
      <div className="w-full bg-foreground text-background px-6 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-background/50 text-sm mb-2 uppercase tracking-widest font-medium">{greeting}, {firstName}</p>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none mb-4">
                {level.emoji} {level.name}<br />
                <span className="text-background/40 text-3xl md:text-4xl font-normal">{totalPoints.toLocaleString()} pts</span>
              </h1>
              {level.max !== Infinity && (
                <div className="max-w-xs">
                  <div className="h-1 rounded-full bg-background/20 overflow-hidden">
                    <div className="h-full rounded-full bg-background transition-all duration-700" style={{ width: `${progressPct}%` }} />
                  </div>
                  <p className="text-xs text-background/40 mt-1">{level.max - totalPoints + 1} pts to next level</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 md:gap-8">
              {[
                { label: "Global rank", value: rank ? `#${rank}` : "—", link: "/compete" },
                { label: "Streak", value: maxStreak > 0 ? `${maxStreak}wk 🔥` : "—", link: "/compete/log" },
                { label: "Wins", value: totalWins, link: "/compete" },
              ].map(({ label, value, link }) => (
                <Link key={label} href={link} className="group text-center md:text-right">
                  <p className="text-3xl md:text-4xl font-black text-background tabular-nums">{value}</p>
                  <p className="text-xs text-background/50 mt-1 uppercase tracking-widest group-hover:text-background/80 transition-colors">{label}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 mt-8">
            <Link href="/compete/log" className="flex items-center gap-2 rounded-full bg-background text-foreground px-5 py-2.5 text-sm font-bold hover:bg-background/90 transition-colors">
              <Zap className="size-4" /> Log activity
            </Link>
            <Link href="/events" className="flex items-center gap-2 rounded-full bg-background/10 text-background border border-background/20 px-5 py-2.5 text-sm font-medium hover:bg-background/20 transition-colors">
              <Calendar className="size-4" /> Browse events
            </Link>
            <Link href="/compete" className="flex items-center gap-2 rounded-full bg-background/10 text-background border border-background/20 px-5 py-2.5 text-sm font-medium hover:bg-background/20 transition-colors">
              <Trophy className="size-4" /> Leaderboard
            </Link>
          </div>
        </div>
      </div>

      {/* ── UPCOMING EVENTS ── */}
      {upcomingEvents.length > 0 && (
        <div className="w-full bg-violet-50 dark:bg-violet-950/20 px-6 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-1">Registered</p>
                <h2 className="text-2xl font-black tracking-tight">Your upcoming events</h2>
              </div>
              <Link href="/profile" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                See all <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {upcomingEvents.map(reg => (
                <Link key={reg.id} href={`/events/${reg.event.id}`} className="group rounded-2xl bg-white dark:bg-background border border-violet-100 dark:border-violet-900/30 overflow-hidden hover:shadow-lg hover:shadow-violet-100 dark:hover:shadow-violet-900/20 transition-all hover:-translate-y-1">
                  <div className="aspect-[4/3] bg-violet-100 dark:bg-violet-900/30 overflow-hidden">
                    {reg.event.image
                      ? <img src={reg.event.image} alt={reg.event.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="size-full flex items-center justify-center text-3xl">🏃</div>
                    }
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-sm mb-2 line-clamp-1">{reg.event.title}</p>
                    <p className={`text-xs font-semibold mb-1 ${isToday(new Date(reg.event.date)) ? "text-green-600" : "text-violet-600"}`}>
                      {formatEventDate(reg.event.date)}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="size-3 shrink-0" />{reg.event.location}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RECOMMENDED EVENTS ── */}
      {recommendedEvents.length > 0 && (
        <div className="w-full bg-orange-50 dark:bg-orange-950/20 px-6 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-1">Picked for you</p>
                <h2 className="text-2xl font-black tracking-tight">Recommended events</h2>
              </div>
              <Link href="/events" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                All events <ArrowRight className="size-4" />
              </Link>
            </div>
            {/* Horizontal scroll on mobile, grid on desktop */}
            <div className="flex gap-4 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible scrollbar-hide">
              {recommendedEvents.map(event => (
                <Link key={event.id} href={`/events/${event.id}`} className="group rounded-2xl bg-white dark:bg-background border border-orange-100 dark:border-orange-900/30 overflow-hidden hover:shadow-lg hover:shadow-orange-100 transition-all hover:-translate-y-1 shrink-0 w-64 sm:w-auto">
                  <div className="aspect-[16/9] bg-orange-100 dark:bg-orange-900/30 overflow-hidden">
                    {event.image
                      ? <img src={event.image} alt={event.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="size-full flex items-center justify-center text-3xl">🎯</div>
                    }
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-bold text-sm line-clamp-1">{event.title}</p>
                      {event.price && <span className="text-xs font-bold text-orange-600 shrink-0">{event.price === "0" || event.price?.toLowerCase() === "free" ? "Free" : event.price}</span>}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-3 shrink-0" />{event.location}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{formatEventDate(event.date)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── COMPETE ── */}
      <div className="w-full bg-emerald-50 dark:bg-emerald-950/20 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">Compete</p>
            <h2 className="text-2xl font-black tracking-tight">Your ranking</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Rank card */}
            <Link href="/compete" className="group rounded-2xl bg-white dark:bg-background border border-emerald-100 dark:border-emerald-900/30 p-6 hover:shadow-lg hover:shadow-emerald-100 transition-all hover:-translate-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">Global rank</p>
              <p className="text-6xl font-black tabular-nums mb-1">{rank ? `#${rank}` : "—"}</p>
              <p className="text-sm text-muted-foreground">{totalPoints.toLocaleString()} total points</p>
              <p className="text-xs text-emerald-600 font-medium mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">View leaderboard <ArrowRight className="size-3" /></p>
            </Link>

            {/* Streak card */}
            <Link href="/compete/log" className="group rounded-2xl bg-white dark:bg-background border border-emerald-100 dark:border-emerald-900/30 p-6 hover:shadow-lg hover:shadow-emerald-100 transition-all hover:-translate-y-1">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">Current streak</p>
              <div className="flex items-end gap-3 mb-1">
                <p className="text-6xl font-black tabular-nums">{maxStreak}</p>
                <p className="text-2xl mb-2">🔥</p>
              </div>
              <p className="text-sm text-muted-foreground">weeks active</p>
              <p className="text-xs text-emerald-600 font-medium mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">Log activity <ArrowRight className="size-3" /></p>
            </Link>

            {/* Next badge */}
            {nextBadge && (
              <Link href="/profile" className="group rounded-2xl bg-white dark:bg-background border border-emerald-100 dark:border-emerald-900/30 p-6 hover:shadow-lg hover:shadow-emerald-100 transition-all hover:-translate-y-1">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">Next badge</p>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-4xl grayscale opacity-40">{nextBadge.emoji}</span>
                  <div>
                    <p className="font-bold">{nextBadge.name}</p>
                    <p className="text-xs text-muted-foreground">{nextBadge.description}</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden">
                  <div className="h-full w-1/3 bg-emerald-500 rounded-full" />
                </div>
                <p className="text-xs text-emerald-600 font-medium mt-3 flex items-center gap-1 group-hover:gap-2 transition-all">View badges <ArrowRight className="size-3" /></p>
              </Link>
            )}
          </div>

          {/* Leagues */}
          {myLeagues.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">My leagues</h3>
                <Link href="/compete/leagues" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">All <ChevronRight className="size-3" /></Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {myLeagues.slice(0, 3).map(m => (
                  <Link key={m.league_id} href={`/compete/leagues/${m.league_id}`} className="flex items-center justify-between rounded-xl bg-white dark:bg-background border border-emerald-100 dark:border-emerald-900/30 px-4 py-3 hover:border-emerald-400 transition-colors">
                    <div>
                      <p className="font-semibold text-sm">{m.leagues?.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.leagues?.activity_type} · {m.matches_played || 0} played</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black">{m.total_points || 0}</p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── COMMUNITY ── */}
      <div className="w-full bg-sky-50 dark:bg-sky-950/20 px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-500 mb-1">Community</p>
              <h2 className="text-2xl font-black tracking-tight">Your groups</h2>
            </div>
            <Link href="/community" className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              All groups <ArrowRight className="size-4" />
            </Link>
          </div>

          {myGroups.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-background border border-sky-100 dark:border-sky-900/30 p-10 text-center">
              <Users className="size-10 mx-auto mb-3 text-sky-400 opacity-50" />
              <p className="font-semibold mb-1">No groups yet</p>
              <p className="text-sm text-muted-foreground mb-4">Find your people and join a community group</p>
              <Link href="/community" className="inline-flex items-center gap-2 rounded-full bg-sky-500 text-white px-5 py-2 text-sm font-semibold hover:bg-sky-600 transition-colors">
                Browse groups <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {myGroups.slice(0, 4).map((group: any) => (
                <Link key={group.id} href={`/community/${group.id}`} className="group rounded-2xl bg-white dark:bg-background border border-sky-100 dark:border-sky-900/30 overflow-hidden hover:shadow-lg hover:shadow-sky-100 transition-all hover:-translate-y-1">
                  <div className="aspect-[4/3] bg-sky-100 dark:bg-sky-900/30 overflow-hidden">
                    {group.image
                      ? <img src={group.image} alt={group.name} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="size-full flex items-center justify-center text-3xl">👥</div>
                    }
                  </div>
                  <div className="p-4">
                    <p className="font-bold text-sm mb-1 line-clamp-1">{group.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{group.category}</p>
                    <p className="text-xs text-sky-600 font-medium mt-2">{group.member_count || 0} members</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Friend activity */}
          {friendActivity.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">Friend activity</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {friendActivity.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-white dark:bg-background border border-sky-100 dark:border-sky-900/30 px-4 py-3">
                    <Link href={`/profile/${item.userId}`}>
                      <div className="size-9 rounded-full bg-sky-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.profile?.avatar_url
                          ? <img src={item.profile.avatar_url} alt={item.profile.full_name} className="size-full object-cover" />
                          : <User className="size-4 text-sky-400" />
                        }
                      </div>
                    </Link>
                    <p className="text-sm flex-1 min-w-0">
                      <Link href={`/profile/${item.userId}`} className="font-semibold hover:underline">{item.profile?.full_name}</Link>
                      {item.type === "log" && <span className="text-muted-foreground"> logged a <span className="capitalize">{item.data.activity_type}</span>{item.data.distance ? ` · ${item.data.distance}km` : ""}</span>}
                      {item.type === "reg" && item.data.events && <span className="text-muted-foreground"> joined <span className="font-medium text-foreground">{item.data.events.title}</span></span>}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">{format(new Date(item.timestamp), "MMM d")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested people */}
          {suggestedPeople.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-3">People you may know</h3>
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {suggestedPeople.map(person => (
                  <Link key={person.id} href={`/profile/${person.id}`} className="group rounded-2xl bg-white dark:bg-background border border-sky-100 dark:border-sky-900/30 p-4 text-center hover:shadow-md transition-all hover:-translate-y-1 shrink-0 w-36">
                    <div className="size-14 rounded-full bg-sky-100 overflow-hidden mx-auto mb-3 flex items-center justify-center">
                      {person.avatar_url
                        ? <img src={person.avatar_url} alt={person.full_name} className="size-full object-cover" />
                        : <User className="size-6 text-sky-400" />
                      }
                    </div>
                    <p className="text-sm font-semibold truncate">{person.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{person.location || "No location"}</p>
                    <p className="text-xs text-sky-600 font-medium mt-2">View profile</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── BOTTOM CTA ── */}
      <div className="w-full bg-foreground text-background px-6 py-12">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black mb-1">Ready to compete?</h2>
            <p className="text-background/60 text-sm">Log your activity and climb the leaderboard</p>
          </div>
          <div className="flex gap-3">
            <Link href="/compete/log" className="flex items-center gap-2 rounded-full bg-background text-foreground px-6 py-3 text-sm font-bold hover:bg-background/90 transition-colors">
              <Zap className="size-4" /> Log activity
            </Link>
            <Link href="/compete/leagues" className="flex items-center gap-2 rounded-full bg-background/10 border border-background/20 text-background px-6 py-3 text-sm font-medium hover:bg-background/20 transition-colors">
              <Trophy className="size-4" /> Leagues
            </Link>
          </div>
        </div>
      </div>

    </div>
  )
}