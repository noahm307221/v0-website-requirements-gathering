"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel, BADGES } from "@/lib/points"
import { format, isToday, isTomorrow } from "date-fns"
import { ChevronRight, MapPin, Users, Trophy, Flame, Calendar, User, Zap, ArrowRight, MessageCircle } from "lucide-react"

interface Props { userId: string; userEmail: string }

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  return format(d, "EEE, MMM d")
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
        supabase.from("group_members").select("group_id, groups(*)").eq("user_id", userId).limit(6),
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
          .slice(0, 6)
      }

      const profile = profileRes.data
      const favCats = profile?.favourite_categories?.split(",").filter(Boolean) || []
      let recommendedEvents: any[] = []
      const registeredIds = regsRes.data?.map(r => r.event_id) || []

      if (favCats.length > 0) {
        const { data: recEvents } = await supabase.from("events").select("*").in("category_id", favCats).gte("date", today).limit(8)
        recommendedEvents = (recEvents || []).filter(e => !registeredIds.includes(e.id)).slice(0, 5)
      }
      if (recommendedEvents.length < 5) {
        const { data: moreEvents } = await supabase.from("events").select("*").gte("date", today).limit(12)
        const extra = (moreEvents || []).filter(e => !registeredIds.includes(e.id) && !recommendedEvents.find(r => r.id === e.id))
        recommendedEvents = [...recommendedEvents, ...extra].slice(0, 5)
      }

      const stats = statsRes.data || []
      const totalPoints = stats.reduce((s: number, r: any) => s + (r.total_points || 0), 0)
      const totalEvents = stats.reduce((s: number, r: any) => s + (r.events_attended || 0), 0)
      const maxStreak = Math.max(...stats.map((r: any) => r.streak_weeks || 0), 0)

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
          supabase.from("activity_logs").select("*").in("user_id", followingIds).order("logged_at", { ascending: false }).limit(4),
          supabase.from("registrations").select("*, events(title, date, location)").in("user_id", followingIds).order("registered_at", { ascending: false }).limit(4),
        ])
        const { data: friendProfiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", followingIds)
        const pMap: Record<string, any> = {}
        friendProfiles?.forEach(p => { pMap[p.id] = p })
        friendActivity = [
          ...(logsRes.data || []).map(l => ({ type: "log", timestamp: l.logged_at, profile: pMap[l.user_id], userId: l.user_id, data: l })),
          ...(friendRegsRes.data || []).map(r => ({ type: "reg", timestamp: r.registered_at, profile: pMap[r.user_id], userId: r.user_id, data: r })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)
      }

      let suggestedPeople: any[] = []
      if (followingIds.length < 10) {
        const { data: suggestions } = await supabase.from("profiles").select("id, full_name, avatar_url, location, favourite_categories").eq("is_public", true).neq("id", userId).limit(20)
        suggestedPeople = (suggestions || []).filter(p => !followingIds.includes(p.id)).slice(0, 5)
      }

      setData({
        profile, totalPoints, totalEvents, maxStreak,
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

  const { profile, totalPoints, totalEvents, maxStreak, rank, level,
    upcomingEvents, recommendedEvents, myGroups, myLeagues,
    friendActivity, suggestedPeople, nextBadge, earnedBadges } = data

  const firstName = profile?.full_name?.split(" ")[0] || "Athlete"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening"
  const progressPct = level.max !== Infinity ? Math.min(((totalPoints - level.min) / (level.max - level.min)) * 100, 100) : 100

  return (
    <div className="w-full">

      {/* ── HERO ── */}
      <div className="w-full bg-foreground text-background px-6 py-12 md:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="text-background/50 text-sm mb-2 uppercase tracking-widest font-medium">{greeting}, {firstName}</p>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
            <div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none">
                {level.emoji} {level.name}
              </h1>
              <p className="text-background/40 text-xl mt-2">{totalPoints.toLocaleString()} pts</p>
              {level.max !== Infinity && (
                <div className="max-w-xs mt-3">
                  <div className="h-1 rounded-full bg-background/20 overflow-hidden">
                    <div className="h-full rounded-full bg-background transition-all duration-700" style={{ width: `${progressPct}%` }} />
                  </div>
                  <p className="text-xs text-background/30 mt-1">{level.max - totalPoints + 1} pts to next level</p>
                </div>
              )}
            </div>
            {maxStreak > 0 && (
              <div className="text-right">
                <p className="text-7xl md:text-9xl font-black tabular-nums text-background/20 leading-none">{maxStreak}</p>
                <p className="text-background/50 text-sm uppercase tracking-widest -mt-2">week streak 🔥</p>
              </div>
            )}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <Link href="/compete/log" className="flex items-center gap-2 rounded-full bg-background text-foreground px-6 py-3 text-sm font-bold hover:bg-background/90 transition-colors">
              <Zap className="size-4" /> Log activity
            </Link>
            <Link href="/events" className="flex items-center gap-2 rounded-full bg-background/10 text-background border border-background/20 px-6 py-3 text-sm font-medium hover:bg-background/20 transition-colors">
              <Calendar className="size-4" /> Browse events
            </Link>
          </div>
        </div>
      </div>

      {/* ── RECOMMENDED EVENTS — varied sizes ── */}
      {recommendedEvents.length > 0 && (
        <div className="w-full bg-orange-50 dark:bg-orange-950/20 px-6 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-orange-500 mb-1">Picked for you</p>
                <h2 className="text-3xl font-black tracking-tight">Events you'll love</h2>
              </div>
              <Link href="/events" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                All events <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* Asymmetric grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Big hero card */}
              {recommendedEvents[0] && (
                <Link href={`/events/${recommendedEvents[0].id}`} className="col-span-2 lg:col-span-2 row-span-2 group rounded-3xl bg-white dark:bg-background border border-orange-100 overflow-hidden hover:shadow-xl hover:shadow-orange-100 transition-all hover:-translate-y-1">
                  <div className="relative h-64 lg:h-80 bg-orange-100 overflow-hidden">
                    {recommendedEvents[0].image
                      ? <img src={recommendedEvents[0].image} alt={recommendedEvents[0].title} className="size-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      : <div className="size-full flex items-center justify-center text-6xl">🎯</div>
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      {recommendedEvents[0].category_id && (
                        <span className="inline-block rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold capitalize mb-2">{recommendedEvents[0].category_id}</span>
                      )}
                      <h3 className="text-2xl font-black mb-1">{recommendedEvents[0].title}</h3>
                      <div className="flex items-center gap-3 text-white/80 text-sm">
                        <span className="flex items-center gap-1"><MapPin className="size-3" />{recommendedEvents[0].location}</span>
                        <span>{formatEventDate(recommendedEvents[0].date)}</span>
                        {recommendedEvents[0].price && <span className="font-bold text-white">{recommendedEvents[0].price === "0" || recommendedEvents[0].price?.toLowerCase() === "free" ? "Free" : recommendedEvents[0].price}</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Smaller cards */}
              {recommendedEvents.slice(1, 5).map((event, i) => (
                <Link key={event.id} href={`/events/${event.id}`} className="group rounded-2xl bg-white dark:bg-background border border-orange-100 overflow-hidden hover:shadow-lg hover:shadow-orange-100 transition-all hover:-translate-y-1">
                  <div className={`${i === 0 ? "h-32" : "h-24"} bg-orange-100 overflow-hidden`}>
                    {event.image
                      ? <img src={event.image} alt={event.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      : <div className="size-full flex items-center justify-center text-2xl">🎯</div>
                    }
                  </div>
                  <div className="p-3">
                    <p className="font-bold text-sm line-clamp-1 mb-1">{event.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                      <MapPin className="size-2.5 shrink-0" />{event.location}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-orange-600 font-medium">{formatEventDate(event.date)}</p>
                      {event.price && <p className="text-xs font-bold">{event.price === "0" || event.price?.toLowerCase() === "free" ? "Free" : event.price}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── UPCOMING (horizontal scroll) ── */}
      {upcomingEvents.length > 0 && (
        <div className="w-full px-6 py-10 bg-white dark:bg-background border-b">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-500 mb-1">You're going</p>
                <h2 className="text-xl font-black">Upcoming events</h2>
              </div>
              <Link href="/profile" className="text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1">
                All <ChevronRight className="size-3" />
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6" style={{ scrollbarWidth: "none" }}>
              {upcomingEvents.map(reg => (
                <Link key={reg.id} href={`/events/${reg.event.id}`} className="group flex items-center gap-3 rounded-2xl border bg-violet-50 dark:bg-violet-950/20 border-violet-100 px-4 py-3 hover:border-violet-400 transition-colors shrink-0 min-w-[260px]">
                  {reg.event.image && <img src={reg.event.image} alt={reg.event.title} className="size-12 rounded-xl object-cover shrink-0" />}
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{reg.event.title}</p>
                    <p className={`text-xs font-semibold ${isToday(new Date(reg.event.date)) ? "text-green-600" : "text-violet-600"}`}>{formatEventDate(reg.event.date)}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin className="size-2.5" />{reg.event.location}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── GROUPS — big and prominent ── */}
      <div className="w-full bg-sky-50 dark:bg-sky-950/20 px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-500 mb-1">Community</p>
              <h2 className="text-3xl font-black tracking-tight">Your groups</h2>
            </div>
            <Link href="/community" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              {myGroups.length > 0 ? "All groups" : "Find groups"} <ArrowRight className="size-4" />
            </Link>
          </div>

          {myGroups.length === 0 ? (
            <div className="rounded-3xl bg-white dark:bg-background border border-sky-100 p-12 text-center">
              <div className="text-5xl mb-4">👥</div>
              <p className="text-xl font-black mb-2">Find your people</p>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">Join local groups, chat with members, and discover events together</p>
              <Link href="/community" className="inline-flex items-center gap-2 rounded-full bg-sky-500 text-white px-6 py-3 text-sm font-bold hover:bg-sky-600 transition-colors">
                Browse groups <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {myGroups.slice(0, 3).map((group: any, i: number) => (
                <Link key={group.id} href={`/community/${group.id}`} className={`group rounded-3xl bg-white dark:bg-background border border-sky-100 overflow-hidden hover:shadow-xl hover:shadow-sky-100 transition-all hover:-translate-y-1 ${i === 0 ? "col-span-2 lg:col-span-1" : ""}`}>
                  <div className={`${i === 0 ? "h-48" : "h-32"} bg-sky-100 overflow-hidden`}>
                    {group.image
                      ? <img src={group.image} alt={group.name} className="size-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      : <div className="size-full flex items-center justify-center text-4xl">👥</div>
                    }
                  </div>
                  <div className="p-4">
                    <p className="font-black text-base mb-1 line-clamp-1">{group.name}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground capitalize">{group.category}</p>
                      <p className="text-xs text-sky-600 font-semibold flex items-center gap-1">
                        <Users className="size-3" />{group.member_count || 0}
                      </p>
                    </div>
                    <p className="text-xs text-sky-500 font-medium mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <MessageCircle className="size-3" /> Open chat
                    </p>
                  </div>
                </Link>
              ))}

              {/* More groups as compact list */}
              {myGroups.length > 3 && (
                <div className="col-span-2 lg:col-span-3 grid sm:grid-cols-3 gap-3">
                  {myGroups.slice(3, 6).map((group: any) => (
                    <Link key={group.id} href={`/community/${group.id}`} className="flex items-center gap-3 rounded-2xl bg-white dark:bg-background border border-sky-100 px-4 py-3 hover:border-sky-400 transition-colors group">
                      <div className="size-10 rounded-xl bg-sky-100 overflow-hidden shrink-0">
                        {group.image ? <img src={group.image} alt={group.name} className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-lg">👥</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.member_count || 0} members</p>
                      </div>
                      <MessageCircle className="size-4 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Friend activity */}
          {friendActivity.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Friend activity</h3>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-6 px-6" style={{ scrollbarWidth: "none" }}>
                {friendActivity.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl bg-white dark:bg-background border border-sky-100 px-4 py-3 shrink-0 min-w-[260px]">
                    <Link href={`/profile/${item.userId}`}>
                      <div className="size-9 rounded-full bg-sky-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {item.profile?.avatar_url ? <img src={item.profile.avatar_url} alt="" className="size-full object-cover" /> : <User className="size-4 text-sky-400" />}
                      </div>
                    </Link>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{item.profile?.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.type === "log" ? `Logged ${item.data.activity_type}${item.data.distance ? ` · ${item.data.distance}km` : ""}` : item.data.events ? `Joined ${item.data.events.title}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested people */}
          {suggestedPeople.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">People you may know</h3>
              <div className="flex gap-3 overflow-x-auto pb-1 -mx-6 px-6" style={{ scrollbarWidth: "none" }}>
                {suggestedPeople.map(person => (
                  <Link key={person.id} href={`/profile/${person.id}`} className="group rounded-2xl bg-white dark:bg-background border border-sky-100 p-4 text-center hover:shadow-md hover:-translate-y-1 transition-all shrink-0 w-32">
                    <div className="size-12 rounded-full bg-sky-100 overflow-hidden mx-auto mb-2 flex items-center justify-center">
                      {person.avatar_url ? <img src={person.avatar_url} alt="" className="size-full object-cover" /> : <User className="size-5 text-sky-400" />}
                    </div>
                    <p className="text-xs font-bold truncate">{person.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{person.location || "—"}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── RANKING — small, bottom ── */}
      <div className="w-full px-6 py-8 border-t bg-muted/30">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Global rank</p>
                <p className="text-3xl font-black">{rank ? `#${rank}` : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Points</p>
                <p className="text-3xl font-black">{totalPoints.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Streak</p>
                <p className="text-3xl font-black">{maxStreak > 0 ? `${maxStreak}wk 🔥` : "—"}</p>
              </div>
              {nextBadge && (
                <div className="hidden sm:block">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest mb-0.5">Next badge</p>
                  <p className="text-sm font-bold flex items-center gap-1.5">
                    <span className="grayscale opacity-50">{nextBadge.emoji}</span> {nextBadge.name}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Link href="/compete" className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                <Trophy className="size-4" /> Leaderboard
              </Link>
              {myLeagues.length > 0 && (
                <Link href="/compete/leagues" className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">
                  Leagues
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}