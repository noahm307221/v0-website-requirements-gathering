"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { calculateActivityPoints, getCurrentWeek, getCurrentMonth, getCurrentYear, BADGES } from "@/lib/points"
import { ArrowLeft, Activity, MapPin, Clock, FileText, CheckCircle2, Medal, Zap, Trophy, Users } from "lucide-react"

const SPORTS = [
  { id: "running", label: "Running", emoji: "🏃", type: "manual" },
  { id: "cycling", label: "Cycling", emoji: "🚴", type: "manual" },
  { id: "swimming", label: "Swimming", emoji: "🏊", type: "manual" },
  { id: "padel", label: "Padel", emoji: "🎾", type: "match" },
  { id: "tennis", label: "Tennis", emoji: "🎾", type: "match" },
  { id: "crossfit", label: "CrossFit", emoji: "🏋️", type: "manual" },
  { id: "yoga", label: "Yoga", emoji: "🧘", type: "manual" },
  { id: "hiking", label: "Hiking", emoji: "🥾", type: "manual" },
]

export default function LogActivityPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  
  // Data for matches
  const [friends, setFriends] = useState<any[]>([])
  const [leagues, setLeagues] = useState<any[]>([])

  const [form, setForm] = useState({
    activity_type: "running",
    distance: "",
    duration_mins: "",
    notes: "",
    opponent_id: "",
    score: "",
    won: true,
    league_id: "",
  })

  // Derived state for UI
  const selectedSportObj = SPORTS.find(s => s.id === form.activity_type)
  const isMatch = selectedSportObj?.type === "match"

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      setUser(user)

      // Load user's leagues
      const { data: memberData } = await supabase
        .from("league_members")
        .select("league_id")
        .eq("user_id", user.id)

      if (memberData && memberData.length > 0) {
        const { data: leagueData } = await supabase
          .from("leagues")
          .select("*")
          .in("id", memberData.map(m => m.league_id))
        setLeagues(leagueData || [])
      }

      // Load profiles for opponent search
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .neq("id", user.id)
        .eq("is_public", true)
        .limit(50)
      setFriends(profiles || [])
    }
    load()
  }, [router])

  async function handleLog(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const logType = isMatch ? "match" : "manual"

    const points = calculateActivityPoints(
      form.activity_type,
      logType === "match" ? (form.won ? "match_win" : "match_loss") : "manual",
      form.distance ? parseFloat(form.distance) : undefined,
      form.duration_mins ? parseInt(form.duration_mins) : undefined,
    )

    const now = new Date().toISOString()

    // 1. Log the activity
    await supabase.from("activity_logs").insert([{
      id: crypto.randomUUID(),
      user_id: user.id,
      activity_type: form.activity_type,
      log_type: logType === "match" ? (form.won ? "match_win" : "match_loss") : "manual",
      distance: form.distance ? parseFloat(form.distance) : null,
      duration_mins: form.duration_mins ? parseInt(form.duration_mins) : null,
      points,
      notes: form.notes || null,
      logged_at: now,
    }])

    // 2. Log match result if applicable
    if (logType === "match" && form.opponent_id) {
      await supabase.from("match_results").insert([{
        id: crypto.randomUUID(),
        league_id: form.league_id || null,
        winner_id: form.won ? user.id : form.opponent_id,
        loser_id: form.won ? form.opponent_id : user.id,
        score: form.score,
        activity_type: form.activity_type,
        played_at: now,
        logged_by: user.id,
      }])

      // Update opponent points too
      const opponentPoints = calculateActivityPoints(form.activity_type, form.won ? "match_loss" : "match_win")
      await updateUserStats(form.opponent_id, form.activity_type, opponentPoints, true)

      // Update league member points if in a league
      if (form.league_id) {
        await updateLeagueMember(user.id, form.league_id, points, form.won)
        await updateLeagueMember(form.opponent_id, form.league_id, opponentPoints, !form.won)
      }
    }

    // 3. Update user stats
    await updateUserStats(user.id, form.activity_type, points, logType === "match")

    // 4. Check and award badges
    await checkBadges(user.id)

    setSuccessMsg(`Activity logged! You earned ${points} points 🎉`)
    
    // Redirect after brief delay
    setTimeout(() => {
      router.push("/compete")
    }, 2000)
  }

  // --- Backend Logic Helpers ---
  async function updateUserStats(userId: string, activityType: string, points: number, isMatchSport: boolean) {
    const month = getCurrentMonth()
    const year = getCurrentYear()
    const week = getCurrentWeek()

    const { data: existing } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", userId)
      .eq("activity_type", activityType)
      .maybeSingle()

    if (existing) {
      const lastWeek = existing.last_active_week
      const newStreak = lastWeek === week ? existing.streak_weeks :
        lastWeek === getPreviousWeek() ? (existing.streak_weeks || 0) + 1 : 1

      await supabase.from("user_stats").update({
        total_points: (existing.total_points || 0) + points,
        events_attended: isMatchSport ? existing.events_attended : (existing.events_attended || 0) + 1,
        matches_played: isMatchSport ? (existing.matches_played || 0) + 1 : existing.matches_played,
        matches_won: (isMatchSport && form.won) ? (existing.matches_won || 0) + 1 : existing.matches_won,
        streak_weeks: newStreak,
        last_active_week: week,
        month,
        year,
      }).eq("id", existing.id)
    } else {
      await supabase.from("user_stats").insert([{
        id: crypto.randomUUID(),
        user_id: userId,
        activity_type: activityType,
        total_points: points,
        events_attended: isMatchSport ? 0 : 1,
        matches_played: isMatchSport ? 1 : 0,
        matches_won: (isMatchSport && form.won) ? 1 : 0,
        streak_weeks: 1,
        last_active_week: week,
        month,
        year,
      }])
    }
  }

  async function updateLeagueMember(userId: string, leagueId: string, points: number, won: boolean) {
    const { data: existing } = await supabase
      .from("league_members")
      .select("*")
      .eq("league_id", leagueId)
      .eq("user_id", userId)
      .maybeSingle()

    if (existing) {
      await supabase.from("league_members").update({
        total_points: (existing.total_points || 0) + points,
        matches_played: (existing.matches_played || 0) + 1,
        matches_won: won ? (existing.matches_won || 0) + 1 : existing.matches_won,
      }).eq("id", existing.id)
    }
  }

  async function checkBadges(userId: string) {
    const { data: existing } = await supabase.from("user_badges").select("badge_id").eq("user_id", userId)
    const earnedIds = new Set(existing?.map(b => b.badge_id) || [])
    
    const { data: logs } = await supabase.from("activity_logs").select("*").eq("user_id", userId)
    const { data: wins } = await supabase.from("match_results").select("*").eq("winner_id", userId)

    const totalEvents = logs?.filter(l => l.log_type === "manual" || l.log_type === "event").length || 0
    const totalWins = wins?.length || 0
    const activityTypes = new Set(logs?.map(l => l.activity_type) || [])

    const newBadges = []
    if (!earnedIds.has("first_event") && totalEvents >= 1) newBadges.push("first_event")
    if (!earnedIds.has("five_events") && totalEvents >= 5) newBadges.push("five_events")
    if (!earnedIds.has("ten_events") && totalEvents >= 10) newBadges.push("ten_events")
    if (!earnedIds.has("first_win") && totalWins >= 1) newBadges.push("first_win")
    if (!earnedIds.has("five_wins") && totalWins >= 5) newBadges.push("five_wins")
    if (!earnedIds.has("all_rounder") && activityTypes.size >= 3) newBadges.push("all_rounder")

    if (newBadges.length > 0) {
      await supabase.from("user_badges").insert(
        newBadges.map(badge_id => ({
          id: crypto.randomUUID(),
          user_id: userId,
          badge_id,
          earned_at: new Date().toISOString(),
        }))
      )
    }
  }

  function getPreviousWeek(): string {
    const now = new Date()
    now.setDate(now.getDate() - 7)
    const start = new Date(now.getFullYear(), 0, 1)
    const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7)
    return `${now.getFullYear()}-W${week}`
  }
  // --- End Backend Logic Helpers ---

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans pb-24">
      
      {/* ── TOP NAV ── */}
      <div className="mx-auto max-w-2xl px-4 sm:px-6 pt-6 pb-4">
        <button 
          onClick={() => router.back()} 
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100"
        >
          <ArrowLeft className="size-4" /> Cancel
        </button>
      </div>

      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        
        {successMsg ? (
          <div className="bg-white rounded-[2rem] p-12 text-center shadow-sm border border-slate-100 mt-10 animate-in zoom-in-95 duration-300">
            <div className="size-20 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="size-10" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Activity Logged!</h1>
            <p className="text-lg font-bold text-teal-600 bg-teal-50 py-2 px-4 rounded-full inline-block mt-2">
              {successMsg}
            </p>
          </div>
        ) : (
          <form onSubmit={handleLog} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="mb-8">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Log your hustle.</h1>
              <p className="text-lg text-slate-500 font-medium">Record your workouts and claim your leaderboard points.</p>
            </div>

            <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-sm border border-slate-100 space-y-8">
              
              {/* 1. Select Sport */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-4 ml-1">What did you do?</label>
                <div className="flex gap-3 overflow-x-auto pb-4 snap-x px-1" style={{ scrollbarWidth: "none" }}>
                  {SPORTS.map(sport => (
                    <button
                      key={sport.id}
                      type="button"
                      onClick={() => setForm({...form, activity_type: sport.id})}
                      className={`shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl border-2 font-bold text-sm transition-all snap-start ${
                        form.activity_type === sport.id 
                          ? "border-teal-500 bg-teal-50 text-teal-900 shadow-sm" 
                          : "border-slate-100 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-xl">{sport.emoji}</span> {sport.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Dynamic Inputs based on Sport */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                
                {/* Duration (Always show) */}
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2 ml-1">
                    <Clock className="size-4 text-teal-600" /> Duration (Mins)
                  </label>
                  <input 
                    type="number"
                    placeholder="e.g. 45"
                    value={form.duration_mins}
                    onChange={(e) => setForm({...form, duration_mins: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all"
                  />
                </div>

                {/* Distance (Only if not a match) */}
                {!isMatch && (
                  <div className="animate-in fade-in zoom-in-95">
                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2 ml-1">
                      <MapPin className="size-4 text-teal-600" /> Distance (km)
                    </label>
                    <input 
                      type="number"
                      step="0.01"
                      placeholder="e.g. 5.2"
                      value={form.distance}
                      onChange={(e) => setForm({...form, distance: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all"
                    />
                  </div>
                )}

                {/* Match Specific Fields */}
                {isMatch && (
                  <>
                    <div className="animate-in fade-in zoom-in-95">
                      <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2 ml-1">
                        <Users className="size-4 text-teal-600" /> Opponent
                      </label>
                      <select
                        required
                        value={form.opponent_id}
                        onChange={(e) => setForm({ ...form, opponent_id: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base font-bold text-slate-900 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all"
                      >
                        <option value="">Select opponent...</option>
                        {friends.map(f => (
                          <option key={f.id} value={f.id}>{f.full_name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="animate-in fade-in zoom-in-95">
                      <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2 ml-1">
                        <Trophy className="size-4 text-teal-600" /> Score
                      </label>
                      <input
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all"
                        placeholder="e.g. 6-3, 6-4"
                        value={form.score}
                        onChange={(e) => setForm({ ...form, score: e.target.value })}
                      />
                    </div>

                    <div className="animate-in fade-in zoom-in-95 sm:col-span-2">
                      <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-3 ml-1">
                        <Medal className="size-4 text-teal-600" /> Match Outcome
                      </label>
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setForm({...form, won: true})} className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${form.won ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm" : "border-slate-100 bg-white text-slate-400 hover:border-slate-300"}`}>🏆 I Won</button>
                        <button type="button" onClick={() => setForm({...form, won: false})} className={`flex-1 py-3 rounded-xl border-2 font-bold transition-all ${!form.won ? "border-rose-500 bg-rose-50 text-rose-700 shadow-sm" : "border-slate-100 bg-white text-slate-400 hover:border-slate-300"}`}>😅 I Lost</button>
                      </div>
                    </div>
                  </>
                )}
                
                {/* League Selection (Always available) */}
                {leagues.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2 ml-1">
                      <Trophy className="size-4 text-teal-600" /> Link to League (Optional)
                    </label>
                    <select
                      value={form.league_id}
                      onChange={(e) => setForm({ ...form, league_id: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-base font-bold text-slate-900 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all"
                    >
                      <option value="">Do not link to league</option>
                      {leagues.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 3. Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 mb-2 ml-1">
                  <FileText className="size-4 text-teal-600" /> Notes (Optional)
                </label>
                <textarea 
                  placeholder="Felt great! Beautiful weather today..."
                  value={form.notes}
                  onChange={(e) => setForm({...form, notes: e.target.value})}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-base font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all resize-none"
                />
              </div>

            </div>

            <div className="mt-8">
              <button 
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-teal-600 text-white px-8 py-5 text-lg font-black shadow-md hover:bg-teal-700 hover:-translate-y-0.5 transition-all disabled:opacity-50"
              >
                {loading ? "Saving..." : "Log Activity"} <Zap className="size-5 text-amber-300" />
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  )
}

