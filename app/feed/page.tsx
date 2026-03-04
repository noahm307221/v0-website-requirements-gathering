"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { User, Users, Search } from "lucide-react"
import { followUser, unfollowUser, sendFriendRequest, getFollowStatus } from "@/lib/social"

export default function FeedPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [feed, setFeed] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [followStatuses, setFollowStatuses] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      setUser(user)

      // Get who I follow
      const { data: follows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id)

      const followingIds = follows?.map(f => f.following_id) || []

      // Build feed from activity_logs + registrations of people I follow
      if (followingIds.length > 0) {
        const [logsRes, regsRes, badgesRes] = await Promise.all([
          supabase.from("activity_logs").select("*").in("user_id", followingIds).order("logged_at", { ascending: false }).limit(20),
          supabase.from("registrations").select("*, events(title, date, location, image)").in("user_id", followingIds).order("registered_at", { ascending: false }).limit(10),
          supabase.from("user_badges").select("*").in("user_id", followingIds).order("earned_at", { ascending: false }).limit(10),
        ])

        // Get profiles
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", followingIds)
        const profileMap: Record<string, any> = {}
        profiles?.forEach(p => { profileMap[p.id] = p })

        // Merge into feed items
        const feedItems = [
          ...(logsRes.data || []).map(log => ({
            id: `log-${log.id}`, type: "activity", timestamp: log.logged_at,
            user: profileMap[log.user_id], userId: log.user_id, data: log,
          })),
          ...(regsRes.data || []).map(reg => ({
            id: `reg-${reg.id}`, type: "registration", timestamp: reg.registered_at,
            user: profileMap[reg.user_id], userId: reg.user_id, data: reg,
          })),
          ...(badgesRes.data || []).map(badge => ({
            id: `badge-${badge.id}`, type: "badge", timestamp: badge.earned_at,
            user: profileMap[badge.user_id], userId: badge.user_id, data: badge,
          })),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        setFeed(feedItems)
      }

      // People you might know — public profiles not yet followed
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, location, favourite_categories")
        .eq("is_public", true)
        .neq("id", user.id)
        .limit(20)

      const notFollowing = (allProfiles || []).filter(p => !followingIds.includes(p.id))
      setSuggestions(notFollowing.slice(0, 6))

      // Load follow statuses for suggestions
      const statuses: Record<string, any> = {}
      await Promise.all(notFollowing.slice(0, 6).map(async p => {
        statuses[p.id] = await getFollowStatus(user.id, p.id)
      }))
      setFollowStatuses(statuses)

      setLoading(false)
    }
    load()
  }, [])

  async function handleSearch(q: string) {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    const { data } = await supabase.from("profiles").select("id, full_name, avatar_url, location").ilike("full_name", `%${q}%`).eq("is_public", true).limit(8)
    const results = (data || []).filter(p => p.id !== user?.id)
    setSearchResults(results)

    const statuses: Record<string, any> = {}
    await Promise.all(results.map(async p => {
      statuses[p.id] = await getFollowStatus(user.id, p.id)
    }))
    setFollowStatuses(prev => ({ ...prev, ...statuses }))
  }

  async function handleFollow(targetId: string) {
    if (!user) return
    const status = followStatuses[targetId]
    if (status?.isFollowing) {
      await unfollowUser(user.id, targetId)
      setFollowStatuses(prev => ({ ...prev, [targetId]: { ...prev[targetId], isFollowing: false } }))
    } else {
      await followUser(user.id, targetId)
      setFollowStatuses(prev => ({ ...prev, [targetId]: { ...prev[targetId], isFollowing: true } }))
    }
  }

  async function handleFriendRequest(targetId: string) {
    if (!user) return
    await sendFriendRequest(user.id, targetId)
    setFollowStatuses(prev => ({ ...prev, [targetId]: { ...prev[targetId], friendRequest: { status: "pending", sender_id: user.id } } }))
  }

  const ACTIVITY_ICONS: Record<string, string> = {
    running: "↗", cycling: "⟳", swimming: "≋", hiking: "△",
    crossfit: "✕", padel: "◎", tennis: "◎", yoga: "☽",
  }

  const BADGE_EMOJIS: Record<string, string> = {
    first_event: "👟", five_events: "🔥", ten_events: "💪",
    first_win: "🏆", five_wins: "🎯", explorer: "🌍", streaker: "📅", all_rounder: "⭐"
  }

  function FeedCard({ item }: { item: any }) {
    const name = item.user?.full_name || "Someone"
    const avatar = item.user?.avatar_url

    return (
      <div className="flex gap-3 py-4 border-b last:border-0">
        <Link href={`/profile/${item.userId}`} className="shrink-0">
          <div className="size-9 rounded-full bg-muted overflow-hidden flex items-center justify-center">
            {avatar ? <img src={avatar} alt={name} className="size-full object-cover" /> : <User className="size-4 text-muted-foreground" />}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          {item.type === "activity" && (
            <>
              <p className="text-sm">
                <Link href={`/profile/${item.userId}`} className="font-semibold hover:underline">{name}</Link>
                <span className="text-muted-foreground"> logged a </span>
                <span className="font-medium capitalize">{item.data.activity_type}</span>
                {item.data.distance ? <span className="text-muted-foreground"> · {item.data.distance}km</span> : ""}
                {item.data.duration_mins ? <span className="text-muted-foreground"> · {item.data.duration_mins}min</span> : ""}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-green-600 font-semibold">+{item.data.points} pts</span>
                <span className="text-xs text-muted-foreground">{format(new Date(item.timestamp), "MMM d · HH:mm")}</span>
              </div>
            </>
          )}
          {item.type === "registration" && item.data.events && (
            <>
              <p className="text-sm">
                <Link href={`/profile/${item.userId}`} className="font-semibold hover:underline">{name}</Link>
                <span className="text-muted-foreground"> registered for </span>
                <Link href={`/events/${item.data.event_id}`} className="font-medium hover:underline">{item.data.events.title}</Link>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{item.data.events.location} · {format(new Date(item.timestamp), "MMM d")}</p>
            </>
          )}
          {item.type === "badge" && (
            <>
              <p className="text-sm">
                <Link href={`/profile/${item.userId}`} className="font-semibold hover:underline">{name}</Link>
                <span className="text-muted-foreground"> earned a badge </span>
                <span>{BADGE_EMOJIS[item.data.badge_id] ?? "🏅"}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{format(new Date(item.timestamp), "MMM d")}</p>
            </>
          )}
        </div>
      </div>
    )
  }

  function PersonCard({ profile }: { profile: any }) {
    const status = followStatuses[profile.id]
    return (
      <div className="flex items-center gap-3 py-3 border-b last:border-0">
        <Link href={`/profile/${profile.id}`} className="shrink-0">
          <div className="size-10 rounded-full bg-muted overflow-hidden flex items-center justify-center">
            {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name} className="size-full object-cover" /> : <User className="size-4 text-muted-foreground" />}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${profile.id}`}>
            <p className="text-sm font-semibold hover:underline truncate">{profile.full_name}</p>
          </Link>
          <p className="text-xs text-muted-foreground">{profile.location || "No location"}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {!status?.isFriend && !status?.friendRequest && (
            <button
              onClick={() => handleFriendRequest(profile.id)}
              className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors font-medium"
            >
              + Friend
            </button>
          )}
          {status?.friendRequest?.status === "pending" && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground">Pending</span>
          )}
          {status?.isFriend && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-muted text-muted-foreground">Friends</span>
          )}
          <button
            onClick={() => handleFollow(profile.id)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              status?.isFollowing
                ? "bg-muted text-muted-foreground hover:bg-muted"
                : "bg-foreground text-background hover:opacity-90"
            }`}
          >
            {status?.isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="size-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Social</p>
        <h1 className="text-3xl font-black tracking-tight">Feed</h1>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          className="w-full rounded-xl border bg-background pl-9 pr-4 py-2.5 text-sm"
          placeholder="Find people to follow..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="rounded-2xl border p-4 mb-8">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Results</h2>
          {searchResults.map(p => <PersonCard key={p.id} profile={p} />)}
        </div>
      )}

      <div className="grid sm:grid-cols-[1fr_280px] gap-8">
        {/* Feed */}
        <div>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Activity</h2>
          {feed.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-10 text-center">
              <Users className="size-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-sm font-semibold mb-1">Nothing here yet</p>
              <p className="text-xs text-muted-foreground mb-4">Follow people to see their activity, events and badges</p>
            </div>
          ) : (
            <div className="rounded-2xl border px-4">
              {feed.map(item => <FeedCard key={item.id} item={item} />)}
            </div>
          )}
        </div>

        {/* Suggestions sidebar */}
        {suggestions.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">People you may know</h2>
            <div className="rounded-2xl border px-4">
              {suggestions.map(p => <PersonCard key={p.id} profile={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
