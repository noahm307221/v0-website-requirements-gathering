"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel, BADGES } from "@/lib/points"
import { format, isToday, isTomorrow } from "date-fns"
import {
  ChevronRight, MapPin, Users, Trophy, Flame,
  Calendar, MessageCircle, TrendingUp, User, Zap
} from "lucide-react"

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
      const [
        profileRes, statsRes, badgesRes, regsRes,
        groupsRes, leaguesRes, followsRes, allStatsRes
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_stats").select("*").eq("user_id", userId),
        supabase.from("user_badges").select("*").eq("user_id", userId),
        supabase.from("registrations").select("*").eq("user_id", userId),
        supabase.from("group_members").select("group_id, groups(*)").eq("user_id", userId).limit(4),
        supabase.from("league_members").select("*, leagues(*)").eq("user_id", userId),
        supabase.from("follows").select("following_id").eq("follower_id", userId),
        supabase.from("user_stats").select("user_id, total_points"),
      ])

      // Events
      const today = new Date().toISOString().split("T")[0]
      let upcomingEvents: any[] = []
      if (regsRes.data && regsRes.data.length > 0) {
        const { data: eventData } = await supabase.from("events").select("*").in("id", regsRes.data.map(r => r.event_id))
        upcomingEvents = regsRes.data
          .map(r => ({ ...r, event: eventData?.find(e => e.id === r.event_id) }))
          .filter(r => r.event && r.event.date >= today)
          .sort((a, b) => a.event.date.localeCompare(b.event.date))
          .slice(0, 3)
      }

      // Recommended events (based on favourite categories + location)
      const profile = profileRes.data
      const favCats = profile?.favourite_categories?.split(",").filter(Boolean) || []
      let recommendedEvents: any[] = []
      const registeredIds = regsRes.data?.map(r => r.event_id) || []
      if (favCats.length > 0) {
        const { data: recEvents } = await supabase.from("events").select("*").in("category_id", favCats).gte("date", today).limit(6)
        recommendedEvents = (recEvents || []).filter(e => !registeredIds.includes(e.id)).slice(0, 4)
      }
      if (recommendedEvents.length < 4) {
        const { data: moreEvents } = await supabase.from("events").select("*").gte("date", today).limit(8)
        const extra = (moreEvents || []).filter(e => !registeredIds.includes(e.id) && !recommendedEvents.find(r => r.id === e.id))
        recommendedEvents = [...recommendedEvents, ...extra].slice(0, 4)
      }

      // Stats
      const stats = statsRes.data || []
      const totalPoints = stats.reduce((s: number, r: any) => s + (r.total_points || 0), 0)
      const totalEvents = stats.reduce((s: number, r: any) => s + (r.events_attended || 0), 0)
      const maxStreak = Math.max(...stats.map((r: any) => r.streak_weeks || 0), 0)
      const totalWins = stats.reduce((s: number, r: any) => s + (r.matches_won || 0), 0)

      // Rank
      const allAgg: Record<string, number> = {}
      allStatsRes.data?.forEach((s: any) => { allAgg[s.user_id] = (allAgg[s.user_id] || 0) + (s.total_points || 0) })
      const sorted = Object.entries(allAgg).sort((a, b) => b[1] - a[1])
      const rank = sorted.findIndex(([uid]) => uid === userId)

      // Badges close to unlocking
      const earnedBadgeIds = new Set(badgesRes.data?.map((b: any) => b.badge_id) || [])
      const nextBadge = BADGES.find(b => !earnedBadgeIds.has(b.id))

      // Friend activity
      let friendActivity: any[] = []
      const followingIds = followsRes.data?.map(f => f.following_id) || []
      if (followingIds.length > 0) {
        const [logsRes, friendRegsRes] = await Promise.all([
          supabase.from("activity_logs").select("*").in("user_id", followingIds).order("logged_at", { ascending: false }).limit(5),
          supabase.from("registrations").select("*, events(title, date, location)").in("user_id", followingIds).order("registered_at", { ascending: false }).limit(5),
        ])
        const { data: friendProfiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", followingIds)
        const pMap: Record<string, any> = {}
        friendProfiles?.forEach(p => { pMap[p.id] = p })

        friendActivity = [
          ...(logsRes.data || []).map(l => ({ type: "log", timestamp: l.logged_at, profile: pMap[l.user_id], userId: l.user_id, data: l })),
          ...(friendRegsRes.data || []).map(r => ({ type: "reg", timestamp: r.registered_at, profile: pMap[r.user_id], userId: r.user_id, data: r })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5)
      }

      // Suggested people
      let suggestedPeople: any[] = []
      if (followingIds.length < 10) {
        const { data: suggestions } = await supabase.from("profiles").select("id, full_name, avatar_url, location, favourite_categories").eq("is_public", true).neq("id", userId).limit(20)
        suggestedPeople = (suggestions || []).filter(p => !followingIds.includes(p.id)).slice(0, 4)
      }

      // Groups
      const myGroups = groupsRes.data?.map(m => m.groups).filter(Boolean) || []

      // Leagues
      const myLeagues = leaguesRes.data || []

      setData({
        profile, totalPoints, totalEvents, maxStreak, totalWins,
        rank: rank !== -1 ? rank + 1 : null,
        level: getLevel(totalPoints),
        upcomingEvents, recommendedEvents, myGroups, myLeagues,
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
        <p className="text-xs text-muted-foreground tracking-widest uppercase">Loading your dashboard</p>
      </div>
    </div>
  )

  const { profile, totalPoints, totalEvents, maxStreak, totalWins, rank, level,
    upcomingEvents, recommendedEvents, myGroups, myLeagues,
    friendActivity, suggestedPeople, nextBadge, earnedBadges } = data

  const firstName = profile?.full_name?.split(" ")[0] || "Athlete"
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">

      {/* Header greeting */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{greeting}</p>
          <h1 className="text-3xl font-black tracking-tight">{firstName} <span className="text-muted-foreground font-normal">·</span> {level.emoji} {level.name}</h1>
        </div>
        <Link href="/compete/log" className="flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">
          <Zap className="size-3.5" /> Log activity
        </Link>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-4 rounded-2xl border overflow-hidden mb-8">
        {[
          { label: "Points", value: totalPoints.toLocaleString(), sub: level.name, link: "/compete" },
          { label: "Global rank", value: rank ? `#${rank}` : "—", sub: "leaderboard", link: "/compete" },
          { label: "Streak", value: maxStreak > 0 ? `${maxStreak}wk` : "—", sub: maxStreak > 0 ? "🔥 active" : "start today", link: "/compete/log" },
          { label: "Wins", value: totalWins, sub: `${totalEvents} events`, link: "/profile" },
        ].map(({ label, value, sub, link }, i) => (
          <Link key={label} href={link} className={`group px-5 py-4 hover:bg-muted transition-colors ${i < 3 ? "border-r" : ""}`}>
            <p className="text-2xl font-black tabular-nums tracking-tight">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5 group-hover:text-muted-foreground transition-colors">{sub}</p>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">

          {/* Upcoming events */}
          {upcomingEvents.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Your upcoming events</h2>
                <Link href="/profile" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">All <ChevronRight className="size-3" /></Link>
              </div>
              <div className="space-y-2">
                {upcomingEvents.map(reg => (
                  <Link key={reg.id} href={`/events/${reg.event.id}`} className="flex items-center gap-4 rounded-2xl border px-4 py-3 hover:border-foreground transition-colors group">
                    {reg.event.image && <img src={reg.event.image} alt={reg.event.title} className="size-14 rounded-xl object-cover shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{reg.event.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <Calendar className="size-3" />
                        <span className={isToday(new Date(reg.event.date)) ? "text-green-600 font-semibold" : ""}>{formatEventDate(reg.event.date)}</span>
                        <span>·</span>
                        <MapPin className="size-3" />
                        {reg.event.location}
                      </p>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recommended events */}
          {recommendedEvents.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Recommended for you</h2>
                <Link href="/events" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">All events <ChevronRight className="size-3" /></Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {recommendedEvents.map(event => (
                  <Link key={event.id} href={`/events/${event.id}`} className="group rounded-2xl border overflow-hidden hover:border-foreground transition-colors">
                    {event.image && (
                      <div className="aspect-[16/7] overflow-hidden bg-muted">
                        <img src={event.image} alt={event.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="font-semibold text-sm mb-1 truncate">{event.title}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><MapPin className="size-3" />{event.location}</span>
                        <span>{formatEventDate(event.date)}</span>
                      </div>
                      {event.price && <p className="text-xs font-semibold mt-2">{event.price === "0" || event.price === "Free" ? "Free" : event.price}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Friend activity */}
          {friendActivity.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Friend activity</h2>
              </div>
              <div className="rounded-2xl border divide-y">
                {friendActivity.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <Link href={`/profile/${item.userId}`}>
                      <div className="size-8 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                        {item.profile?.avatar_url
                          ? <img src={item.profile.avatar_url} alt={item.profile.full_name} className="size-full object-cover" />
                          : <User className="size-3.5 text-muted-foreground" />
                        }
                      </div>
                    </Link>
                    <p className="text-sm flex-1 min-w-0">
                      <Link href={`/profile/${item.userId}`} className="font-semibold hover:underline">{item.profile?.full_name}</Link>
                      {item.type === "log" && <span className="text-muted-foreground"> logged a <span className="capitalize">{item.data.activity_type}</span>{item.data.distance ? ` · ${item.data.distance}km` : ""}</span>}
                      {item.type === "reg" && item.data.events && <span className="text-muted-foreground"> joined <Link href={`/events/${item.data.event_id}`} className="font-medium hover:underline text-foreground">{item.data.events.title}</Link></span>}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">{format(new Date(item.timestamp), "MMM d")}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty state if nothing yet */}
          {upcomingEvents.length === 0 && recommendedEvents.length === 0 && (
            <div className="rounded-2xl border border-dashed p-12 text-center">
              <p className="font-semibold mb-1">Welcome to Balance</p>
              <p className="text-sm text-muted-foreground mb-4">Browse events near you and start tracking your activity</p>
              <Link href="/events" className="inline-flex items-center gap-2 rounded-xl bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90">
                Browse events <ChevronRight className="size-4" />
              </Link>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">

          {/* Next badge */}
          {nextBadge && (
            <section className="rounded-2xl border p-4">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Next badge</h2>
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-muted flex items-center justify-center text-2xl grayscale opacity-50">{nextBadge.emoji}</div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{nextBadge.name}</p>
                  <p className="text-xs text-muted-foreground">{nextBadge.description}</p>
                </div>
              </div>
              <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-foreground rounded-full w-1/3" />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Keep going to unlock</p>
            </section>
          )}

          {/* My leagues */}
          {myLeagues.length > 0 && (
            <section className="rounded-2xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Leagues</h2>
                <Link href="/compete/leagues" className="text-xs text-muted-foreground hover:text-foreground"><ChevronRight className="size-3.5" /></Link>
              </div>
              <div className="space-y-2">
                {myLeagues.slice(0, 3).map(m => (
                  <Link key={m.league_id} href={`/compete/leagues/${m.league_id}`} className="flex items-center justify-between rounded-xl hover:bg-muted px-2 py-2 transition-colors group">
                    <div>
                      <p className="text-sm font-semibold">{m.leagues?.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{m.leagues?.activity_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">{m.total_points || 0}</p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* My groups */}
          {myGroups.length > 0 && (
            <section className="rounded-2xl border p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Groups</h2>
                <Link href="/community" className="text-xs text-muted-foreground hover:text-foreground"><ChevronRight className="size-3.5" /></Link>
              </div>
              <div className="space-y-1">
                {myGroups.slice(0, 4).map((group: any) => (
                  <Link key={group.id} href={`/community/${group.id}`} className="flex items-center gap-3 rounded-xl hover:bg-muted px-2 py-2 transition-colors">
                    <div className="size-8 rounded-lg bg-muted overflow-hidden shrink-0">
                      {group.image
                        ? <img src={group.image} alt={group.name} className="size-full object-cover" />
                        : <Users className="size-4 m-2 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.member_count || 0} members</p>
                    </div>
                    <MessageCircle className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Suggested people */}
          {suggestedPeople.length > 0 && (
            <section className="rounded-2xl border p-4">
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">People you may know</h2>
              <div className="space-y-3">
                {suggestedPeople.map(person => (
                  <div key={person.id} className="flex items-center gap-3">
                    <Link href={`/profile/${person.id}`}>
                      <div className="size-8 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                        {person.avatar_url
                          ? <img src={person.avatar_url} alt={person.full_name} className="size-full object-cover" />
                          : <User className="size-3.5 text-muted-foreground" />
                        }
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{person.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{person.location || "No location"}</p>
                    </div>
                    <Link href={`/profile/${person.id}`} className="text-xs font-medium text-muted-foreground hover:text-foreground border rounded-full px-2.5 py-1 hover:border-foreground transition-colors">
                      View
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quick links */}
          <section className="rounded-2xl border p-4">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Quick links</h2>
            <div className="space-y-1">
              {[
                { href: "/events", label: "Browse events", icon: Calendar },
                { href: "/compete", label: "Leaderboard", icon: Trophy },
                { href: "/compete/log", label: "Log activity", icon: Flame },
                { href: "/community", label: "Find groups", icon: Users },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted transition-colors text-sm text-muted-foreground hover:text-foreground">
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}