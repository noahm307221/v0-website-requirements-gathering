"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel, BADGES } from "@/lib/points"
import { format, isToday, isTomorrow } from "date-fns"
import { MapPin, Users, Calendar, User, ArrowRight, MessageCircle, Zap, ChevronRight } from "lucide-react"

interface Props { userId: string; userEmail: string }

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  return format(d, "EEE d MMM")
}

// Warm, varied accent colours per card slot — no two sections feel the same
const EVENT_PILL_COLORS = [
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
]

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
      if (regsRes.data?.length > 0) {
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
        recommendedEvents = (recEvents || []).filter(e => !registeredIds.includes(e.id))
      }
      if (recommendedEvents.length < 5) {
        const { data: moreEvents } = await supabase.from("events").select("*").gte("date", today).limit(12)
        const extra = (moreEvents || []).filter(e => !registeredIds.includes(e.id) && !recommendedEvents.find(r => r.id === e.id))
        recommendedEvents = [...recommendedEvents, ...extra]
      }
      recommendedEvents = recommendedEvents.slice(0, 5)

      const stats = statsRes.data || []
      const totalPoints = stats.reduce((s: number, r: any) => s + (r.total_points || 0), 0)
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
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6)
      }

      let suggestedPeople: any[] = []
      if (followingIds.length < 10) {
        const { data: suggestions } = await supabase.from("profiles").select("id, full_name, avatar_url, location, favourite_categories").eq("is_public", true).neq("id", userId).limit(20)
        suggestedPeople = (suggestions || []).filter(p => !followingIds.includes(p.id)).slice(0, 6)
      }

      setData({
        profile, totalPoints, maxStreak,
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
      <div className="size-5 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const { profile, totalPoints, maxStreak, rank, level,
    upcomingEvents, recommendedEvents, myGroups, myLeagues,
    friendActivity, suggestedPeople, nextBadge, earnedBadges } = data

  const firstName = profile?.full_name?.split(" ")[0] || null
  const hour = new Date().getHours()
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const greeting = firstName ? `${timeGreeting}, ${firstName} 👋` : `${timeGreeting} 👋`

  // Determine a friendly contextual subtitle
  const subtitle = upcomingEvents.length > 0
    ? `You have ${upcomingEvents.length} upcoming event${upcomingEvents.length > 1 ? "s" : ""}. What are you up to today?`
    : recommendedEvents.length > 0
    ? "We've found some events you might love. Explore below."
    : "Welcome back — let's find something fun to do."

  return (
    <div className="w-full">

      {/* ── HERO — warm, light, friendly ── */}
      <div className="w-full px-6 pt-10 pb-8 border-b bg-gradient-to-b from-amber-50/60 to-background">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{greeting}</h1>
              <p className="text-muted-foreground mt-2 text-base max-w-md">{subtitle}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link href="/events" className="flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">
                <Calendar className="size-4" /> Browse events
              </Link>
              <Link href="/compete/log" className="flex items-center gap-2 rounded-full border px-5 py-2.5 text-sm font-medium hover:bg-muted transition-colors">
                <Zap className="size-4" /> Log activity
              </Link>
            </div>
          </div>

          {/* Upcoming events — tight pill strip just below greeting */}
          {upcomingEvents.length > 0 && (
            <div className="mt-6 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {upcomingEvents.map((reg, i) => (
                <Link key={reg.id} href={`/events/${reg.event.id}`}
                  className={`flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium shrink-0 border hover:shadow-sm transition-all hover:-translate-y-0.5 bg-white ${isToday(new Date(reg.event.date)) ? "border-green-300 text-green-700" : "border-border"}`}>
                  <span className={`size-2 rounded-full shrink-0 ${isToday(new Date(reg.event.date)) ? "bg-green-500" : "bg-foreground/20"}`} />
                  <span className="truncate max-w-[140px]">{reg.event.title}</span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatEventDate(reg.event.date)}</span>
                </Link>
              ))}
              <Link href="/profile" className="flex items-center gap-1 rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground shrink-0 border border-dashed hover:border-foreground transition-colors">
                All <ChevronRight className="size-3" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ── RECOMMENDED EVENTS — dynamic asymmetric grid ── */}
      {recommendedEvents.length > 0 && (
        <div className="w-full px-6 py-12">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-end justify-between mb-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-rose-500 mb-1.5">Picked for you</p>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">Events you'll love</h2>
              </div>
              <Link href="/events" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                All events <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* 
              Dynamic grid — changes layout based on count:
              1 event: full width
              2 events: 50/50
              3+ events: big left + stack right, then row of smalls below
            */}
            {recommendedEvents.length === 1 && (
              <EventCardLarge event={recommendedEvents[0]} colorIdx={0} />
            )}

            {recommendedEvents.length === 2 && (
              <div className="grid grid-cols-2 gap-4">
                <EventCardLarge event={recommendedEvents[0]} colorIdx={0} />
                <EventCardLarge event={recommendedEvents[1]} colorIdx={1} />
              </div>
            )}

            {recommendedEvents.length >= 3 && (
              <div className="space-y-4">
                {/* Top row: big + tall stack */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Big hero — takes 2 cols */}
                  <Link href={`/events/${recommendedEvents[0].id}`}
                    className="col-span-2 group relative rounded-3xl overflow-hidden bg-stone-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                    style={{ minHeight: 320 }}>
                    {recommendedEvents[0].image
                      ? <img src={recommendedEvents[0].image} alt={recommendedEvents[0].title} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      : <div className="absolute inset-0 flex items-center justify-center text-7xl bg-gradient-to-br from-rose-100 to-orange-100">🎯</div>
                    }
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <span className="inline-block rounded-full bg-white/20 backdrop-blur-sm px-3 py-1 text-xs font-semibold capitalize mb-2">
                        {recommendedEvents[0].category_id || "Event"}
                      </span>
                      <h3 className="text-2xl font-black leading-tight mb-1">{recommendedEvents[0].title}</h3>
                      <div className="flex items-center gap-3 text-white/75 text-xs">
                        <span className="flex items-center gap-1"><MapPin className="size-3" />{recommendedEvents[0].location}</span>
                        <span>{formatEventDate(recommendedEvents[0].date)}</span>
                        {recommendedEvents[0].price && <span className="font-bold text-white">{recommendedEvents[0].price?.toLowerCase() === "free" || recommendedEvents[0].price === "0" ? "Free" : recommendedEvents[0].price}</span>}
                      </div>
                    </div>
                  </Link>

                  {/* Right stack — 1 col, 2 cards stacked */}
                  <div className="flex flex-col gap-4">
                    {recommendedEvents.slice(1, 3).map((event, i) => (
                      <Link key={event.id} href={`/events/${event.id}`}
                        className="group flex-1 relative rounded-2xl overflow-hidden bg-stone-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                        style={{ minHeight: 148 }}>
                        {event.image
                          ? <img src={event.image} alt={event.title} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          : <div className="absolute inset-0 flex items-center justify-center text-4xl bg-gradient-to-br from-violet-100 to-sky-100">🎯</div>
                        }
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                          <p className="text-sm font-bold line-clamp-1">{event.title}</p>
                          <p className="text-xs text-white/70">{formatEventDate(event.date)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Bottom row: remaining events as smaller landscape cards */}
                {recommendedEvents.length > 3 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {recommendedEvents.slice(3).map((event, i) => (
                      <Link key={event.id} href={`/events/${event.id}`}
                        className="group rounded-2xl border bg-white hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden">
                        <div className="h-28 bg-stone-100 overflow-hidden">
                          {event.image
                            ? <img src={event.image} alt={event.title} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            : <div className="size-full flex items-center justify-center text-3xl">🎯</div>
                          }
                        </div>
                        <div className="p-3">
                          <p className="font-bold text-sm line-clamp-1 mb-1">{event.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-2.5 shrink-0" /><span className="truncate">{event.location}</span></p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${EVENT_PILL_COLORS[(i + 3) % EVENT_PILL_COLORS.length]}`}>{formatEventDate(event.date)}</span>
                            {event.price && <span className="text-xs font-bold">{event.price?.toLowerCase() === "free" || event.price === "0" ? "Free" : event.price}</span>}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GROUPS ── */}
      <div className="w-full px-6 py-12 bg-sky-50/60 dark:bg-sky-950/10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-end justify-between mb-7">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-sky-500 mb-1.5">Community</p>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                {myGroups.length > 0 ? "Your groups" : "Find your people"}
              </h2>
            </div>
            <Link href="/community" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              {myGroups.length > 0 ? "All groups" : "Browse groups"} <ArrowRight className="size-4" />
            </Link>
          </div>

          {myGroups.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-sky-200 p-12 text-center">
              <div className="text-5xl mb-4">👥</div>
              <p className="text-xl font-black mb-2">No groups yet</p>
              <p className="text-muted-foreground mb-6 max-w-xs mx-auto text-sm">Join local groups, chat with members and discover events together</p>
              <Link href="/community" className="inline-flex items-center gap-2 rounded-full bg-sky-500 text-white px-6 py-2.5 text-sm font-bold hover:bg-sky-600 transition-colors">
                Browse groups <ArrowRight className="size-4" />
              </Link>
            </div>
          ) : (
            <>
              {/* Groups grid — varied sizes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {myGroups.slice(0, 4).map((group: any, i: number) => (
                  <Link key={group.id} href={`/community/${group.id}`}
                    className={`group rounded-2xl bg-white dark:bg-background border border-sky-100 overflow-hidden hover:shadow-lg hover:shadow-sky-100/50 transition-all hover:-translate-y-1 ${i === 0 ? "col-span-2 sm:col-span-2" : ""}`}>
                    <div className={`${i === 0 ? "h-40 sm:h-52" : "h-32"} bg-sky-100 overflow-hidden`}>
                      {group.image
                        ? <img src={group.image} alt={group.name} className="size-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        : <div className="size-full flex items-center justify-center text-4xl">👥</div>
                      }
                    </div>
                    <div className="p-4">
                      <p className={`font-black line-clamp-1 ${i === 0 ? "text-base" : "text-sm"}`}>{group.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground capitalize">{group.category || "Group"}</p>
                        <p className="text-xs text-sky-600 font-semibold flex items-center gap-1"><Users className="size-3" />{group.member_count || 0}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Remaining groups as compact row */}
              {myGroups.length > 4 && (
                <div className="flex gap-3 mt-4 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                  {myGroups.slice(4).map((group: any) => (
                    <Link key={group.id} href={`/community/${group.id}`}
                      className="flex items-center gap-3 rounded-2xl bg-white dark:bg-background border border-sky-100 px-4 py-3 hover:border-sky-300 transition-colors shrink-0 group">
                      <div className="size-9 rounded-xl bg-sky-100 overflow-hidden shrink-0">
                        {group.image ? <img src={group.image} alt={group.name} className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-sm">👥</div>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground">{group.member_count || 0} members</p>
                      </div>
                      <MessageCircle className="size-4 text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── PEOPLE & ACTIVITY — two column on desktop ── */}
      {(friendActivity.length > 0 || suggestedPeople.length > 0) && (
        <div className="w-full px-6 py-12 border-t">
          <div className="mx-auto max-w-5xl grid sm:grid-cols-2 gap-10">

            {/* Friend activity */}
            {friendActivity.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Friend activity</p>
                <div className="space-y-3">
                  {friendActivity.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Link href={`/profile/${item.userId}`} className="shrink-0 mt-0.5">
                        <div className="size-8 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                          {item.profile?.avatar_url ? <img src={item.profile.avatar_url} alt="" className="size-full object-cover" /> : <User className="size-4 text-muted-foreground" />}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <Link href={`/profile/${item.userId}`} className="font-semibold hover:underline">{item.profile?.full_name || "Someone"}</Link>
                          <span className="text-muted-foreground">
                            {item.type === "log" ? ` logged a ${item.data.activity_type}${item.data.distance ? ` · ${item.data.distance}km` : ""}` : item.data.events ? ` joined ${item.data.events.title}` : ""}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(item.timestamp), "MMM d · HH:mm")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested people */}
            {suggestedPeople.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">People you may know</p>
                <div className="space-y-3">
                  {suggestedPeople.map(person => (
                    <Link key={person.id} href={`/profile/${person.id}`}
                      className="flex items-center gap-3 rounded-xl hover:bg-muted px-3 py-2 -mx-3 transition-colors group">
                      <div className="size-9 rounded-full bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                        {person.avatar_url ? <img src={person.avatar_url} alt="" className="size-full object-cover" /> : <User className="size-4 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{person.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{person.location || "No location set"}</p>
                      </div>
                      <span className="text-xs text-muted-foreground group-hover:text-foreground border rounded-full px-2.5 py-1 transition-colors opacity-0 group-hover:opacity-100">Follow</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── COMPETE FOOTER — minimal, optional ── */}
      <div className="w-full px-6 py-6 border-t bg-muted/20">
        <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            {rank && <span>Global rank <strong className="text-foreground font-black">#{rank}</strong></span>}
            {maxStreak > 0 && <span><strong className="text-foreground font-black">{maxStreak}wk</strong> streak 🔥</span>}
            {totalPoints > 0 && <span><strong className="text-foreground font-black">{totalPoints.toLocaleString()}</strong> pts</span>}
          </div>
          <Link href="/compete" className="text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            View compete section <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>

    </div>
  )
}

// Reusable large event card
function EventCardLarge({ event, colorIdx }: { event: any; colorIdx: number }) {
  return (
    <Link href={`/events/${event.id}`}
      className="group relative rounded-3xl overflow-hidden bg-stone-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block"
      style={{ minHeight: 280 }}>
      {event.image
        ? <img src={event.image} alt={event.title} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-700" />
        : <div className="absolute inset-0 flex items-center justify-center text-6xl bg-gradient-to-br from-rose-100 to-orange-100">🎯</div>
      }
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
        <h3 className="text-xl font-black mb-1">{event.title}</h3>
        <div className="flex items-center gap-3 text-white/75 text-xs">
          <span className="flex items-center gap-1"><MapPin className="size-3" />{event.location}</span>
          <span>{formatEventDate(event.date)}</span>
        </div>
      </div>
    </Link>
  )
}