"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { getLevel } from "@/lib/points"
import { ArrowLeft, Trophy, Activity, Users, Copy, CheckCircle2, Medal, Crown } from "lucide-react"

export default function LeagueDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const leagueId = params.id as string

  const [user, setUser] = useState<any>(null)
  const [league, setLeague] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"leaderboard" | "activity">("leaderboard")
  const [copied, setCopied] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    async function fetchLeagueData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // 1. Fetch League Details
      const { data: leagueData } = await supabase
        .from("leagues")
        .select("*")
        .eq("id", leagueId)
        .single()
      
      setLeague(leagueData)

      // 2. Fetch Members & Profiles
      if (leagueData) {
        const { data: memberData } = await supabase
          .from("league_members")
          .select("*, profiles(id, full_name, avatar_url)")
          .eq("league_id", leagueId)
          .order("total_points", { ascending: false })

        if (memberData) {
          setMembers(memberData)
          if (user) {
            setIsMember(memberData.some(m => m.user_id === user.id))
          }
        }
      }

      setLoading(false)
    }

    fetchLeagueData()
  }, [leagueId])

  async function handleJoinLeague() {
    if (!user) {
      router.push("/auth/login")
      return
    }
    setJoining(true)
    const { error } = await supabase
      .from("league_members")
      .insert({
        league_id: leagueId,
        user_id: user.id,
        total_points: 0,
        matches_played: 0,
        matches_won: 0
      })

    if (!error) {
      setIsMember(true)
      // Optimistically reload page to get fresh profile data in the list
      window.location.reload() 
    } else {
      alert("Could not join the league. You might already be a member!")
      setJoining(false)
    }
  }

  function copyInviteLink() {
    // Generate a clean invite link using the current URL
    const inviteUrl = `${window.location.origin}/compete/leagues/${leagueId}?join=true`
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh] bg-slate-50/50">
      <div className="size-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
    </div>
  )

  if (!league) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-black text-slate-800 mb-4">League not found</h1>
      <Link href="/compete" className="text-teal-600 font-bold hover:underline">← Back to Compete</Link>
    </div>
  )

  const sportsList = league.activity_type ? league.activity_type.split(",") : []

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans pb-24">
      
      {/* ── TOP NAV ── */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-6 pb-4">
        <Link href="/compete" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
          <ArrowLeft className="size-4" /> Back to Rankings
        </Link>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        
        {/* ── LEAGUE HEADER (BENTO CARD) ── */}
        <div className="bg-white rounded-[2rem] p-6 sm:p-10 shadow-sm border border-slate-100 mb-8 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 size-40 bg-teal-50 rounded-full blur-3xl" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {/* Public/Private badge */}
                {league.is_public ? (
                  <span className="flex items-center gap-1.5 bg-teal-50 text-teal-700 px-3 py-1 rounded-full text-xs font-bold border border-teal-100"><svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg> Public</span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200"><svg className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="10" width="12" height="8" rx="2" /><path d="M9 10V8a3 3 0 1 1 6 0v2" /></svg> Private</span>
                )}
                {sportsList.map((sport: string) => (
                  <span key={sport} className="bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                    {sport}
                  </span>
                ))}
                {league.scoring_mode && (
                  <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                    {league.scoring_mode} scoring
                  </span>
                )}
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight mb-3">
                {league.name}
              </h1>
              
              <p className="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">
                {league.description || "A private league for everyday athletes to track progress and compete."}
              </p>
            </div>

            <div className="flex flex-col gap-3 shrink-0">
              {isMember ? (
                <button 
                  onClick={copyInviteLink}
                  className="flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-slate-700 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50 transition-all shadow-sm w-full md:w-auto"
                >
                  {copied ? <CheckCircle2 className="size-4.5 text-teal-600" /> : <Copy className="size-4.5" />}
                  {copied ? "Link Copied!" : "Invite Friends"}
                </button>
              ) : league.is_public || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("join") === "true") ? (
                <button 
                  onClick={handleJoinLeague}
                  disabled={joining}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-teal-600 text-white px-8 py-4 text-base font-bold shadow-md hover:bg-teal-700 hover:-translate-y-0.5 transition-all disabled:opacity-50 w-full md:w-auto"
                >
                  {joining ? "Joining..." : "Join this League"}
                </button>
              ) : (
                <div className="flex items-center gap-2 bg-slate-100 text-slate-600 px-6 py-3.5 rounded-2xl text-sm font-bold border border-slate-200">
                  <svg className="size-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="6" y="10" width="12" height="8" rx="2" /><path d="M9 10V8a3 3 0 1 1 6 0v2" /></svg> Private League (Invite Only)
                </div>
              )}
            </div>
          </div>
          
          {/* League Stats Footer */}
          <div className="relative z-10 mt-8 pt-6 border-t border-slate-100 flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="size-5 text-teal-600" />
              <span className="font-bold">{members.length} {members.length === 1 ? "Member" : "Members"}</span>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2 text-slate-600">
              <Trophy className="size-5 text-amber-500" />
              <span className="font-bold">Active Season</span>
            </div>
          </div>
        </div>

        {/* ── TABS ── */}
        <div className="flex gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-px" style={{ scrollbarWidth: "none" }}>
          {[
            { id: "leaderboard", label: "League Table", icon: Crown },
            { id: "activity", label: "Match Results", icon: Activity },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-black transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? "border-teal-500 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <tab.icon className="size-4.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT: LEADERBOARD ── */}
        {activeTab === "leaderboard" && (
          <div className="space-y-3">
            {members.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100">
                <p className="text-slate-500 font-medium">No one has joined this league yet.</p>
              </div>
            ) : (
              members.map((member, index) => {
                const isMe = user?.id === member.user_id
                const level = getLevel(member.total_points)
                
                // Top 3 Medal Styling
                const isFirst = index === 0 && member.total_points > 0;
                const isSecond = index === 1 && member.total_points > 0;
                const isThird = index === 2 && member.total_points > 0;
                
                let rankStyle = "bg-slate-100 text-slate-500 border-slate-200";
                if (isFirst) rankStyle = "bg-amber-100 text-amber-600 border-amber-200";
                if (isSecond) rankStyle = "bg-slate-200 text-slate-600 border-slate-300";
                if (isThird) rankStyle = "bg-orange-100 text-orange-600 border-orange-200";

                return (
                  <div key={member.user_id} className={`flex items-center gap-4 rounded-[1.5rem] border p-4 sm:p-5 transition-all duration-300 hover:shadow-sm ${
                    isMe 
                      ? "border-teal-300 bg-teal-50/30" 
                      : "border-slate-100 bg-white"
                  }`}>
                    
                    {/* Rank Number/Medal */}
                    <div className={`size-10 sm:size-12 shrink-0 rounded-2xl flex items-center justify-center font-black text-lg border ${rankStyle}`}>
                      {isFirst ? "1" : isSecond ? "2" : isThird ? "3" : index + 1}
                    </div>

                    {/* Avatar */}
                    <Link href={`/profile/${member.user_id}`} className="size-12 sm:size-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 hover:ring-2 hover:ring-teal-300 transition-all">
                      {member.profiles?.avatar_url
                        ? <img src={member.profiles.avatar_url} alt="" className="size-full object-cover" />
                        : <span className="text-lg font-bold text-slate-400">{member.profiles?.full_name?.[0] ?? "?"}</span>
                      }
                    </Link>

                    {/* Name & Details */}
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-bold text-slate-800 text-base sm:text-lg truncate">
                        <Link href={`/profile/${member.user_id}`} className="hover:text-teal-600 transition-colors">
                          {member.profiles?.full_name ?? "Unknown Athlete"}
                        </Link>
                        {isMe && <span className="ml-2 text-xs font-black uppercase tracking-widest text-teal-600 bg-teal-100 px-2 py-0.5 rounded-md">You</span>}
                      </p>
                      <p className="text-sm font-medium text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                        <span className="text-base">{level.emoji}</span> {level.name} 
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <p className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${isFirst ? "text-amber-500" : isMe ? "text-teal-600" : "text-slate-800"}`}>
                        {member.total_points.toLocaleString()} <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">pts</span>
                      </p>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                        {member.matches_played} Played <span className="hidden sm:inline">· {member.matches_won} Won</span>
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── TAB CONTENT: ACTIVITY ── */}
        {activeTab === "activity" && (
          <div className="bg-white rounded-[2rem] p-10 text-center shadow-sm border border-slate-100">
             <Activity className="size-12 text-slate-200 mx-auto mb-4" />
             <h3 className="text-xl font-black text-slate-800 mb-2">No matches logged yet</h3>
             <p className="text-slate-500 font-medium max-w-sm mx-auto">
               Once members start logging workouts and playing matches in these sports, they will appear here.
             </p>
             <Link href="/compete/log" className="inline-block mt-6 rounded-full bg-teal-600 text-white px-8 py-3 text-sm font-bold hover:bg-teal-700 shadow-sm transition-all">
               Log an Activity
             </Link>
          </div>
        )}

      </div>
    </div>
  )
}
