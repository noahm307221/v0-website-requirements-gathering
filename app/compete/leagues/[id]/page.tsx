"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { getLevel } from "@/lib/points"
import { ArrowLeft, Copy, Check, Trophy } from "lucide-react"
import { format } from "date-fns"

export default function LeagueDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [league, setLeague] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"table" | "results">("table")

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: league } = await supabase
        .from("leagues")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      if (!league) { router.push("/compete/leagues"); return }
      setLeague(league)

      const { data: memberData } = await supabase
        .from("league_members")
        .select("*")
        .eq("league_id", id)
        .order("total_points", { ascending: false })

      setMembers(memberData || [])

      const { data: matchData } = await supabase
        .from("match_results")
        .select("*")
        .eq("league_id", id)
        .order("played_at", { ascending: false })

      setMatches(matchData || [])

      const userIds = [
        ...new Set([
          ...(memberData || []).map((m: any) => m.user_id),
          ...(matchData || []).flatMap((m: any) => [m.winner_id, m.loser_id]),
        ])
      ]

      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds)

        const map: Record<string, any> = {}
        profileData?.forEach(p => { map[p.id] = p })
        setProfiles(map)
      }

      setLoading(false)
    }
    load()
  }, [id])

  function copyCode() {
    navigator.clipboard.writeText(league.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>
  if (!league) return null

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to leagues
      </button>

      {/* Header */}
      <div className="rounded-2xl border p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">{league.name}</h1>
            <p className="text-sm text-muted-foreground capitalize mb-2">{league.activity_type} league</p>
            {league.description && <p className="text-sm text-muted-foreground">{league.description}</p>}
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copied!" : `Invite: ${league.invite_code}`}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {(["table", "results"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "table" ? "League Table" : "Match Results"}
          </button>
        ))}
      </div>

      {/* League table */}
      {activeTab === "table" && (
        <div className="space-y-2">
          {members.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No members yet</p>
          ) : (
            members.map((member, index) => {
              const profile = profiles[member.user_id]
              const isMe = user?.id === member.user_id
              const level = getLevel(member.total_points || 0)
              const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : null

              return (
                <div
                  key={member.id}
                  className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${isMe ? "border-foreground bg-muted/30" : ""}`}
                >
                  <span className="text-lg w-8 text-center font-bold text-muted-foreground">
                    {medal ?? `#${index + 1}`}
                  </span>
                  <div className="size-9 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt={profile?.full_name} className="size-full object-cover" />
                      : <span className="text-sm font-medium">{profile?.full_name?.[0] ?? "?"}</span>
                    }
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {profile?.full_name ?? "Member"} {isMe && <span className="text-xs text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.matches_played || 0} played · {member.matches_won || 0} won · {level.emoji} {level.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{member.total_points || 0} pts</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Match results */}
      {activeTab === "results" && (
        <div className="space-y-3">
          {matches.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-2">No matches logged yet</p>
              <a href="/compete/log" className="text-sm underline">Log a match result</a>
            </div>
          ) : (
            matches.map(match => {
              const winner = profiles[match.winner_id]
              const loser = profiles[match.loser_id]
              return (
                <div key={match.id} className="rounded-2xl border px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">🏆 {winner?.full_name ?? "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">defeated {loser?.full_name ?? "Unknown"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {match.score && <p className="font-mono text-sm font-medium">{match.score}</p>}
                      <p className="text-xs text-muted-foreground">{format(new Date(match.played_at), "MMM d")}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
