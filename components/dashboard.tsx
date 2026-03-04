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
      
      // 1. Get Upcoming Events
      let upcomingEvents: any[] = []
      const registeredIds = regsRes.data?.map(r => r.event_id) || []
      
      if (registeredIds.length > 0) {
        const { data: eventData } = await supabase.from("events").select("*").in("id", registeredIds)
        upcomingEvents = (regsRes.data || [])
          .map(r => ({ ...r, event: eventData?.find(e => e.id === r.event_id) }))
          .filter(r => r.event && r.event.date >= today)
          .sort((a, b) => a.event.date.localeCompare(b.event.date))
      }

      // 2. Get Recommended Events
      const favCats = profile?.favourite_categories?.split(",").filter(Boolean) || []
      const userLocation = profile?.location || ""
      let recommendedEvents: any[] = []

      let recQuery = supabase.from("events").select("*").gte("date", today)
      
      if (favCats.length > 0) recQuery = recQuery.in("category_id", favCats)
      if (userLocation) recQuery = recQuery.ilike("location", `%${userLocation}%`)
      
      const { data: recData } = await recQuery.limit(12)
      
      recommendedEvents = (recData || []).filter(e => !registeredIds.includes(e.id)).slice(0, 5)

      if (recommendedEvents.length === 0) {
         const { data: fallbackEvents } = await supabase.from("events").select("*").gte("date", today).limit(10)
         recommendedEvents = (fallbackEvents || []).filter(e => !registeredIds.includes(e.id)).slice(0, 5)
      }

      const stats = statsRes.data || []
      const totalPoints = stats.reduce((s: number, r: any) => s + (r.total_points || 0), 0)
      const maxStreak = Math.max(...stats.map((r: any) => r.streak_weeks || 0), 0)

      // 3. Get Friend Activity
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh] bg-slate-50/50">
      <div className="size-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
    </div>
  )

  const { profile, totalPoints, maxStreak, level, upcomingEvents, recommendedEvents, myGroups, friendActivity } = data
  const firstName = profile?.full_name?.split(" ")[0] || "Athlete"
  
  return (
    <div className="w-full min-h-screen bg-slate-50/50 pb-32 font-sans">
      
      {/* ── BOLD HERO SECTION (Greeny-Bluey Gradient) ── */}
      <div className="relative w-full bg-gradient-to-br from-cyan-800 via-teal-600 to-emerald-500 text-white pt-24 pb-48 px-8 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[120%] rounded-full bg-gradient-to-l from-white to-transparent blur-3xl rotate-12" />
          <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[100%] rounded-full bg-gradient-to-t from-emerald-400 to-transparent blur-3xl -rotate-12" />
        </div>

        <div className="mx-auto max-w-7xl relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div>
            <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4">Let's go, {firstName}.</h1>
            <p className="text-teal-50 text-xl max-w-lg leading-relaxed">Find your next challenge, connect with your crew, and track your progress.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/events" className="flex items-center gap-2 rounded-full bg-white text-teal-900 px-8 py-4 text-base font-black hover:scale-105 hover:shadow-xl transition-all duration-300">
              <Calendar className="size-5" /> Find Events
            </Link>
            <Link href="/log" className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/30 px-8 py-4 text-base font-bold hover:bg-white/30 transition-all duration-300">
              <Plus className="size-5" /> Log Activity
            </Link>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="mx-auto max-w-7xl px-6 sm:px-8 -mt-24 relative z-20">
        
        {/* Floating Profile/Stats Bar */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-xl shadow-teal-900/5 flex flex-wrap items-center justify-between gap-6 border border-white/50 backdrop-blur-xl mb-12 lg:mb-16">
           <div className="flex items-center gap-5">
             <div className="size-16 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 p-1 shadow-md">
               <div className="size-full rounded-full bg-white overflow-hidden flex items-center justify-center">
                 {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="size-full object-cover" /> : <User className="size-7 text-teal-300" />}
               </div>
             </div>
             <div>
               <h2 className="font-bold text-slate-800 text-xl">{profile?.full_name || "Adventurer"}</h2>
               <p className="text-base font-medium text-slate-500 mt-1">{profile?.location || "Active locally"}</p>
             </div>
           </div>

           <div className="flex items-center gap-8 sm:gap-12 text-sm">
             <div className="flex flex-col items-center sm:items-start">
               <span className="text-slate-400 font-medium text-xs uppercase tracking-widest mb-1">Level</span>
               <span className="font-black text-teal-600 text-2xl">{level?.level || 1}</span>
             </div>
             <div className="h-10 w-px bg-slate-200" />
             <div className="flex flex-col items-center sm:items-start">
               <span className="text-slate-400 font-medium text-xs uppercase tracking-widest mb-1">Points</span>
               <span className="font-black text-slate-800 text-2xl">{totalPoints.toLocaleString()}</span>
             </div>
             {maxStreak > 0 && (
               <>
                 <div className="h-10 w-px bg-slate-200 hidden sm:block" />
                 <div className="flex flex-col items-center sm:items-start hidden sm:flex">
                   <span className="text-slate-400 font-medium text-xs uppercase tracking-widest mb-1">Streak</span>
                   <span className="font-black text-orange-500 text-2xl flex items-center gap-1.5">{maxStreak}w <Flame className="size-5" fill="currentColor"/></span>
                 </div>
               </>
             )}
           </div>
        </div>

        {/* ── TWO COLUMN BENTO GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* LEFT/CENTER: Events & Groups */}
          <div className="lg:col-span-8 space-y-16 lg:space-y-20">
            
            {/* UPCOMING EVENTS (Your Schedule) */}
            {upcomingEvents.length > 0 && (
              <section>
                <div className="flex items-end justify-between mb-6 px-2">
                  <h3 className="text-3xl font-black text-slate-800 tracking-tight">Your Schedule</h3>
                  <Link href="/profile?tab=schedule" className="text-base font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1.5 transition-colors mb-1">
                    Manage <ArrowRight className="size-4" />
                  </Link>
                </div>
                <div className="flex gap-6 overflow-x-auto pb-6 pt-2 px-2 -mx-2" style={{ scrollbarWidth: "none" }}>
                  {upcomingEvents.map((reg) => (
                    <Link key={reg.id} href={`/events/${reg.event.id}`} className="flex flex-col justify-between bg-white rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 min-w-[280px] sm:min-w-[320px] shrink-0 group">
                      <div className="flex items-start justify-between mb-6">
                        <span className={`text-sm font-black uppercase tracking-wider px-3 py-1.5 rounded-lg ${isToday(new Date(reg.event.date)) ? 'bg-lime-100 text-lime-800' : 'bg-teal-50 text-teal-700'}`}>
                          {formatEventDate(reg.event.date)}
                        </span>
                        <CheckCircle2 className="size-6 text-emerald-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg line-clamp-2 leading-tight">{reg.event.title}</h4>
                        <p className="text-base text-slate-500 flex items-center gap-1.5 mt-2"><MapPin className="size-4" /> {reg.event.location}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* RECOMMENDED EVENTS */}
            <section>
              <div className="flex items-end justify-between mb-8 px-2">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Recommended events</h3>
                <Link href="/events" className="text-base font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1.5 transition-colors mb-1">
                  View All <ArrowRight className="size-4" />
                </Link>
              </div>

              {recommendedEvents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
                  {/* Hero Event Card */}
                  {recommendedEvents[0] && (
                    <Link href={`/events/${recommendedEvents[0].id}`} className="sm:col-span-2 group relative rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 min-h-[340px] flex items-end">
                      {recommendedEvents[0].image 
                        ? <img src={recommendedEvents[0].image} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" /> 
                        : <div className="absolute inset-0 bg-gradient-to-br from-teal-500 to-emerald-500"></div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                      <div className="relative z-10 p-8 md:p-10 w-full">
                        <div className="flex items-center justify-between mb-4">
                          <span className="bg-lime-400 text-slate-900 px-4 py-1.5 rounded-full text-sm font-black uppercase tracking-widest">{formatEventDate(recommendedEvents[0].date)}</span>
                          {recommendedEvents[0].category_id && <span className="bg-white/20 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-bold">{recommendedEvents[0].category_id}</span>}
                        </div>
                        <h4 className="text-4xl font-black text-white leading-tight mb-3">{recommendedEvents[0].title}</h4>
                        <p className="flex items-center gap-2 text-slate-200 text-base font-medium"><MapPin className="size-5" /> {recommendedEvents[0].location}</p>
                      </div>
                    </Link>
                  )}
                  {/* Smaller Cards */}
                  {recommendedEvents.slice(1, 3).map((event) => (
                    <Link key={event.id} href={`/events/${event.id}`} className="group relative rounded-[2rem] overflow-hidden shadow-md hover:shadow-xl transition-all duration-500 min-h-[220px] flex items-end">
                      {event.image 
                        ? <img src={event.image} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500" alt="" /> 
                        : <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 to-teal-500"></div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent" />
                      <div className="relative z-10 p-6 sm:p-8 w-full">
                        <span className="text-cyan-300 text-sm font-black uppercase tracking-widest block mb-2">{formatEventDate(event.date)}</span>
                        <h4 className="text-xl font-bold text-white leading-snug line-clamp-2">{event.title}</h4>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-[2rem] p-12 text-center shadow-sm">
                  <p className="text-slate-500 font-medium text-lg">No new recommendations right now. Try updating your location and interests!</p>
                </div>
              )}
            </section>

            {/* YOUR COMMUNITY */}
            <section>
               <div className="flex items-end justify-between mb-8 px-2">
                <h3 className="text-3xl font-black text-slate-800 tracking-tight">Your community</h3>
                <Link href="/community" className="text-base font-bold text-teal-600 hover:text-teal-800 flex items-center gap-1.5 transition-colors mb-1">
                  Explore <ArrowRight className="size-4" />
                </Link>
              </div>

              {myGroups.length === 0 ? (
                <div className="rounded-[2rem] bg-teal-50/50 border-2 border-dashed border-teal-200 p-12 text-center">
                  <p className="text-xl font-black text-teal-900 mb-2">Go solo or find a crew?</p>
                  <p className="text-teal-700/70 text-base mb-6">Join communities that share your passion.</p>
                  <Link href="/community" className="inline-flex items-center gap-2 rounded-full bg-teal-600 text-white px-8 py-3 text-base font-bold hover:bg-teal-700 shadow-md hover:shadow-lg transition-all">
                    Browse communities
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {myGroups.map((group: any) => (
                    <Link key={group.id} href={`/community/${group.id}`} className="group flex items-center gap-5 bg-white rounded-3xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-transparent hover:border-teal-100">
                      <div className="size-20 rounded-2xl overflow-hidden shrink-0 bg-gradient-to-br from-teal-100 to-emerald-100">
                        {group.image ? <img src={group.image} alt="" className="size-full object-cover group-hover:scale-110 transition-transform duration-500" /> : <div className="size-full flex items-center justify-center text-3xl">⚡️</div>}
                      </div>
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-black text-slate-800 text-lg truncate group-hover:text-teal-600 transition-colors">{group.name}</h4>
                        <p className="text-base text-slate-500 font-medium flex items-center gap-1.5 mt-1"><Users className="size-4" /> {group.member_count || 0} members</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* RIGHT SIDEBAR: The Pulse */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 sticky top-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="size-10 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center">
                  <Activity className="size-5" />
                </div>
                <h3 className="font-black text-2xl text-slate-800">The Pulse</h3>
              </div>

              {friendActivity.length === 0 ? (
                <div className="text-center py-12">
                  <div className="size-20 rounded-full bg-slate-50 mx-auto flex items-center justify-center mb-4">
                    <User className="size-8 text-slate-300" />
                  </div>
                  <p className="text-base font-medium text-slate-500 leading-relaxed">It's quiet here. Follow athletes to see their activity!</p>
                </div>
              ) : (
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[1.35rem] before:-translate-x-px before:h-full before:w-[2px] before:bg-gradient-to-b before:from-teal-100 before:to-transparent">
                  {friendActivity.map((item, i) => (
                    <div key={i} className="relative flex items-start gap-5 group">
                      <Link href={`/profile/${item.userId}`} className="relative z-10 shrink-0 mt-1">
                        <div className="size-11 rounded-full bg-white border-4 border-white shadow-sm overflow-hidden flex items-center justify-center ring-1 ring-slate-100 group-hover:ring-teal-300 transition-all">
                          {item.profile?.avatar_url ? <img src={item.profile.avatar_url} alt="" className="size-full object-cover" /> : <User className="size-5 text-slate-400" />}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0 pt-1.5">
                        <p className="text-base text-slate-700 leading-relaxed">
                          <Link href={`/profile/${item.userId}`} className="font-bold text-slate-900 hover:text-teal-600 transition-colors">{item.profile?.full_name || "Someone"}</Link>
                          <span className="ml-1.5 font-medium text-slate-500">
                            {item.type === "log" ? `crushed a ${item.data.activity_type.toLowerCase()} workout${item.data.distance ? ` (${item.data.distance}km)` : ""}` : item.data.events ? `is going to ${item.data.events.title}` : ""}
                          </span>
                        </p>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-2">{format(new Date(item.timestamp), "MMM d · h:mm a")}</p>
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