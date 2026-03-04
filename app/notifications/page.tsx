"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { Bell, Check } from "lucide-react"
import { acceptFriendRequest, rejectFriendRequest } from "@/lib/social"

export default function NotificationsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<any[]>([])
  const [friendRequests, setFriendRequests] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      setUser(user)

      const [notifRes, reqRes] = await Promise.all([
        supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
        supabase.from("friend_requests").select("*").eq("receiver_id", user.id).eq("status", "pending"),
      ])

      setNotifications(notifRes.data || [])

      if (reqRes.data && reqRes.data.length > 0) {
        const senderIds = reqRes.data.map(r => r.sender_id)
        const { data: profileData } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", senderIds)
        const map: Record<string, any> = {}
        profileData?.forEach(p => { map[p.id] = p })
        setProfiles(map)
        setFriendRequests(reqRes.data)
      }

      // Mark all as read
      await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false)

      setLoading(false)
    }
    load()
  }, [])

  async function handleAccept(req: any) {
    await acceptFriendRequest(req.id, req.sender_id, user.id)
    setFriendRequests(prev => prev.filter(r => r.id !== req.id))
  }

  async function handleReject(req: any) {
    await rejectFriendRequest(req.id)
    setFriendRequests(prev => prev.filter(r => r.id !== req.id))
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="size-6 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">Updates</p>
        <h1 className="text-3xl font-black tracking-tight">Notifications</h1>
      </div>

      {/* Friend requests */}
      {friendRequests.length > 0 && (
        <div className="rounded-2xl border p-4 mb-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Friend Requests · {friendRequests.length}</h2>
          <div className="space-y-3">
            {friendRequests.map(req => {
              const profile = profiles[req.sender_id]
              return (
                <div key={req.id} className="flex items-center gap-3">
                  <Link href={`/profile/${req.sender_id}`}>
                    <div className="size-10 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {profile?.avatar_url
                        ? <img src={profile.avatar_url} alt={profile.full_name} className="size-full object-cover" />
                        : <span className="text-sm font-medium">{profile?.full_name?.[0] ?? "?"}</span>
                      }
                    </div>
                  </Link>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{profile?.full_name ?? "Someone"}</p>
                    <p className="text-xs text-muted-foreground">wants to be friends</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAccept(req)} className="text-xs px-3 py-1.5 rounded-full bg-foreground text-background font-medium hover:opacity-90">Accept</button>
                    <button onClick={() => handleReject(req)} className="text-xs px-3 py-1.5 rounded-full border font-medium hover:bg-muted">Decline</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Notifications */}
      {notifications.length === 0 && friendRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Bell className="size-10 mx-auto mb-3 text-muted-foreground opacity-20" />
          <p className="text-sm font-semibold mb-1">All caught up</p>
          <p className="text-xs text-muted-foreground">Notifications will appear here</p>
        </div>
      ) : (
        <div className="rounded-2xl border divide-y">
          {notifications.map(notif => (
            <Link key={notif.id} href={notif.link || "#"}>
              <div className={`flex items-start gap-3 px-4 py-3 hover:bg-muted transition-colors ${!notif.read ? "bg-muted/50" : ""}`}>
                <div className={`size-2 rounded-full mt-1.5 shrink-0 ${!notif.read ? "bg-foreground" : "bg-transparent"}`} />
                <div className="flex-1">
                  <p className="text-sm">{notif.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(notif.created_at), "MMM d · HH:mm")}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
