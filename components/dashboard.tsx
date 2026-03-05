"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel } from "@/lib/points"
import { format, isToday, isTomorrow } from "date-fns"
import { MapPin, Users, Calendar, User, ArrowRight, Activity, Flame, Plus, CheckCircle2 } from "lucide-react"

interface Props { userId: string; userEmail: string }

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  return format(d, "EEE, MMM do")
}

// ── SLEEKER SKELETON LOADER ──
function DashboardSkeleton() {
  return (
    <div className="w-full min-h-screen bg-slate-50/50 pb-32 font-sans animate-pulse">
      <div className="relative w-full bg-slate-200 pt-16 pb-32 px-6">
        <div className="mx-auto max-w-6xl relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="h-10 w-48 md:w-72 bg-slate-300 rounded-2xl mb-3" />
            <div className="h-5 w-64 bg-slate-300/80 rounded-full" />
          </div>
          <div className="flex gap-3">
            <div className="h-11 w-32 bg-slate-300 rounded-full" />
            <div className="h-11 w-36 bg-slate-300 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 -mt-16 relative z-20">
        <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm flex flex-wrap items-center justify-between gap-6 border border-slate-100 mb-10">
          <div className="flex items-center gap-4">
            <div className="size-14 rounded-full bg-slate-200 shrink-0" />
            <div className="space-y-2">
              <div className="h-5 w-28 bg-slate-200 rounded-md" />
              <div className="h-3 w-20 bg-slate-100 rounded-md" />
            </div>
          </div>
          <div className="flex items-center gap-6 sm:gap-10">
            <div className="space-y-2"><div className="h-3 w-8 bg-slate-100 rounded" /><div className="h-6 w-10 bg-slate-200 rounded-md" /></div>
            <div className="h-8 w-px bg-slate-100" />
            <div className="space-y-2"><div className="h-3 w-8 bg-slate-100 rounded" /><div className="h-6 w-16 bg-slate-200 rounded-md" /></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          <div className="lg:col-span-8 space-y-12">
            <div>
              <div className="flex justify-between mb-4 px-1"><div className="h-6 w-40 bg-slate-200 rounded-lg" /><div className="h-4 w-16 bg-slate-100 rounded-md" /></div>
              <div className="flex gap-4 overflow-hidden pb-4 px-1 -mx-1">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100 min-w-[260px] h-32 flex flex-col justify-between shrink-0">
                    <div className="h-6 w-20 bg-slate-100 rounded-md" />
                    <div className="space-y-2"><div className="h-4 w-3/4 bg-slate-200 rounded-sm" /><div className="h-3 w-1/2 bg-slate-100 rounded-sm" /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="lg:col-span-4">
            <div className="bg-white rounded-3xl border border-slate-100 p-6">
              <div className="h-6 w-28 bg-slate-200 rounded-lg mb-6" />
              <div className="space-y-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex gap-4">
                    <div className="size-10 rounded-full bg-slate-200 shrink-0" />
                    <div className="space-y-2 flex-1"><div className="h-3 w-full bg-slate-100 rounded-sm" /><div className="h-3 w-2/3 bg-slate-100 rounded-sm" /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Dashboard({ userId, userEmail }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [profileRes, statsRes, regsRes, groupsRes, followsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_stats").select("*").eq("user_id", userId),
        supabase.from("registrations").select("*").eq("user_id", userId),
        supabase.from("group_members").select("group_id, groups(*)").eq("user_id", userId).limit(6),
        supabase.from("follows").select("following_id").eq("follower_id", userId),
      ])

      const today = new Date().toISOString().split("T")[0]
      const profile = profileRes.data
      
      let upcomingEvents: any[] = []
      const registeredIds = regsRes.data?.map(r => r.event_id) || []
      
      if (registeredIds.length > 0) {
        const { data: eventData } = await supabase.from("events").select("*").in("id", registeredIds)
        upcomingEvents = (regsRes.data || [])
          .map(r => ({ ...r, event: eventData?.find(e => e.id === r.event_id) }))
          .filter(r => r.event && r.event.date >= today)
          .sort((a, b) => a.event.date.localeCompare(b.event.date))
      }

      const favCats = profile?.favourite_categories?.split(",").filter(Boolean) || []
      const userLocation = profile?.location || ""
      let recommendedEvents: any[] = []

      let recQuery = supabase.from("events").select("*").gte("date", today)
      if (favCats.length > 0) recQuery = recQuery.in("category_id", favCats)
      if (userLocation) recQuery = recQuery.ilike("location", `%${userLocation}%`)
      
      const { data: recData } = await recQuery.limit(12)
      recommendedEvents = (recData || []).filter(e => !registeredIds.includes(e.id)).slice(0, 4) // Dropped to 4 for cleaner grid

      if (recommendedEvents.length === 0) {
         const { data: fallbackEvents } = await supabase.from("events").select("*").gte("date", today).limit(10)
         recommendedEvents = (fallbackEvents || []).filter(e => !registeredIds.includes(e.id)).slice(0, 4)
      }

      const stats = statsRes.data || []
      const totalPoints = stats.reduce((s: number, r: any) => s + (r.total_points || 0), 0)
      const maxStreak = Math.max(...stats.map((r: any) => r.streak_weeks || 0), 0)

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
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 6) // Slightly fewer items for cleaner sidebar
      }

      setData({
        profile, totalPoints, maxStreak,
        level: getLevel(totalPoints),
        upcomingEvents, recommendedEvents,
        myGroups: groupsRes.data?.map(m => m.groups).filter(Boolean) || [],
        friendActivity,
      })
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return <DashboardSkeleton />

  const { profile, totalPoints, maxStreak, level, upcomingEvents, recommendedEvents, myGroups, friendActivity } = data
  const firstName = profile?.full_name?.split(" ")[0] || "Athlete"
  
  return (
    <div className="w-full min-h-screen bg-slate-50/50 pb-24 font-sans overflow-x-hidden">
      
      {/* ── SLEEKER HERO SECTION ── */}
      <div className="relative w-full bg-gradient-to-br from-cyan-900 via-teal-700 to-emerald-600 text-white pt-16 pb-32 px-6 overflow-hidden animate-in fade-in duration-700">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[120%] rounded-full bg-gradient-to-l from-white to-transparent blur-3xl rotate-12" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[100%] rounded-full bg-gradient-to-t from-emerald-400 to-transparent blur-3xl -rotate-12" />
        </div>

        {/* Max width set to 6xl instead of 7xl to bring things in slightly */}
        <div className="mx-auto max-w-6xl relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="animate-in slide-in-from-bottom-4 duration-700 delay-100 fill-mode-both">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Let's go, {firstName}.</h1>
            <p className="text-teal-50/90 text-lg max-w-md leading-relaxed">Find your next challenge, connect with your crew, and track progress.</p>
          </div>
          <div className="flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-700 delay-200 fill-mode-both">
            <Link href="/events" className="flex items-center gap-2 rounded-full bg-white text-teal-900 px-6 py-3 text-sm font-bold hover:scale-105 hover:shadow-lg transition-all duration-300">
              <Calendar className="size-4" /> Find Events
            </Link>
            <Link href="/compete/log" className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 px-6 py-3 text-sm font-bold hover:bg-white/20 transition-all duration-300">
              <Plus className="size-4" /> Log Activity
            </Link>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 -mt-16 relative z-20">
        
        {/* Floating Profile/Stats Bar */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-5 sm:p-6 shadow-lg shadow-teal-900/5 flex flex-wrap items-center justify-between gap-6 border border-slate-100 mb-10 animate-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both">
           <div className="flex items-center gap-4">
             <div className="size-14 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 p-0.5 shadow-sm">
               <div className="size-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                 {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : <User className="size-6 text-teal-300" />}
               </div>
             </div>
             <div>
               <h2 className="font-bold text-slate-800 text-lg">{profile?.full_name || "Adventurer"}</h2>
               <p className="text-sm font-medium text-slate-500">{profile?.location || "Active locally"}</p>
             </div>
           </div>

           <div className="flex items-center gap-6 sm:gap-10 text-sm">
             <div className="flex flex-col items-center sm:items-start">
               <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-0.5">Level</span>
               <span className="font-black text-teal-600 text-xl">{level?.level || 1}</span>
             </div>
             <div className="h-8 w-px bg-slate-200" />
             <div className="flex flex-col items-center sm:items-start">
               <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-0.5">Points</span>
               <span className="font-black text-slate-800 text-xl">{totalPoints.toLocaleString()}</span>
             </div>
             {maxStreak > 0 && (
               <>
                 <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                 <div className="flex flex-col items-center sm:items-start hidden sm:flex">
                   <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-0.5">Streak</span>
                   <span className="font-black text-orange-500 text-xl flex items-center gap-1">{maxStreak}w <Flame className="size-4" fill="currentColor"/></span>
                 </div>
               </>
             )}
           </div>
        </div>

        {/* ── TWO COLUMN BENTO GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
          
          {/* LEFT/CENTER: Events & Groups */}
          <div className="lg:col-span-8 space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-[400ms] fill-mode-both">
            
            {/* UPCOMING EVENTS (Your Schedule) */}
            {upcomingEvents.length > 0 && (
              <section>
                <div className="flex items-end justify-between mb-4 px-1">
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">Your Schedule</h3>
                  <Link href="/profile?tab=schedule" className="text-sm font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 transition-colors mb-1">
                    Manage <ArrowRight className="size-3.5" />
                  </Link>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 -mx-1" style={{ scrollbarWidth: "none" }}>
                  {upcomingEvents.map((reg) => (
                    <Link key={reg.id} href={`/events/${reg.event.id}`} className="flex flex-col justify-between bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-slate-100 min-w-[260px] sm:min-w-[300px] shrink-0 group">
                      <div className="flex items-start justify-between mb-4">
                        <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${isToday(new Date(reg.event.date)) ? 'bg-lime-100 text-lime-800' : 'bg-teal-50 text-teal-700'}`}>
                          {formatEventDate(reg.event.date)}
                        </span>
                        <CheckCircle2 className="size-5 text-emerald-500 opacity-40 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-base line-clamp-2 leading-snug">{reg.event.title}</h4>
                        <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-1.5"><MapPin className="size-3.5" /> {reg.event.location}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* RECOMMENDED EVENTS */}
            <section>
              <div className="flex items-end justify-between mb-5 px-1">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Recommended events</h3>
                <Link href="/events" className="text-sm font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 transition-colors mb-1">
                  View All <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {recommendedEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
                  {/* Hero Event Card */}
                  {recommendedEvents[0] && (
                    <Link href={`/events/${recommendedEvents[0].id}`} className="sm:col-span-2 group relative rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-500 min-h-[280px] flex items-end">
                      {recommendedEvents[0].image 
                        ? <img src={recommendedEvents[0].image} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" /> 
                        : <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-500"></div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                      <div className="relative z-10 p-6 md:p-8 w-full">
                        <div className="flex items-center justify-between mb-3">
                          <span className="bg-lime-400 text-slate-900 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">{formatEventDate(recommendedEvents[0].date)}</span>
                          {recommendedEvents[0].category_id && <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold">{recommendedEvents[0].category_id}</span>}
                        </div>
                        <h4 className="text-2xl md:text-3xl font-black text-white leading-tight mb-2">{recommendedEvents[0].title}</h4>
                        <p className="flex items-center gap-1.5 text-slate-200 text-sm font-medium"><MapPin className="size-4" /> {recommendedEvents[0].location}</p>
                      </div>
                    </Link>
                  )}
                  {/* Smaller Cards */}
                  {recommendedEvents.slice(1, 3).map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`} className="group relative rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-500 min-h-[200px] flex items-end">
                      {event.image 
                        ? <img src={event.image} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" /> 
                        : <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-teal-500"></div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
                      <div className="relative z-10 p-5 w-full">
                        <span className="text-cyan-300 text-xs font-black uppercase tracking-widest block mb-1.5">{formatEventDate(event.date)}</span>
                        <h4 className="text-lg font-bold text-white leading-snug line-clamp-2">{event.title}</h4>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-3xl p-10 text-center shadow-sm border border-slate-100">
                  <p className="text-slate-500 font-medium text-sm">No new recommendations right now. Try updating your location and interests!</p>
                </div>
              )}
            </section>

            {/* YOUR COMMUNITY */}
            <section>
               <div className="flex items-end justify-between mb-5 px-1">
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Your community</h3>
                <Link href="/community" className="text-sm font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1 transition-colors mb-1">
                  Explore <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {myGroups.length === 0 ? (
                <div className="rounded-3xl bg-teal-50/50 border border-dashed border-teal-200 p-8 text-center">
                  <p className="text-lg font-black text-teal-900 mb-1">Go solo or find a crew?</p>
                  <p className="text-teal-700/70 text-sm mb-4">Join communities that share your passion.</p>
                  <Link href="/community" className="inline-flex items-center gap-2 rounded-full bg-teal-600 text-white px-6 py-2.5 text-sm font-bold hover:bg-teal-700 shadow-sm hover:shadow-md transition-all">
                    Browse communities
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myGroups.map((group: any) => (
                    <Link key={group.id} href={`/community/${group.id}`} className="group flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-teal-100">
                      <div className="size-16 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-teal-100 to-emerald-100">
                        {group.image ? <img src={group.image} alt="" className="size-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="size-full flex items-center justify-center text-2xl">⚡️</div>}
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <h4 className="font-bold text-slate-800 text-base truncate group-hover:text-teal-600 transition-colors">{group.name}</h4>
                        <p className="text-sm text-slate-500 font-medium flex items-center gap-1.5 mt-0.5"><Users className="size-3.5" /> {group.member_count || 0} members</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT SIDEBAR: The Pulse */}
          <div className="lg:col-span-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-[500ms] fill-mode-both">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 sm:p-8 sticky top-24">
              <div className="flex items-center gap-2.5 mb-6">
                <div className="size-8 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center">
                  <Activity className="size-4" />
                </div>
                <h3 className="font-black text-xl text-slate-800">The Pulse</h3>
              </div>

              {friendActivity.length === 0 ? (
                <div className="text-center py-8">
                  <div className="size-16 rounded-full bg-slate-50 mx-auto flex items-center justify-center mb-3">
                    <User className="size-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500 leading-relaxed">It's quiet here. Follow athletes to see their activity!</p>
                </div>
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[1.15rem] before:-translate-x-px before:h-full before:w-[2px] before:bg-gradient-to-b before:from-teal-100 before:to-transparent">
                  {friendActivity.map((item, i) => (
                    <div key={i} className="relative flex items-start gap-4 group">
                      <Link href={`/profile/${item.userId}`} className="relative z-10 shrink-0 mt-0.5">
                        <div className="size-9 rounded-full bg-white border-[3px] border-white shadow-sm overflow-hidden flex items-center justify-center ring-1 ring-slate-100 group-hover:ring-teal-300 transition-all">
                          {item.profile?.avatar_url ? <img src={item.profile.avatar_url} alt="" className="size-full object-cover" /> : <User className="size-4 text-slate-400" />}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm text-slate-700 leading-snug">
                          <Link href={`/profile/${item.userId}`} className="font-bold text-slate-900 hover:text-teal-600 transition-colors">{item.profile?.full_name || "Someone"}</Link>
                          <span className="ml-1 font-medium text-slate-500">
                            {item.type === "log" ? `crushed a ${item.data.activity_type.toLowerCase()} workout${item.data.distance ? ` (${item.data.distance}km)` : ""}` : item.data.events ? `is going to ${item.data.events.title}` : ""}
                          </span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{format(new Date(item.timestamp), "MMM d · h:mm a")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}