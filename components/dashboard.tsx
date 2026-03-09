"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel } from "@/lib/points"
import { format, isToday, isTomorrow, formatDistanceToNow, differenceInDays } from "date-fns"
import {
  MapPin, Calendar, User, ArrowRight, ArrowUpRight,
  Activity, Plus, CheckCircle2, MessageSquare, Heart,
  Share2, MoreHorizontal, Trophy, Zap, ChevronRight,
  Users, BarChart2, TrendingUp, Star, Clock
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─────────────────────────────────────────────────────────────────────────────
// NAV STYLE GUIDE — apply to your existing nav component
// Wrapper:     bg-white/90 backdrop-blur-xl border-b border-stone-200/60 h-[68px]
// Logo:        font-black text-2xl tracking-[-0.05em] text-slate-900 + teal dot
// Nav links:   text-[11px] font-black uppercase tracking-[0.18em] text-stone-400 hover:text-slate-900
// Profile pill:bg-slate-900 text-white rounded-xl pl-1 pr-3.5 py-1
// ─────────────────────────────────────────────────────────────────────────────

interface Props { userId: string; userEmail: string }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d))    return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  return format(d, "EEE MMM do").toUpperCase()
}

function getDaysUntil(dateStr: string) {
  const days = differenceInDays(new Date(dateStr), new Date())
  if (days === 0)  return { label: "Today",      urgent: true  }
  if (days === 1)  return { label: "Tomorrow",   urgent: true  }
  if (days <= 7)   return { label: `${days}d`,   urgent: false }
  return              { label: `${days}d`,       urgent: false }
}

function timeAgo(ts: string) {
  return formatDistanceToNow(new Date(ts), { addSuffix: true })
}

function fmtDuration(mins: number) {
  if (!mins) return "—"
  if (mins >= 60) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m > 0 ? `${h}h ${m}m` : `${h}h`
  }
  return `${mins}m`
}

// ─── Sport assets ─────────────────────────────────────────────────────────────

const sportImages: Record<string, string> = {
  running:  "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=900&q=80",
  cycling:  "https://images.unsplash.com/photo-1534787238916-9ba6764efd4f?w=900&q=80",
  padel:    "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=80",
  swimming: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=900&q=80",
  gym:      "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=900&q=80",
  football: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&q=80",
  tennis:   "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=900&q=80",
  default:  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=80",
}
const getSportImage = (t?: string) =>
  sportImages[(t ?? "").toLowerCase()] ?? sportImages.default

const activityMeta: Record<string, { emoji: string; bg: string; text: string }> = {
  running:  { emoji: "🏃", bg: "bg-orange-500/15 border-orange-400/20", text: "text-orange-300" },
  cycling:  { emoji: "🚴", bg: "bg-sky-500/15 border-sky-400/20",       text: "text-sky-300"    },
  padel:    { emoji: "🎾", bg: "bg-yellow-400/15 border-yellow-400/20", text: "text-yellow-300" },
  swimming: { emoji: "🏊", bg: "bg-cyan-500/15 border-cyan-400/20",     text: "text-cyan-300"   },
  gym:      { emoji: "🏋️", bg: "bg-violet-500/15 border-violet-400/20",text: "text-violet-300" },
  football: { emoji: "⚽", bg: "bg-emerald-500/15 border-emerald-400/20",text:"text-emerald-300"},
  default:  { emoji: "⚡", bg: "bg-teal-500/15 border-teal-400/20",     text: "text-teal-300"   },
}
const getMeta = (t?: string) =>
  activityMeta[(t ?? "").toLowerCase()] ?? activityMeta.default

// ─── Small shared components ──────────────────────────────────────────────────

