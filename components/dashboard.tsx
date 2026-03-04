"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel, BADGES } from "@/lib/points"
import { format, isToday, isTomorrow } from "date-fns"
import { MapPin, Users, Calendar, User, ArrowRight, MessageCircle, Zap, ChevronRight, Activity, Sparkles } from "lucide-react"

interface Props { userId: string; userEmail: string }

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  return format(d, "EEE d MMM")
}

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
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8)
      }

      let suggestedPeople: any[] = []
      if (followingIds.length < 15) {
        const { data: suggestions } = await supabase.from("profiles").select("id, full_name, avatar_url, location").eq("is_public", true).neq("id", userId).limit(20)
        suggestedPeople = (suggestions || []).filter(p => !followingIds.includes(p.id)).slice(0, 5)
      }

      setData({
        profile, totalPoints, maxStreak,
        level: getLevel(totalPoints),
        upcomingEvents, recommendedEvents,
        myGroups: groupsRes.data?.map(m => m.groups).filter(Boolean) || [],
        friendActivity, suggestedPeople,
      })
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="size-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
    </div>
  )

  const { profile, totalPoints, maxStreak, level, upcomingEvents, recommendedEvents, myGroups, friendActivity, suggestedPeople } = data
  const firstName = profile?.full_name?.split(" ")[0] || "there"
  
  return (
    <div className="w-full min-h-screen bg-stone-50/50 dark:bg-background pb-20">
      
      {/* ── HERO ── */}
      <div className="w-full bg-white dark:bg-zinc-950 border-b px-6 pt-10 pb-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Good to see you, {firstName} 👋</h1>
            <p className="text-muted-foreground mt-1 text-base">Here's what's happening in your community today.</p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/events" className="flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity">
              <Calendar className="size-4" /> Find Events
            </Link>
          </div>
        </div>
      </div>

      {/* ── MAIN DASHBOARD LAYOUT ── */}
      <div className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT COLUMN: Discovery & Groups (Span 8) */}
        <div className="lg:col-span-8 space-y-12">
          
          {/* Upcoming Events Pill Strip */}
          {upcomingEvents.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Your Schedule</h3>
              <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
                {upcomingEvents.map((reg) => (
                  <Link key={reg.id} href={`/events/${reg.event.id}`}
                    className={`flex items-center gap-3 rounded-full px-5 py-2.5 text-sm font-medium shrink-0 border hover:shadow-md transition-all bg-white dark:bg-zinc-900 ${isToday(new Date(reg.event.date)) ? "border-green-300 text-green-700 dark:text-green-400" : "border-border"}`}>
                    <span className={`size-2.5 rounded-full shrink-0 ${isToday(new Date(reg.event.date)) ? "bg-green-500 animate-pulse" : "bg-foreground/20"}`} />
                    <span className="truncate max-w-[160px]">{reg.event.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0 border-l pl-3 ml-1">{formatEventDate(reg.event.date)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Events (Asymmetric Grid kept from original, slightly restyled) */}
          {recommendedEvents.length > 0 && (
            <section>
              <div className="flex items-end justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tight">Events you might love</h2>
                <Link href="/events" className="text-sm font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors">
                  See all <ArrowRight className="size-4" />
                </Link>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hero Event */}
                {recommendedEvents[0] && (
                  <Link href={`/events/${recommendedEvents[0].id}`} className="md:col-span-2 group relative rounded-3xl overflow-hidden bg-stone-200 hover:shadow-xl transition-all duration-300 min-h-[300px] block">
                    {recommendedEvents[0].image ? <img src={recommendedEvents[0].image} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" /> : <div className="absolute inset-0 flex items-center justify-center text-7xl bg-gradient-to-br from-orange-100 to-rose-100">🎯</div>}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <span className="inline-block rounded-full bg-white/20 backdrop-blur-md px-3 py-1 text-xs font-semibold mb-3">{formatEventDate(recommendedEvents[0].date)}</span>
                      <h3 className="text-2xl font-black leading-tight mb-2">{recommendedEvents[0].title}</h3>
                      <p className="flex items-center gap-1 text-white/80 text-sm"><MapPin className="size-4" /> {recommendedEvents[0].location}</p>
                    </div>
                  </Link>
                )}
                {/* Side Stack */}
                <div className="flex flex-col gap-4">
                  {recommendedEvents.slice(1, 3).map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`} className="group flex-1 relative rounded-3xl overflow-hidden bg-stone-200 hover:shadow-lg transition-all min-h-[142px] block">
                       {event.image ? <img src={event.image} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" /> : <div className="absolute inset-0 bg-gradient-to-br from-sky-100 to-indigo-100"></div>}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                       <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                         <h4 className="text-sm font-bold line-clamp-1 mb-1">{event.title}</h4>
                         <p className="text-xs text-white/70">{formatEventDate(event.date)}</p>
                       </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Groups */}
          <section>
             <div className="flex items-end justify-between mb-6">
                <h2 className="text-2xl font-black tracking-tight">Your Groups</h2>
                <Link href="/community" className="text-sm font-medium text-sky-600 hover:text-sky-700 flex items-center gap-1 transition-colors">
                  Explore <ArrowRight className="size-4" />
                </Link>
              </div>
              
              {myGroups.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center">
                  <p className="text-lg font-bold mb-2">You haven't joined any groups yet</p>
                  <p className="text-muted-foreground text-sm mb-4">Find communities that share your interests.</p>
                  <Link href="/community" className="inline-flex items-center gap-2 rounded-full bg-white border px-5 py-2 text-sm font-semibold hover:bg-stone-50">
                    Browse Groups
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myGroups.map((group: any) => (
                    <Link key={group.id} href={`/community/${group.id}`} className="flex items-center gap-4 rounded-2xl bg-white dark:bg-zinc-900 border p-3 hover:shadow-md transition-all group">
                       <div className="size-16 rounded-xl bg-sky-100 shrink-0 overflow-hidden">
                         {group.image ? <img src={group.image} alt="" className="size-full object-cover" /> : <div className="size-full flex items-center justify-center text-xl">👥</div>}
                       </div>
                       <div className="flex-1 min-w-0">
                         <h4 className="font-bold text-base truncate">{group.name}</h4>
                         <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5"><Users className="size-3" /> {group.member_count || 0} members</p>
                       </div>
                       <div className="size-8 rounded-full bg-stone-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-sky-100 group-hover:text-sky-600 transition-colors shrink-0 mr-2">
                         <ChevronRight className="size-4" />
                       </div>
                    </Link>
                  ))}
                </div>
              )}
          </section>

        </div>

        {/* RIGHT COLUMN: Community Pulse & Subtle Stats (Span 4) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Subtle Profile/Stats Card */}
          <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-sky-950/30 dark:to-indigo-950/30 border border-sky-100 dark:border-sky-900 p-5 flex items-center gap-4">
            <div className="size-12 rounded-full bg-white dark:bg-zinc-800 shadow-sm overflow-hidden flex items-center justify-center shrink-0 border border-white">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : <User className="size-5 text-muted-foreground" />}
            </div>
            <div className="flex-1">
              <p className="font-bold">{profile?.full_name || "Adventurer"}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium"><Sparkles className="size-3" /> Level {level?.level || 1}</span>
                <span>•</span>
                <span>{totalPoints.toLocaleString()} pts</span>
                {maxStreak > 2 && (
                  <>
                    <span>•</span>
                    <span className="text-orange-500 font-medium">{maxStreak}w 🔥</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Friend Activity Feed */}
          <div className="rounded-3xl bg-white dark:bg-zinc-900 border p-6">
            <div className="flex items-center gap-2 mb-6">
              <Activity className="size-5 text-sky-500" />
              <h3 className="font-black text-lg">Community Pulse</h3>
            </div>
            
            {friendActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">It's quiet here. Follow more people to see what they're up to!</p>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-stone-200 dark:before:via-zinc-800 before:to-transparent">
                {friendActivity.map((item, i) => (
                  <div key={i} className="relative flex items-start gap-4 group">
                    <Link href={`/profile/${item.userId}`} className="relative z-10 shrink-0 mt-1">
                      <div className="size-10 rounded-full bg-white dark:bg-zinc-900 border-2 border-white dark:border-zinc-900 shadow-sm overflow-hidden flex items-center justify-center ring-2 ring-stone-100 dark:ring-zinc-800 group-hover:ring-sky-200 transition-all">
                        {item.profile?.avatar_url ? <img src={item.profile.avatar_url} alt="" className="size-full object-cover" /> : <User className="size-4 text-muted-foreground" />}
                      </div>
                    </Link>
                    <div className="flex-1 min-w-0 pt-1">
                      <p className="text-sm leading-snug">
                        <Link href={`/profile/${item.userId}`} className="font-bold hover:text-sky-600 transition-colors">{item.profile?.full_name || "Someone"}</Link>
                        <span className="text-muted-foreground ml-1">
                          {item.type === "log" ? `logged a ${item.data.activity_type.toLowerCase()}${item.data.distance ? ` · ${item.data.distance}km` : ""}` : item.data.events ? `registered for ${item.data.events.title}` : ""}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{format(new Date(item.timestamp), "MMM d · h:mm a")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Suggested People */}
          {suggestedPeople.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4 px-1">Suggested Connections</h3>
              <div className="space-y-2">
                {suggestedPeople.map(person => (
                  <Link key={person.id} href={`/profile/${person.id}`} className="flex items-center gap-3 rounded-2xl hover:bg-white dark:hover:bg-zinc-900 px-3 py-2.5 transition-colors group">
                    <div className="size-10 rounded-full bg-stone-200 dark:bg-zinc-800 overflow-hidden shrink-0 flex items-center justify-center">
                      {person.avatar_url ? <img src={person.avatar_url} alt="" className="size-full object-cover" /> : <User className="size-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-sky-600 transition-colors">{person.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{person.location || "Active nearby"}</p>
                    </div>
                    <div className="size-8 rounded-full border border-stone-200 dark:border-zinc-700 flex items-center justify-center text-muted-foreground group-hover:bg-foreground group-hover:text-background group-hover:border-foreground transition-all shrink-0">
                      <User className="size-3.5" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}