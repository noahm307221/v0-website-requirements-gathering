"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Trophy, Plus, Copy, Check } from "lucide-react"

export default function LeaguesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [leagues, setLeagues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [inviteCode, setInviteCode] = useState("")
  const [joinError, setJoinError] = useState("")
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", activity_type: "padel", description: "" })

  const ACTIVITIES = ["padel", "tennis", "running", "cycling", "swimming", "crossfit", "hiking", "yoga", "mixed"]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      setUser(user)

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
      setLoading(false)
    }
    load()
  }, [])

  async function handleCreate() {
    if (!form.name.trim()) return
    setCreating(true)

    const leagueId = crypto.randomUUID()
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    await supabase.from("leagues").insert([{
      id: leagueId,
      name: form.name,
      activity_type: form.activity_type,
      description: form.description,
      created_by: user.id,
      invite_code: inviteCode,
      created_at: new Date().toISOString(),
    }])

    await supabase.from("league_members").insert([{
      id: crypto.randomUUID(),
      league_id: leagueId,
      user_id: user.id,
      total_points: 0,
      matches_won: 0,
      matches_played: 0,
      joined_at: new Date().toISOString(),
    }])

    router.push(`/compete/leagues/${leagueId}`)
  }

  async function handleJoin() {
    setJoinError("")
    if (!inviteCode.trim()) return

    const { data: league } = await supabase
      .from("leagues")
      .select("*")
      .eq("invite_code", inviteCode.toUpperCase())
      .maybeSingle()

    if (!league) { setJoinError("Invalid invite code"); return }

    const { data: existing } = await supabase
      .from("league_members")
      .select("id")
      .eq("league_id", league.id)
      .eq("user_id", user.id)
      .maybeSingle()

    if (existing) { setJoinError("You're already in this league"); return }

    await supabase.from("league_members").insert([{
      id: crypto.randomUUID(),
      league_id: league.id,
      user_id: user.id,
      total_points: 0,
      matches_won: 0,
      matches_played: 0,
      joined_at: new Date().toISOString(),
    }])

    router.push(`/compete/leagues/${league.id}`)
  }

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="mb-3 text-[0.8rem] font-medium uppercase tracking-widest text-muted-foreground">Compete</p>
          <h1 className="text-3xl font-bold tracking-tight inline-block">My <span className="font-serif italic text-accent">Leagues</span></h1>
          <p className="mt-3 text-muted-foreground">Create private leagues with friends and track your head-to-head results.</p>
        </div>
        <Link 
          href="/compete/leagues/create" 
          className="flex items-center gap-2 rounded-full bg-teal-600 text-white px-6 py-3 text-sm font-bold shadow-md hover:bg-teal-700 hover:-translate-y-0.5 transition-all"
        >
          <Plus className="size-4" />
          Create League
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 mb-10">
        {/* Create league */}
        <div className="rounded-2xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Plus className="size-4" /> Create League</h2>
          <div className="space-y-3">
            <input
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
              placeholder="League name (e.g. Office Padel League)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
              value={form.activity_type}
              onChange={(e) => setForm({ ...form, activity_type: e.target.value })}
            >
              {ACTIVITIES.map(a => (
                <option key={a} value={a} className="capitalize">{a}</option>
              ))}
            </select>
            <input
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
              placeholder="Description (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !form.name.trim()}
              className="w-full rounded-xl bg-foreground text-background py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create League"}
            </button>
          </div>
        </div>

        {/* Join league */}
        <div className="rounded-2xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Trophy className="size-4" /> Join League</h2>
          <p className="text-sm text-muted-foreground mb-3">Enter an invite code from a friend to join their league.</p>
          <div className="space-y-3">
            <input
              className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm uppercase tracking-widest"
              placeholder="INVITE CODE"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
            />
            {joinError && <p className="text-sm text-destructive">{joinError}</p>}
            <button
              onClick={handleJoin}
              disabled={joining || !inviteCode.trim()}
              className="w-full rounded-xl bg-foreground text-background py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              Join League
            </button>
          </div>
        </div>
      </div>

      {/* My leagues */}
      <h2 className="font-semibold mb-4">My Leagues ({leagues.length})</h2>
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : leagues.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trophy className="size-10 mx-auto mb-3 opacity-30" />
          <p>No leagues yet — create one or ask a friend for their invite code!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {leagues.map(league => (
            <div key={league.id} className="flex items-center justify-between rounded-xl border px-4 py-3">
              <Link href={`/compete/leagues/${league.id}`} className="flex-1">
                <p className="font-medium">{league.name}</p>
                <p className="text-sm text-muted-foreground capitalize">{league.activity_type}</p>
              </Link>
              <button
                onClick={() => copyCode(league.invite_code, league.id)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
              >
                {copiedId === league.id ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copiedId === league.id ? "Copied!" : league.invite_code}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