function SectionHeading({ icon: Icon, children, color = "bg-stone-100 text-stone-500" }: {
  icon: React.ElementType; children: React.ReactNode; color?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={cn("size-7 rounded-lg flex items-center justify-center", color)}>
        <Icon className="size-3.5" />
      </div>
      <h2 className="text-[13px] font-black uppercase tracking-[0.12em] text-slate-900">{children}</h2>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

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

      const today   = new Date().toISOString().split("T")[0]
      const profile = profileRes.data
      const registeredIds = regsRes.data?.map(r => r.event_id) || []

      let upcomingEvents: any[] = []
      if (registeredIds.length > 0) {
        const { data: evData } = await supabase.from("events").select("*").in("id", registeredIds)
        upcomingEvents = (regsRes.data || [])
          .map(r => ({ ...r, event: evData?.find(e => e.id === r.event_id) }))
          .filter(r => r.event && r.event.date >= today)
          .sort((a, b) => a.event.date.localeCompare(b.event.date))
      }

      const { data: recData } = await supabase
        .from("events").select("*").gte("date", today)
        .order("date", { ascending: true }).limit(12)
      const recommendedEvents = (recData || []).filter(e => !registeredIds.includes(e.id))

      const stats       = statsRes.data || []
      const totalPoints = stats.reduce((s: number, r: any) => s + (r.total_points    || 0), 0)
      const totalEvents = stats.reduce((s: number, r: any) => s + (r.events_attended || 0), 0)
      const maxStreak   = Math.max(...stats.map((r: any) => r.streak_weeks || 0), 0)

      const followingIds = followsRes.data?.map(f => f.following_id) || []
      const allFeedIds   = [userId, ...followingIds]

      const [logsRes, friendRegsRes] = await Promise.all([
        supabase.from("activity_logs").select("*")
          .in("user_id", allFeedIds).order("logged_at", { ascending: false }).limit(30),
        supabase.from("registrations")
          .select("*, events(id,title,date,location,image,category_id)")
          .in("user_id", allFeedIds).order("registered_at", { ascending: false }).limit(30),
      ])

      const { data: feedProfiles } = await supabase
        .from("profiles").select("id,full_name,avatar_url").in("id", allFeedIds)
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
        .from("league_members")
        .select("league_id, leagues(id,name,sport)").eq("user_id", userId).limit(5)

      setData({
        profile, totalPoints, totalEvents, maxStreak,
        level: getLevel(totalPoints),
        upcomingEvents, recommendedEvents,
        myGroups:  groupsRes.data?.map(m => m.groups).filter(Boolean) || [],
        myLeagues: leagueData?.map(l => l.leagues).filter(Boolean)   || [],
        friendActivity,
      })
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-5">
      <div className="relative size-16">
        <div className="absolute inset-0 rounded-2xl bg-teal-500/20 animate-ping" />
        <div className="relative size-16 bg-slate-800 border border-white/10 rounded-2xl flex items-center justify-center">
          <Zap className="text-teal-400 size-7 fill-teal-400" />
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-500">Loading your dashboard</p>
    </div>
  )

  const {
    profile, totalPoints, totalEvents, maxStreak, level,
    upcomingEvents, recommendedEvents, myGroups, myLeagues, friendActivity
  } = data

  const firstName  = profile?.full_name?.split(" ")[0] || "Athlete"
  const levelPct   = Math.min(100, Math.round(
    ((totalPoints - (level.currentLevelXp || 0)) /
     Math.max(1, (level.nextLevelXp || totalPoints + 1) - (level.currentLevelXp || 0))) * 100
  ))

  // Hour-based greeting
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="min-h-screen" style={{ background: "#F0EFEC" }}>

      {/* ═══════════════════════════════════════════════════════════
          HERO — COMMAND CENTRE
      ═══════════════════════════════════════════════════════════ */}
      <div className="bg-slate-900 relative overflow-hidden">
        {/* Dot-grid texture */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "28px 28px"
        }} />
        {/* Subtle teal glow bottom-left */}
        <div className="absolute -bottom-32 -left-32 size-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="mx-auto max-w-[1560px] px-10 pt-11 pb-0 relative z-10">

          {/* ── Top row: greeting + CTAs ── */}
          <div className="flex items-start justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-500">{greeting}</span>
              </div>
              <h1 className="text-[72px] font-black italic uppercase tracking-[-0.04em] text-white leading-[0.85]">
                Hey,<br />
                <span className="text-teal-400">{firstName}.</span>
              </h1>
            </div>

            {/* CTAs — stacked, right-aligned */}
            <div className="flex flex-col gap-3 pt-1 shrink-0">
              <Link href="/compete/log"
                className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 active:scale-[0.97] text-slate-900 font-black text-[11px] uppercase tracking-[0.15em] px-7 py-4 rounded-2xl transition-all shadow-lg shadow-teal-900/30"
              >
                <Plus className="size-4 stroke-[3px]" /> Log Activity
              </Link>
              <Link href="/events"
                className="flex items-center justify-center gap-2 bg-white/8 hover:bg-white/14 border border-white/10 hover:border-white/20 text-white font-black text-[11px] uppercase tracking-[0.15em] px-7 py-4 rounded-2xl transition-all"
              >
                <Calendar className="size-4" /> Browse Events
              </Link>
            </div>
          </div>

          {/* ── Stats bar — 4 cells, separated by vertical dividers ── */}
          <div className="grid grid-cols-4 border-t border-white/8">
            {[
              {
                value: totalPoints.toLocaleString(),
                unit:  "XP",
                label: "Total Points",
                sub:   `Level ${level.level} · ${level.name}`,
                color: "text-teal-400",
                icon:  <Zap className="size-4 text-teal-400 fill-teal-400" />,
              },
              {
                value: maxStreak,
                unit:  "wks",
                label: "Current Streak",
                sub:   maxStreak > 0 ? "Keep going 🔥" : "Start your streak",
                color: "text-amber-400",
                icon:  <TrendingUp className="size-4 text-amber-400" />,
              },
              {
                value: totalEvents,
                unit:  "",
                label: "Events Attended",
                sub:   "All time",
                color: "text-white",
                icon:  <Calendar className="size-4 text-stone-400" />,
              },
              {
                value: upcomingEvents.length,
                unit:  "",
                label: "Upcoming Sessions",
                sub:   upcomingEvents.length > 0 ? `Next: ${formatEventDate(upcomingEvents[0].event.date)}` : "None booked",
                color: "text-violet-400",
                icon:  <Clock className="size-4 text-violet-400" />,
              },
            ].map(({ value, unit, label, sub, color, icon }, i) => (
              <div key={label}
                className={cn(
                  "px-8 py-7 flex flex-col gap-4",
                  i > 0 && "border-l border-white/8"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-500">{label}</span>
                  {icon}
                </div>
                <div>
                  <p className={cn("text-[42px] font-black leading-none tracking-tight tabular-nums", color)}>
                    {value}<span className="text-[20px] font-bold text-stone-500 ml-1">{unit}</span>
                  </p>
                  <p className="text-[11px] text-stone-600 mt-2 font-medium">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── XP progress strip — sits right at the bottom edge ── */}
          <div className="flex items-center gap-5 border-t border-white/8 py-4">
            <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-1000"
                style={{ width: `${levelPct}%` }}
              />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-600 shrink-0">
              {levelPct}% to Level {level.level + 1}
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          3-COLUMN BODY
      ═══════════════════════════════════════════════════════════ */}
      <div className="mx-auto max-w-[1560px] px-10 pt-8 pb-24 grid grid-cols-12 gap-8 items-start">

        {/* ╔═══════════════════════════╗
            ║   LEFT SIDEBAR  (col 1–3) ║
            ╚═══════════════════════════╝ */}
        <aside className="col-span-3 space-y-4 sticky top-6">

          {/* ── Profile card — dark, premium ── */}
          <div className="bg-slate-900 rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 opacity-[0.04]" style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "20px 20px"
            }} />
            <div className="relative z-10 p-6">

              {/* Avatar + name + link */}
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <div className="size-[52px] rounded-2xl bg-white/10 border border-white/10 overflow-hidden">
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} className="size-full object-cover" alt="" />
                        : <User className="size-full p-3 text-white/20" />}
                    </div>
                    {/* Online dot */}
                    <span className="absolute -bottom-0.5 -right-0.5 size-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-black text-white leading-none truncate mb-2">
                      {profile?.full_name || "Athlete"}
                    </p>
                    <span className="inline-flex items-center gap-1.5 bg-teal-500/20 border border-teal-500/25 text-teal-300 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg">
                      {level.emoji} {level.name}
                    </span>
                  </div>
                </div>
                <Link href="/profile"
                  className="size-8 rounded-xl bg-white/6 border border-white/8 hover:bg-white/14 flex items-center justify-center transition-colors shrink-0"
                >
                  <ArrowUpRight className="size-3.5 text-white/40" />
                </Link>
              </div>

              {/* XP progress */}
              <div className="mb-5">
                <div className="flex justify-between text-[10px] font-bold mb-2">
                  <span className="text-white/30 uppercase tracking-widest">Level progress</span>
                  <span className="text-teal-400 font-black">{levelPct}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700"
                    style={{ width: `${levelPct}%` }} />
                </div>
              </div>

              {/* Mini stat trio */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: totalPoints >= 1000 ? `${(totalPoints/1000).toFixed(1)}k` : totalPoints, l: "XP",     c: "text-teal-400" },
                  { v: maxStreak,  l: "Streak", c: "text-amber-400" },
                  { v: totalEvents,l: "Events", c: "text-white"     },
                ].map(({ v, l, c }) => (
                  <div key={l} className="bg-white/[0.04] border border-white/6 rounded-2xl py-3 px-2 text-center">
                    <p className={cn("text-[20px] font-black leading-none tabular-nums", c)}>{v}</p>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/25 mt-1.5">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Quick Access ── */}
          <div className="bg-white rounded-3xl overflow-hidden border border-stone-200/60 shadow-sm">
            <div className="px-5 pt-5 pb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">Quick Access</p>
            </div>
            <nav className="px-3 pb-3 space-y-0.5">
              {[
                { label: "Browse Events",  icon: Calendar,  href: "/events",      iconBg: "bg-teal-50 text-teal-600"     },
                { label: "Communities",    icon: Users,     href: "/community",   iconBg: "bg-blue-50 text-blue-600"     },
                { label: "Log Activity",   icon: Activity,  href: "/compete/log", iconBg: "bg-emerald-50 text-emerald-600"},
                { label: "My Stats",       icon: BarChart2, href: "/profile",     iconBg: "bg-violet-50 text-violet-600" },
                { label: "Leagues",        icon: Trophy,    href: "/leagues",     iconBg: "bg-amber-50 text-amber-600"   },
              ].map(({ label, icon: Icon, href, iconBg }) => (
                <Link key={label} href={href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-stone-50 transition-colors group"
                >
                  <div className={cn("size-8 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", iconBg)}>
                    <Icon className="size-4" />
                  </div>
                  <span className="text-[13px] font-bold text-stone-700 group-hover:text-slate-900 flex-1 transition-colors">{label}</span>
                  <ChevronRight className="size-4 text-stone-200 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </nav>
          </div>

          {/* ── My Communities ── */}
          <div className="bg-white rounded-3xl p-5 border border-stone-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">My Communities</p>
              <Link href="/community" className="text-[10px] font-black text-teal-600 hover:text-teal-700 transition-colors">See all</Link>
            </div>

            {myGroups.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-3 text-center">
                <div className="size-12 rounded-2xl bg-stone-100 flex items-center justify-center">
                  <Users className="size-5 text-stone-300" />
                </div>
                <p className="text-sm text-stone-400">No communities yet</p>
                <Link href="/community" className="text-xs font-black text-teal-600 hover:text-teal-700">Browse →</Link>
              </div>
            ) : (
              <div className="space-y-3">
                {myGroups.slice(0, 4).map((group: any) => (
                  <Link key={group.id} href={`/community/${group.id}`} className="flex items-center gap-3 group">
                    <div className="size-10 rounded-xl overflow-hidden border border-stone-100 shrink-0 ring-2 ring-transparent group-hover:ring-teal-400 transition-all">
                      <img
                        src={group.image || "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=200"}
                        className="size-full object-cover"
                        alt=""
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-stone-800 group-hover:text-teal-600 transition-colors truncate">{group.name}</p>
                      <p className="text-[11px] text-stone-400">{group.members_count ?? "—"} members</p>
                    </div>
                    <ChevronRight className="size-4 text-stone-200 group-hover:text-teal-500 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            )}

            <Link href="/community"
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-200 hover:border-teal-400 rounded-2xl text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-teal-600 transition-all"
            >
              <Plus className="size-3" /> Join a Community
            </Link>
          </div>

          {/* ── Leagues (only if enrolled) ── */}
          {myLeagues.length > 0 && (
            <div className="bg-white rounded-3xl p-5 border border-stone-200/60 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="size-3.5 text-amber-500" />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">My Leagues</p>
                </div>
                <Link href="/leagues" className="text-[10px] font-black text-teal-600 hover:text-teal-700">See all</Link>
              </div>
              <div className="space-y-2">
                {myLeagues.map((league: any) => (
                  <Link key={league.id} href={`/leagues/${league.id}`}
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-stone-50 transition-colors group"
                  >
                    <div className="size-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                      <Trophy className="size-4 text-amber-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-stone-800 group-hover:text-teal-600 transition-colors truncate">{league.name}</p>
                      <p className="text-[11px] text-stone-400 capitalize">{league.sport}</p>
                    </div>
                    <ChevronRight className="size-4 text-stone-200 group-hover:text-teal-500 transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* ╔═════════════════════╗
            ║   MAIN FEED (4–9)   ║
            ╚═════════════════════╝ */}
        <main className="col-span-6 space-y-10 min-w-0">

          {/* ══ Your Upcoming Sessions ══ */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <SectionHeading icon={Calendar} color="bg-teal-50 text-teal-600">
                Your Sessions
              </SectionHeading>
              <Link href="/profile?tab=schedule"
                className="text-[11px] font-black text-stone-400 hover:text-teal-600 flex items-center gap-1 transition-colors"
              >
                View all <ChevronRight className="size-3.5" />
              </Link>
            </div>

            {upcomingEvents.length > 0 ? (
              <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
                {upcomingEvents.map((reg: any) => {
                  const { label: daysLabel, urgent } = getDaysUntil(reg.event.date)
                  return (
                    <Link key={reg.id} href={`/events/${reg.event.id}`}
                      className="flex-shrink-0 relative h-[220px] w-[200px] rounded-3xl overflow-hidden group shadow-md hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300"
                    >
                      <img
                        src={reg.event.image || getSportImage(reg.event.category_id)}
                        className="absolute inset-0 size-full object-cover group-hover:scale-[1.07] transition-transform duration-500"
                        alt=""
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-black/20" />

                      {/* Registered badge */}
                      <div className="absolute top-3.5 right-3.5 size-7 bg-emerald-400 rounded-xl flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="size-3.5 text-white stroke-[2.5px]" />
                      </div>

                      {/* Days-until chip */}
                      <div className="absolute top-3.5 left-3.5">
                        <span className={cn(
                          "text-[10px] font-black uppercase px-2.5 py-1.5 rounded-xl shadow-sm",
                          urgent ? "bg-amber-400 text-slate-900" : "bg-white text-slate-900"
                        )}>
                          {daysLabel}
                        </span>
                      </div>

                      {/* Title + location */}
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-[15px] font-black text-white uppercase italic tracking-tight leading-tight mb-1.5 line-clamp-2">
                          {reg.event.title}
                        </p>
                        <p className="text-[11px] text-white/50 flex items-center gap-1.5 truncate">
                          <MapPin className="size-3 text-teal-400 shrink-0" />
                          {reg.event.location}
                        </p>
                      </div>
                    </Link>
                  )
                })}

                {/* Find more CTA tile */}
                <Link href="/events"
                  className="flex-shrink-0 h-[220px] w-[140px] rounded-3xl border-2 border-dashed border-stone-300 hover:border-teal-400 bg-white/40 hover:bg-white flex flex-col items-center justify-center gap-3 group transition-all"
                >
                  <div className="size-10 rounded-2xl bg-stone-100 group-hover:bg-teal-50 flex items-center justify-center transition-colors">
                    <Plus className="size-5 text-stone-400 group-hover:text-teal-600 transition-colors" />
                  </div>
                  <p className="text-[10px] font-black text-stone-400 group-hover:text-teal-600 uppercase tracking-widest text-center leading-relaxed transition-colors">
                    Find<br />Events
                  </p>
                </Link>
              </div>
            ) : (
              <div className="h-[220px] rounded-3xl bg-white border-2 border-dashed border-stone-200 shadow-sm flex flex-col items-center justify-center gap-4">
                <div className="size-14 rounded-2xl bg-stone-50 flex items-center justify-center">
                  <Calendar className="size-6 text-stone-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-stone-400">No sessions booked</p>
                  <p className="text-[11px] text-stone-300 mt-1">Find something to join</p>
                </div>
                <Link href="/events"
                  className="text-[11px] font-black text-teal-600 hover:text-teal-700 flex items-center gap-1 transition-colors"
                >
                  Browse Events <ArrowRight className="size-3.5" />
                </Link>
              </div>
            )}
          </section>

          {/* ══ Community Feed ══ */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <SectionHeading icon={Users} color="bg-emerald-50 text-emerald-600">
                Community Feed
              </SectionHeading>
              <div className="flex items-center gap-2">
                <span className="size-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Live</span>
              </div>
            </div>

            {friendActivity.length === 0 ? (
              <div className="py-24 rounded-3xl bg-white border-2 border-dashed border-stone-200 shadow-sm flex flex-col items-center justify-center gap-4">
                <div className="size-16 rounded-3xl bg-stone-50 flex items-center justify-center">
                  <Users className="size-7 text-stone-200" />
                </div>
                <div className="text-center">
                  <p className="text-base font-black text-stone-400 mb-1">Your feed is quiet</p>
                  <p className="text-sm text-stone-300">Follow athletes to see their activity</p>
                </div>
                <Link href="/discover"
                  className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest px-7 py-3 rounded-2xl hover:bg-teal-600 transition-colors"
                >
                  Discover Athletes
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {friendActivity.map((item, i) => {
                  const isLog     = item.type === "log"
                  const meta      = getMeta(item.data?.activity_type)
                  const sportImg  = getSportImage(item.data?.activity_type || item.data?.events?.category_id)

                  return (
                    <article key={i}
                      className="bg-white border border-stone-200/60 rounded-3xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
                    >
                      {/* ── Activity log: photo banner ── */}
                      {isLog && (
                        <div className="relative h-52 overflow-hidden">
                          <img src={sportImg} className="absolute inset-0 size-full object-cover" alt="" />
                          {/* Gradient: strong on left, fades right */}
                          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/95 via-slate-900/70 to-slate-900/30" />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />

                          {/* Sport label */}
                          <div className="absolute top-5 left-6 flex items-center gap-2.5">
                            <span className={cn("text-[11px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border", meta.bg, meta.text)}>
                              {meta.emoji} {item.data.activity_type || "Activity"}
                            </span>
                          </div>

                          {/* Big duration — bottom left */}
                          <div className="absolute bottom-5 left-6">
                            <p className="text-[56px] font-black text-white leading-none italic tracking-tight">
                              {fmtDuration(item.data.duration_mins)}
                            </p>
                            {item.data.effort_level && (
                              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mt-1.5">
                                {item.data.effort_level} effort
                              </p>
                            )}
                          </div>

                          {/* XP — bottom right */}
                          <div className="absolute bottom-5 right-6 text-right">
                            <p className="text-[38px] font-black text-teal-400 leading-none italic">
                              +{item.data.points || 50}
                            </p>
                            <p className="text-[11px] font-black text-teal-400/60 uppercase tracking-widest">XP</p>
                          </div>
                        </div>
                      )}

                      {/* ── Card body ── */}
                      <div className="p-5">
                        {/* Author */}
                        <div className="flex items-center justify-between">
                          <Link href={`/profile/${item.profile?.id}`} className="flex items-center gap-3 group/author">
                            <div className="size-10 rounded-2xl bg-stone-100 border border-stone-100 overflow-hidden shrink-0 group-hover/author:ring-2 group-hover/author:ring-teal-400 transition-all">
                              {item.profile?.avatar_url
                                ? <img src={item.profile.avatar_url} className="size-full object-cover" alt="" />
                                : <User className="size-full p-2.5 text-stone-300" />}
                            </div>
                            <div>
                              <p className="text-[14px] font-black text-slate-900 group-hover/author:text-teal-600 transition-colors leading-none">
                                {item.isOwn ? "You" : item.profile?.full_name}
                              </p>
                              <p className="text-[11px] text-stone-400 mt-0.5">{timeAgo(item.timestamp)}</p>
                            </div>
                          </Link>

                          <div className="flex items-center gap-2">
                            {!isLog && (
                              <span className="bg-teal-50 text-teal-700 border border-teal-100 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl">
                                📅 Joined
                              </span>
                            )}
                            <button className="size-8 rounded-xl hover:bg-stone-50 flex items-center justify-center transition-colors">
                              <MoreHorizontal className="size-4 text-stone-300" />
                            </button>
                          </div>
                        </div>

                        {/* Log note */}
                        {isLog && item.data.notes && (
                          <p className="mt-4 text-[15px] text-stone-500 italic leading-relaxed pl-1 border-l-2 border-stone-200">
                            "{item.data.notes}"
                          </p>
                        )}

                        {/* Event reg card */}
                        {!isLog && item.data.events && (
                          <Link href={`/events/${item.data.events.id}`}
                            className="mt-4 flex items-center gap-4 bg-stone-50 border border-stone-100 hover:border-stone-200 hover:bg-white rounded-2xl p-4 group/card transition-all hover:shadow-sm"
                          >
                            <div className="size-[60px] rounded-xl overflow-hidden bg-stone-200 shrink-0">
                              <img
                                src={item.data.events.image || getSportImage(item.data.events.category_id)}
                                className="size-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                                alt=""
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black text-teal-600 uppercase tracking-wider mb-1">
                                {formatEventDate(item.data.events.date)}
                              </p>
                              <p className="text-[14px] font-black text-slate-900 group-hover/card:text-teal-600 transition-colors leading-snug truncate">
                                {item.data.events.title}
                              </p>
                              <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-1">
                                <MapPin className="size-3 text-teal-500 shrink-0" />
                                {item.data.events.location}
                              </p>
                            </div>
                            <ArrowRight className="size-4 text-stone-200 group-hover/card:text-teal-500 shrink-0 transition-colors" />
                          </Link>
                        )}
                      </div>

                      {/* Social bar */}
                      <div className="px-5 py-3.5 bg-stone-50/60 border-t border-stone-100 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <button className="flex items-center gap-2 text-[12px] font-bold text-stone-400 hover:text-rose-500 transition-colors group/b">
                            <Heart className="size-4 group-hover/b:scale-125 transition-transform" /> Kudos
                          </button>
                          <button className="flex items-center gap-2 text-[12px] font-bold text-stone-400 hover:text-teal-600 transition-colors group/b">
                            <MessageSquare className="size-4 group-hover/b:scale-125 transition-transform" /> Comment
                          </button>
                        </div>
                        <button className="text-stone-300 hover:text-stone-500 transition-colors">
                          <Share2 className="size-4" />
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        </main>

        {/* ╔══════════════════════════╗
            ║  RIGHT SIDEBAR  (10–12)  ║
            ╚══════════════════════════╝ */}
        <aside className="col-span-3 space-y-5 sticky top-6 min-w-0">

          <div className="flex items-center justify-between">
            <SectionHeading icon={Star} color="bg-amber-50 text-amber-500">
              Recommended
            </SectionHeading>
            <Link href="/events"
              className="text-[10px] font-black text-stone-400 hover:text-teal-600 flex items-center gap-1 transition-colors"
            >
              All <ChevronRight className="size-3.5" />
            </Link>
          </div>

          {recommendedEvents.length === 0 ? (
            <div className="h-48 rounded-3xl bg-white border-2 border-dashed border-stone-200 shadow-sm flex items-center justify-center">
              <p className="text-sm text-stone-400 font-medium">No upcoming events</p>
            </div>
          ) : (
            <div className="space-y-3">

              {/* ── Hero event — large photo card ── */}
              {recommendedEvents[0] && (() => {
                const ev = recommendedEvents[0]
                return (
                  <Link href={`/events/${ev.id}`}
                    className="group block relative h-72 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                  >
                    <img
                      src={ev.image || getSportImage(ev.category_id)}
                      className="absolute inset-0 size-full object-cover group-hover:scale-[1.06] transition-transform duration-500"
                      alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-black/10" />

                    {/* Top row */}
                    <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
                      <div className="flex flex-col gap-1.5">
                        <span className="bg-white/95 text-slate-900 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shadow-sm self-start">
                          {formatEventDate(ev.date)}
                        </span>
                      </div>
                      {ev.category_id && (
                        <span className="bg-teal-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-sm">
                          {ev.category_id}
                        </span>
                      )}
                    </div>

                    {/* Top pick badge */}
                    <div className="absolute top-[4.5rem] left-4 flex items-center gap-1.5">
                      <Star className="size-3 text-amber-400 fill-amber-400" />
                      <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Top Pick</span>
                    </div>

                    {/* Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <p className="text-xl font-black text-white uppercase italic tracking-tight leading-snug mb-3 line-clamp-2">
                        {ev.title}
                      </p>
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-white/50 flex items-center gap-1.5 truncate mr-3">
                          <MapPin className="size-3.5 text-teal-400 shrink-0" />
                          {ev.location}
                        </p>
                        <div className="size-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center group-hover:bg-teal-500 group-hover:border-teal-500 transition-all shrink-0">
                          <ArrowRight className="size-3.5 text-white" />
                        </div>
                      </div>

                      {ev.max_participants && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1 bg-white/15 rounded-full overflow-hidden">
                            <div className="h-full bg-teal-400 rounded-full"
                              style={{ width: `${Math.min(100, ((ev.participants_count || 0) / ev.max_participants) * 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-white/30 shrink-0">
                            {ev.participants_count || 0}/{ev.max_participants}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })()}

              {/* ── Remaining events — compact rows ── */}
              <div className="bg-white border border-stone-200/60 rounded-3xl overflow-hidden shadow-sm divide-y divide-stone-100">
                {recommendedEvents.slice(1, 5).map((ev: any) => (
                  <Link key={ev.id} href={`/events/${ev.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-stone-50 transition-colors group"
                  >
                    <div className="size-14 rounded-2xl overflow-hidden bg-stone-100 shrink-0">
                      <img
                        src={ev.image || getSportImage(ev.category_id)}
                        className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                        alt=""
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[10px] font-black text-teal-600 uppercase tracking-wider">{formatEventDate(ev.date)}</span>
                        {ev.category_id && (
                          <span className="text-[9px] font-black text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-md uppercase">{ev.category_id}</span>
                        )}
                      </div>
                      <p className="text-[13px] font-black text-slate-900 group-hover:text-teal-600 transition-colors truncate leading-tight">{ev.title}</p>
                      <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="size-3 text-teal-500 shrink-0" />{ev.location}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-stone-200 group-hover:text-teal-500 shrink-0 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>

              {/* Browse all */}
              <Link href="/events"
                className="w-full flex items-center justify-center gap-2.5 py-4 bg-slate-900 hover:bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm"
              >
                Browse All Events <ArrowRight className="size-3.5" />
              </Link>
            </div>
          )}

          {/* Footer links */}
          <div className="pt-2 pb-1 px-1">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] font-bold uppercase tracking-widest text-stone-300 mb-2">
              {["Company", "Support", "Legal", "Privacy"].map(l => (
                <Link key={l} href={`/${l.toLowerCase()}`} className="hover:text-stone-500 transition-colors">{l}</Link>
              ))}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-300">Balance v2.4 © 2026</p>
          </div>
        </aside>

      </div>
    </div>
  )
}