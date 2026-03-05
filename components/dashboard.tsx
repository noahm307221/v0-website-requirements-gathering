"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel } from "@/lib/points"
import { format, isToday, isTomorrow, formatDistanceToNow } from "date-fns"
import {
  MapPin, Calendar, User, ArrowRight, ArrowUpRight,
  Activity, Plus, CheckCircle2,
  MessageSquare, Heart, Share2, MoreHorizontal, Trophy,
  Zap, ChevronRight, Users, BarChart2, Flame
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// NAV STYLE GUIDE — paste these classes into your existing nav component
// Background: bg-white border-b border-stone-200
// Logo text: font-black text-2xl tracking-[-0.05em] — "balance" + teal dot
// Nav links: text-[11px] font-black uppercase tracking-[0.18em] text-stone-400 hover:text-slate-900
// Search: bg-stone-100 rounded-xl px-4 py-2 text-sm
// Profile pill: bg-slate-900 text-white rounded-xl pl-1 pr-4 py-1 font-black text-[11px] uppercase tracking-widest
// ─────────────────────────────────────────────────────────────────────────────

interface Props { userId: string; userEmail: string }

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  return format(d, "MMM do").toUpperCase()
}
function timeAgo(ts: string) {
  return formatDistanceToNow(new Date(ts), { addSuffix: true })
}

// Fallback sport imagery from Unsplash (replace with your CDN in production)
const sportImages: Record<string, string> = {
  running:  "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=800&q=80",
  cycling:  "https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?w=800&q=80",
  padel:    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=80",
  swimming: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80",
  gym:      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80",
  football: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
  default:  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80",
}
const getSportImage = (type: string) => sportImages[type?.toLowerCase()] ?? sportImages.default

