"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { MapPin, Users, Lock, Globe, ArrowLeft, Send } from "lucide-react"

export default function GroupPage() {
  const { id } = useParams()
  const router = useRouter()
  const [group, setGroup] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [messages, setMessages] = useState<any[]>([])
  const [profiles, setProfiles] = useState<Record<string, any>>({})
  const [isMember, setIsMember] = useState(false)
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "members">("chat")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Load group
      const { data: group } = await supabase
        .from("groups")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      if (!group) { router.push("/community"); return }
      setGroup(group)

      // Load members
      const { data: memberData } = await supabase
        .from("group_members")
        .select("*")
        .eq("group_id", id)

      setMembers(memberData || [])

      if (user) {
        const member = memberData?.find(m => m.user_id === user.id)
        setIsMember(!!member)
        setIsOwner(member?.role === "owner")
      }

      // Load messages
      const { data: messageData } = await supabase
        .from("group_messages")
        .select("*")
        .eq("group_id", id)
        .order("created_at", { ascending: true })

      setMessages(messageData || [])

      // Load profiles for all users
      const userIds = [
        ...new Set([
          ...(memberData || []).map((m: any) => m.user_id),
          ...(messageData || []).map((m: any) => m.user_id),
        ])
      ]

      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds)

        const profileMap: Record<string, any> = {}
        profileData?.forEach(p => { profileMap[p.id] = p })
        setProfiles(profileMap)
      }

      setLoading(false)
    }

    load()

    // Real-time chat subscription
    const channel = supabase
      .channel(`group-${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "group_messages",
        filter: `group_id=eq.${id}`,
      }, async (payload) => {
        const newMsg = payload.new
        setMessages(prev => [...prev, newMsg])

        // Load profile for new message sender if not already loaded
        setProfiles(prev => {
          if (!prev[newMsg.user_id]) {
            supabase
              .from("profiles")
              .select("id, full_name, avatar_url")
              .eq("id", newMsg.user_id)
              .maybeSingle()
              .then(({ data }) => {
                if (data) setProfiles(p => ({ ...p, [data.id]: data }))
              })
          }
          return prev
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id])

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleJoin() {
    if (!user) { router.push("/auth/login"); return }
    setJoining(true)

    if (isMember) {
      await supabase.from("group_members").delete()
        .eq("group_id", id).eq("user_id", user.id)
      await supabase.from("groups").update({ member_count: (group.member_count || 1) - 1 }).eq("id", id)
      setIsMember(false)
      setMembers(prev => prev.filter(m => m.user_id !== user.id))
      setGroup((g: any) => ({ ...g, member_count: (g.member_count || 1) - 1 }))
    } else {
      await supabase.from("group_members").insert([{
        id: crypto.randomUUID(),
        group_id: id,
        user_id: user.id,
        role: "member",
        joined_at: new Date().toISOString(),
      }])
      await supabase.from("groups").update({ member_count: (group.member_count || 0) + 1 }).eq("id", id)
      setIsMember(true)
      setMembers(prev => [...prev, { user_id: user.id, role: "member" }])
      setGroup((g: any) => ({ ...g, member_count: (g.member_count || 0) + 1 }))
    }
    setJoining(false)
  }

  async function handleSendMessage() {
    if (!newMessage.trim() || !user || !isMember) return
    setSending(true)

    await supabase.from("group_messages").insert([{
      id: crypto.randomUUID(),
      group_id: id,
      user_id: user.id,
      message: newMessage.trim(),
      created_at: new Date().toISOString(),
    }])

    setNewMessage("")
    setSending(false)
  }

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>
  if (!group) return null

  const canSeeChat = group.is_public || isMember

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to groups
      </button>

      {/* Group header */}
      <div className="rounded-2xl border overflow-hidden mb-6">
        {group.image && (
          <div className="relative aspect-[3/1] overflow-hidden">
            <img src={group.image} alt={group.name} className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          </div>
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {group.is_public
                  ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Globe className="size-3" /> Public</span>
                  : <span className="flex items-center gap-1 text-xs text-muted-foreground"><Lock className="size-3" /> Private</span>
                }
                {group.category && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium capitalize">{group.category}</span>
                )}
              </div>
              <h1 className="text-2xl font-bold mb-1">{group.name}</h1>
              <p className="text-muted-foreground text-sm mb-3">{group.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="size-3.5" />{group.location}</span>
                <span className="flex items-center gap-1"><Users className="size-3.5" />{group.member_count || 0} members</span>
              </div>
            </div>

            {!isOwner && (
              <button
                onClick={handleJoin}
                disabled={joining}
                className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-opacity disabled:opacity-50 ${
                  isMember
                    ? "border border-border hover:bg-muted"
                    : "bg-foreground text-background hover:opacity-90"
                }`}
              >
                {joining ? "..." : isMember ? "Leave group" : "Join group"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b">
        {(["chat", "members"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? "border-foreground text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab} {tab === "members" && `(${members.length})`}
          </button>
        ))}
      </div>

      {/* Chat tab */}
      {activeTab === "chat" && (
        <div>
          {!canSeeChat ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lock className="size-8 mx-auto mb-3 opacity-50" />
              <p>This is a private group. Join to see the chat.</p>
            </div>
          ) : (
            <div className="rounded-2xl border overflow-hidden">
              {/* Messages */}
              <div className="h-[500px] overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-12">
                    No messages yet — be the first to say hello! 👋
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe = user?.id === msg.user_id
                    const profile = profiles[msg.user_id]
                    const name = profile?.full_name || "Member"
                    const showName = !isMe && (i === 0 || messages[i - 1]?.user_id !== msg.user_id)

                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        {showName && (
                          <span className="text-xs text-muted-foreground mb-1 ml-1">{name}</span>
                        )}
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                          isMe
                            ? "bg-foreground text-background rounded-br-sm"
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}>
                          {msg.message}
                        </div>
                        <span className="text-[0.7rem] text-muted-foreground mt-1 mx-1">
                          {format(new Date(msg.created_at), "HH:mm")}
                        </span>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message input */}
              {isMember ? (
                <div className="border-t p-3 flex gap-2">
                  <input
                    className="flex-1 rounded-xl border bg-background px-4 py-2 text-sm"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="rounded-xl bg-foreground text-background p-2.5 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Send className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="border-t p-3 text-center text-sm text-muted-foreground">
                  {user ? "Join this group to send messages" : (
                    <span>
                      <a href="/auth/login" className="underline">Log in</a> and join to chat
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Members tab */}
      {activeTab === "members" && (
        <div className="space-y-2">
          {members.map(member => {
            const profile = profiles[member.user_id]
            return (
              <div key={member.id} className="flex items-center gap-3 rounded-xl border px-4 py-3">
                <div className="size-9 rounded-full bg-muted overflow-hidden flex items-center justify-center">
                  {profile?.avatar_url
                    ? <img src={profile.avatar_url} alt={profile.full_name} className="size-full object-cover" />
                    : <span className="text-sm font-medium">{profile?.full_name?.[0] ?? "?"}</span>
                  }
                </div>
                <div>
                  <p className="text-sm font-medium">{profile?.full_name || "Member"}</p>
                  <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}