const activityMeta: Record<string, { emoji: string; label: string; accent: string; pill: string }> = {
  running:  { emoji: '🏃', label: 'Running',  accent: 'text-orange-500', pill: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  cycling:  { emoji: '🚴', label: 'Cycling',  accent: 'text-sky-500',    pill: 'bg-sky-500/10 text-sky-600 border-sky-200'          },
  padel:    { emoji: '🎾', label: 'Padel',    accent: 'text-yellow-600', pill: 'bg-yellow-400/10 text-yellow-700 border-yellow-200' },
  swimming: { emoji: '🏊', label: 'Swimming', accent: 'text-cyan-500',   pill: 'bg-cyan-500/10 text-cyan-600 border-cyan-200'       },
  gym:      { emoji: '🏋️', label: 'Gym',     accent: 'text-violet-500', pill: 'bg-violet-500/10 text-violet-600 border-violet-200' },
  football: { emoji: '⚽', label: 'Football', accent: 'text-emerald-600',pill: 'bg-emerald-500/10 text-emerald-700 border-emerald-200'},
  default:  { emoji: '⚡️', label: 'Activity', accent: 'text-teal-600',  pill: 'bg-teal-500/10 text-teal-700 border-teal-200'       },
}
const getMeta = (type: string) => activityMeta[type?.toLowerCase()] ?? activityMeta.default

export function Dashboard({ userId, userEmail }: Props) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [profileRes, statsRes, regsRes, groupsRes, followsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("user_stats").select("*").eq("user_id", userId),
        supabase.from("registrations").select("*").eq("user_id", userId),
        supabase.from("group_members").select("group_id, groups(*)").eq("user_id", userId).limit(15),
        supabase.from("follows").select("following_id").eq("follower_id", userId),
      ])
      const today = new Date().toISOString().split("T")[0]
      const profile = profileRes.data
      const registeredIds = regsRes.data?.map(r => r.event_id) || []

      let upcomingEvents: any[] = []
      if (registeredIds.length > 0) {
        const { data: eventData } = await supabase.from("events").select("*").in("id", registeredIds)
        upcomingEvents = (regsRes.data || [])
          .map(r => ({ ...r, event: eventData?.find(e => e.id === r.event_id) }))
          .filter(r => r.event && r.event.date >= today)
          .sort((a, b) => a.event.date.localeCompare(b.event.date))
      }

      const { data: recData } = await supabase
        .from("events").select("*").gte("date", today).order("date", { ascending: true }).limit(12)
      const recommendedEvents = (recData || []).filter(e => !registeredIds.includes(e.id))

      const stats = statsRes.data || []
      const totalPoints = stats.reduce((s: number, r: any) => s + (r.total_points || 0), 0)
      const maxStreak = Math.max(...stats.map((r: any) => r.streak_weeks || 0), 0)

      const followingIds = followsRes.data?.map(f => f.following_id) || []
      const allFeedIds = [userId, ...followingIds]

      const [logsRes, friendRegsRes] = await Promise.all([
        supabase.from("activity_logs").select("*").in("user_id", allFeedIds).order("logged_at", { ascending: false }).limit(30),
        supabase.from("registrations").select("*, events(id, title, date, location, image, category_id)").in("user_id", allFeedIds).order("registered_at", { ascending: false }).limit(30),
      ])
      const { data: feedProfiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", allFeedIds)
      const pMap: Record<string, any> = {}
      feedProfiles?.forEach(p => { pMap[p.id] = p })

      const friendActivity = [
        ...(logsRes.data || []).map(l => ({
          type: "log", timestamp: l.logged_at,
          profile: pMap[l.user_id], isOwn: l.user_id === userId, data: l,
        })),
        ...(friendRegsRes.data || [])
          .filter(r => r.events?.date >= today)
          .map(r => ({
            type: "reg", timestamp: r.registered_at,
            profile: pMap[r.user_id], isOwn: r.user_id === userId, data: r,
          })),
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      const { data: leagueData } = await supabase
        .from("league_members").select("league_id, leagues(id, name, sport)").eq("user_id", userId).limit(5)

      setData({
        profile, totalPoints, maxStreak, level: getLevel(totalPoints),
        upcomingEvents, recommendedEvents,
        myGroups: groupsRes.data?.map(m => m.groups).filter(Boolean) || [],
        myLeagues: leagueData?.map(l => l.leagues).filter(Boolean) || [],
        friendActivity,
      })
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return (
    <div className="min-h-screen bg-[#F0EFEC] flex flex-col items-center justify-center gap-4">
      <div className="size-14 bg-slate-900 rounded-2xl flex items-center justify-center animate-pulse">
        <Zap className="text-teal-400 size-7 fill-teal-400" />
      </div>
      <p className="text-xs font-black uppercase tracking-[0.3em] text-stone-400">Loading...</p>
    </div>
  )

  const { profile, totalPoints, maxStreak, level, upcomingEvents, recommendedEvents, myGroups, myLeagues, friendActivity } = data
  const firstName = profile?.full_name?.split(" ")[0] || "Athlete"
  const levelProgress = Math.min(100, Math.round(
    ((totalPoints - (level.currentLevelXp || 0)) / ((level.nextLevelXp || totalPoints + 1) - (level.currentLevelXp || 0))) * 100
  ))

  return (
    <div className="min-h-screen pb-32" style={{ background: '#F0EFEC' }}>

      {/* ── Hero header ── */}
      <div className="bg-slate-900 px-10 pt-12 pb-10 relative overflow-hidden">
        {/* Subtle dot grid */}
        <div className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div className="mx-auto max-w-[1560px] relative z-10 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="size-2 bg-emerald-400 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.35em] text-stone-400">Live Dashboard</span>
            </div>
            {/* Big editorial greeting */}
            <h1 className="text-6xl font-black italic uppercase tracking-[-0.03em] text-white leading-none">
              GOOD TO SEE<br />
              YOU, <span className="text-teal-400">{firstName.toUpperCase()}.</span>
            </h1>
          </div>
          <div className="flex items-end gap-12 pb-1">
            {/* Quick stats in hero */}
            <div className="text-right">
              <p className="text-5xl font-black text-white leading-none">{totalPoints.toLocaleString()}</p>
              <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mt-1">Total XP · {level.name}</p>
            </div>
            <div className="text-right">
              <p className="text-5xl font-black text-white leading-none">{maxStreak}<span className="text-2xl text-stone-400">wk</span></p>
              <p className="text-[11px] font-black uppercase tracking-widest text-stone-400 mt-1">Current Streak</p>
            </div>
            <Link
              href="/compete/log"
              className="flex items-center gap-2.5 bg-teal-500 hover:bg-teal-400 text-slate-900 font-black text-[11px] uppercase tracking-[0.15em] px-7 py-4 rounded-2xl transition-colors shadow-xl shadow-teal-900/30"
            >
              <Plus className="size-4 stroke-[3px]" /> Log Activity
            </Link>
          </div>
        </div>

        {/* XP progress bar as hero footer strip */}
        <div className="mx-auto max-w-[1560px] mt-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-teal-400 rounded-full transition-all duration-1000" style={{ width: `${levelProgress}%` }} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 shrink-0">
              Level {level.level} — {levelProgress}% to {level.level + 1}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3-col grid ── */}
      <div className="mx-auto max-w-[1560px] px-8 py-10 grid grid-cols-12 gap-8 items-start">

        {/* ══════════════════════
            LEFT SIDEBAR
        ══════════════════════ */}
        <aside className="col-span-3 space-y-5 sticky top-8">

          {/* Identity compact card */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/50 shadow-sm flex items-center gap-4">
            <div className="size-14 rounded-2xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} className="size-full object-cover" />
                : <User className="size-full p-3.5 text-stone-300" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-black text-slate-900 truncate leading-none mb-1">{profile?.full_name || 'Athlete'}</p>
              <span className="inline-block bg-teal-500/10 text-teal-700 border border-teal-200 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
                {level.name}
              </span>
            </div>
            <Link href="/profile">
              <div className="size-9 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center hover:bg-slate-900 hover:border-slate-900 transition-colors group">
                <ArrowUpRight className="size-4 text-stone-400 group-hover:text-teal-400" />
              </div>
            </Link>
          </div>

          {/* Quick Access */}
          <div className="bg-white rounded-3xl overflow-hidden border border-stone-200/50 shadow-sm">
            <div className="px-5 pt-5 pb-3">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">Quick Access</p>
            </div>
            <nav>
              {[
                { label: 'Browse Events',  icon: Calendar,  href: '/events',      sub: 'Find & join events'   },
                { label: 'Communities',    icon: Users,     href: '/community',   sub: 'Groups & crews'       },
                { label: 'Log Activity',   icon: Activity,  href: '/compete/log', sub: 'Record a session'     },
                { label: 'My Stats',       icon: BarChart2, href: '/profile',     sub: 'Performance overview' },
                { label: 'Leagues',        icon: Trophy,    href: '/leagues',     sub: 'Compete & rank up'    },
              ].map((item, idx, arr) => (
                <Link key={item.label} href={item.href}
                  className={cn(
                    "flex items-center gap-3.5 px-5 py-3.5 hover:bg-stone-50 transition-colors group",
                    idx < arr.length - 1 && "border-b border-stone-100"
                  )}
                >
                  <div className="size-9 rounded-xl bg-stone-100 group-hover:bg-slate-900 flex items-center justify-center transition-all duration-200 shrink-0">
                    <item.icon className="size-4 text-stone-500 group-hover:text-teal-400 transition-colors" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-stone-800 leading-none group-hover:text-slate-900">{item.label}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">{item.sub}</p>
                  </div>
                  <ChevronRight className="size-4 text-stone-200 group-hover:text-teal-500 shrink-0 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </nav>
          </div>

          {/* My Communities */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/50 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em]">My Communities</p>
              <Link href="/community" className="text-[10px] font-black text-teal-600 hover:text-teal-700">See all</Link>
            </div>
            <div className="space-y-4">
              {myGroups.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-stone-400 mb-3">No communities yet</p>
                  <Link href="/community" className="text-xs font-black text-teal-600">Browse →</Link>
                </div>
              ) : myGroups.map((group: any) => (
                <Link key={group.id} href={`/community/${group.id}`} className="flex items-center gap-3.5 group">
                  <div className="size-11 rounded-xl overflow-hidden border border-stone-100 shrink-0 group-hover:scale-105 transition-transform">
                    <img src={group.image || 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200'} className="size-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold text-stone-800 group-hover:text-teal-600 transition-colors truncate">{group.name}</p>
                    <p className="text-[11px] text-stone-400 mt-0.5">{group.members_count ?? '—'} members</p>
                  </div>
                </Link>
              ))}
            </div>
            <Link href="/community"
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-200 hover:border-teal-400 hover:text-teal-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-stone-400 transition-all"
            >
              <Plus className="size-3" /> Join a Community
            </Link>
          </div>

          {/* Leagues */}
          {myLeagues.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-stone-200/50 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-stone-400 uppercase tracking-[0.3em] flex items-center gap-1.5">
                  <Trophy className="size-3.5 text-amber-500" /> My Leagues
                </p>
                <Link href="/leagues" className="text-[10px] font-black text-teal-600">See all</Link>
              </div>
              <div className="space-y-3">
                {myLeagues.map((league: any) => (
                  <Link key={league.id} href={`/leagues/${league.id}`} className="flex items-center justify-between group">
                    <div>
                      <p className="text-[13px] font-bold text-stone-800 group-hover:text-teal-600 transition-colors">{league.name}</p>
                      <p className="text-[11px] text-stone-400 capitalize">{league.sport}</p>
                    </div>
                    <ChevronRight className="size-4 text-stone-200 group-hover:text-teal-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ══════════════════════
            MAIN FEED
        ══════════════════════ */}
        <main className="col-span-6 space-y-10 min-w-0">

          {/* ─ Upcoming Sessions ─ */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-stone-500 flex items-center gap-2">
                <Calendar className="size-3.5 text-teal-500" /> Your Sessions
              </h2>
              <Link href="/profile?tab=schedule" className="text-[11px] font-black text-teal-600 hover:text-teal-700">View all →</Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
                {upcomingEvents.map((reg: any) => {
                  const sportImg = reg.event.image || getSportImage(reg.event.category_id)
                  return (
                    <Link key={reg.id} href={`/events/${reg.event.id}`}
                      className="flex-shrink-0 relative h-52 w-64 rounded-3xl overflow-hidden group shadow-md hover:shadow-xl transition-shadow duration-300"
                    >
                      {/* Sport image as card background */}
                      <img src={sportImg} className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                      {/* Date pill top-left */}
                      <div className="absolute top-4 left-4">
                        <span className="bg-white text-slate-900 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow-md">
                          {formatEventDate(reg.event.date)}
                        </span>
                      </div>
                      {/* Check top-right */}
                      <div className="absolute top-4 right-4">
                        <div className="size-8 bg-emerald-400 rounded-xl flex items-center justify-center shadow-md">
                          <CheckCircle2 className="size-4 text-white stroke-[2.5px]" />
                        </div>
                      </div>
                      {/* Title bottom */}
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <p className="text-lg font-black text-white uppercase italic tracking-tight leading-tight mb-1.5">{reg.event.title}</p>
                        <p className="text-[11px] font-medium text-white/60 flex items-center gap-1">
                          <MapPin className="size-3 text-teal-400 shrink-0" />{reg.event.location}
                        </p>
                      </div>
                    </Link>
                  )
                })}
                {/* Find more */}
                <Link href="/events"
                  className="flex-shrink-0 h-52 w-44 rounded-3xl border-2 border-dashed border-stone-300 hover:border-teal-400 bg-white/50 hover:bg-white flex flex-col items-center justify-center gap-3 group transition-all"
                >
                  <div className="size-10 rounded-2xl bg-stone-100 group-hover:bg-teal-50 flex items-center justify-center transition-colors">
                    <Plus className="size-5 text-stone-400 group-hover:text-teal-600" />
                  </div>
                  <p className="text-[10px] font-black text-stone-400 group-hover:text-teal-600 uppercase tracking-widest transition-colors text-center leading-relaxed">
                    Find<br />Events
                  </p>
                </Link>
              </div>
            ) : (
              <div className="h-52 rounded-3xl bg-white/60 border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-3">
                <p className="text-sm font-bold text-stone-400">No sessions booked yet</p>
                <Link href="/events" className="text-sm font-black text-teal-600 hover:underline">Browse Events →</Link>
              </div>
            )}
          </section>

          {/* ─ Community Feed ─ */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-stone-500">Community Feed</h2>
              <div className="flex items-center gap-2">
                <span className="size-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-stone-400">Live</span>
              </div>
            </div>

            <div className="space-y-6">
              {friendActivity.length === 0 && (
                <div className="py-20 rounded-3xl bg-white border-2 border-dashed border-stone-200 flex flex-col items-center justify-center gap-3 shadow-sm">
                  <Users className="size-12 text-stone-200" />
                  <p className="text-base font-bold text-stone-400">Follow athletes to see their activity here</p>
                  <Link href="/discover" className="text-sm font-black text-teal-600 hover:underline">Discover athletes →</Link>
                </div>
              )}

              {friendActivity.map((item, i) => {
                const isLog = item.type === "log"
                const meta = getMeta(item.data?.activity_type)
                const sportImg = getSportImage(item.data?.activity_type || item.data?.events?.category_id)

                return (
                  <article key={i} className="bg-white border border-stone-200/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow duration-300">

                    {/* ── If it's an activity log: image banner ── */}
                    {isLog && (
                      <div className="relative h-36 overflow-hidden">
                        <img src={sportImg} className="size-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-transparent" />
                        {/* Activity type top-left */}
                        <div className="absolute top-4 left-5 flex items-center gap-2">
                          <span className="text-2xl leading-none">{meta.emoji}</span>
                          <span className="text-white font-black text-base uppercase italic tracking-tight">{item.data.activity_type || 'Activity'}</span>
                        </div>
                        {/* Big duration bottom-left */}
                        <div className="absolute bottom-4 left-5">
                          <p className="text-4xl font-black text-white leading-none italic">
                            {item.data.duration_mins
                              ? item.data.duration_mins >= 60
                                ? `${Math.floor(item.data.duration_mins / 60)}h ${item.data.duration_mins % 60}m`
                                : `${item.data.duration_mins}m`
                              : '—'}
                          </p>
                        </div>
                        {/* XP bottom-right */}
                        <div className="absolute bottom-4 right-5">
                          <p className="text-2xl font-black text-teal-400 leading-none">+{item.data.points || 50}<span className="text-sm font-bold text-teal-300 ml-1">XP</span></p>
                        </div>
                      </div>
                    )}

                    <div className="px-6 pt-5 pb-4">
                      {/* Author row */}
                      <div className="flex items-center justify-between mb-4">
                        <Link href={`/profile/${item.profile?.id}`} className="flex items-center gap-3 group">
                          <div className="size-10 rounded-2xl overflow-hidden bg-stone-100 border border-stone-100 shrink-0 group-hover:ring-2 group-hover:ring-teal-400 transition-all">
                            {item.profile?.avatar_url
                              ? <img src={item.profile.avatar_url} className="size-full object-cover" />
                              : <User className="size-full p-2 text-stone-300" />}
                          </div>
                          <div>
                            <p className="text-[14px] font-black text-slate-900 group-hover:text-teal-600 transition-colors leading-none">
                              {item.isOwn ? 'You' : item.profile?.full_name}
                            </p>
                            <p className="text-[11px] text-stone-400 mt-0.5">{timeAgo(item.timestamp)}</p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-2">
                          {/* For reg type: show event badge */}
                          {!isLog && (
                            <span className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                              📅 Joined Event
                            </span>
                          )}
                          <button className="size-8 rounded-xl hover:bg-stone-50 flex items-center justify-center transition-colors">
                            <MoreHorizontal className="size-4 text-stone-300" />
                          </button>
                        </div>
                      </div>

                      {/* Log: notes + effort */}
                      {isLog && (
                        <div>
                          {item.data.effort_level && (
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Effort</span>
                              <span className="text-[11px] font-black text-slate-900 capitalize bg-stone-100 px-2.5 py-1 rounded-lg">
                                {item.data.effort_level}
                              </span>
                            </div>
                          )}
                          {item.data.notes && (
                            <p className="text-[15px] text-stone-600 leading-relaxed italic mb-1">
                              "{item.data.notes}"
                            </p>
                          )}
                        </div>
                      )}

                      {/* Reg: event card */}
                      {!isLog && item.data.events && (
                        <Link href={`/events/${item.data.events.id}`}
                          className="flex items-center gap-4 bg-stone-50 border border-stone-100 rounded-2xl p-4 hover:bg-white hover:border-stone-200 hover:shadow-sm transition-all group/card"
                        >
                          <div className="size-16 rounded-xl overflow-hidden bg-stone-200 shrink-0">
                            <img
                              src={item.data.events.image || getSportImage(item.data.events.category_id)}
                              className="size-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-black text-teal-600 uppercase tracking-wider mb-1">
                              {formatEventDate(item.data.events.date)}
                            </p>
                            <p className="text-base font-black text-slate-900 group-hover/card:text-teal-600 transition-colors leading-snug truncate">
                              {item.data.events.title}
                            </p>
                            <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-1">
                              <MapPin className="size-3 text-teal-500 shrink-0" />{item.data.events.location}
                            </p>
                          </div>
                          <ArrowRight className="size-4 text-stone-200 group-hover/card:text-teal-500 shrink-0 transition-colors" />
                        </Link>
                      )}
                    </div>

                    {/* Social bar */}
                    <div className="px-6 py-3.5 border-t border-stone-100 flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <button className="flex items-center gap-2 text-[12px] font-bold text-stone-400 hover:text-rose-500 transition-colors group/btn">
                          <Heart className="size-4 group-hover/btn:scale-125 transition-transform" /> Kudos
                        </button>
                        <button className="flex items-center gap-2 text-[12px] font-bold text-stone-400 hover:text-teal-600 transition-colors group/btn">
                          <MessageSquare className="size-4 group-hover/btn:scale-125 transition-transform" /> Comment
                        </button>
                      </div>
                      <Share2 className="size-4 text-stone-300 cursor-pointer hover:text-stone-600 transition-colors" />
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        </main>

        {/* ══════════════════════
            RIGHT: Events
        ══════════════════════ */}
        <aside className="col-span-3 space-y-5 sticky top-8 min-w-0">

          <div className="flex items-center justify-between px-1">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500">Recommended Events</h3>
            <Link href="/events" className="text-[10px] font-black text-teal-600 hover:text-teal-700">All →</Link>
          </div>

          {/* Each event as a tall photo card — matches events page */}
          <div className="space-y-4">
            {recommendedEvents.length === 0 && (
              <div className="h-48 rounded-3xl bg-white border-2 border-dashed border-stone-200 flex items-center justify-center">
                <p className="text-sm text-stone-400 font-medium">No upcoming events</p>
              </div>
            )}

            {recommendedEvents.map((event: any) => (
              <Link key={event.id} href={`/events/${event.id}`}
                className="group block relative h-64 rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300"
              >
                {/* Full-bleed image */}
                <img
                  src={event.image || getSportImage(event.category_id)}
                  className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                {/* Top pills */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <span className="bg-white/90 backdrop-blur-sm text-slate-900 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow-sm">
                    {formatEventDate(event.date)}
                  </span>
                  {event.category_id && (
                    <span className="bg-teal-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-sm">
                      {event.category_id}
                    </span>
                  )}
                </div>

                {/* Bottom content */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-xl font-black text-white uppercase italic tracking-tight leading-tight mb-2">
                    {event.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] text-white/60 flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-teal-400 shrink-0" />{event.location}
                    </p>
                    <div className="flex items-center gap-2">
                      {event.price != null && (
                        <span className="text-[11px] font-black text-white/80">
                          {event.price === 0 ? 'Free' : `£${event.price}`}
                        </span>
                      )}
                      <div className="size-7 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-teal-500 group-hover:border-teal-500 transition-all">
                        <ArrowRight className="size-3.5 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  {event.max_participants && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-400 rounded-full"
                          style={{ width: `${Math.min(100, ((event.participants_count || 0) / event.max_participants) * 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-white/40">
                        {event.participants_count || 0}/{event.max_participants}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            ))}

            {recommendedEvents.length > 0 && (
              <Link href="/events"
                className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
              >
                Browse All Events <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>

          {/* Footer */}
          <div className="px-1 pt-2 opacity-40">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2">
              {['Company', 'Support', 'Legal', 'Privacy'].map(link => (
                <Link key={link} href={`/${link.toLowerCase()}`} className="hover:text-teal-600 transition-colors">{link}</Link>
              ))}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-stone-400">Balance v2.4 © 2026</p>
          </div>
        </aside>

      </div>
    </div>
  )
}