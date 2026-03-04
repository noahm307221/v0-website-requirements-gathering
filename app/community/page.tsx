"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { MapPin, Users, Lock, Globe, Plus, Search, UsersRound, Activity, MessageCircle, Sparkles, UserPlus, ChevronLeft, Send, CheckCircle2 } from "lucide-react"

const CATEGORIES = ["all", "padel", "running", "yoga", "tennis", "cycling", "crossfit", "swimming", "hiking"]
const TABS = ["pulse", "communities", "messages"] as const
type Tab = typeof TABS[number]

export default function CommunityPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("pulse")
  
  // Data States
  const [groups, setGroups] = useState<any[]>([])
  const [friendActivity, setFriendActivity] = useState<any[]>([])
  const [suggestedPeople, setSuggestedPeople] = useState<any[]>([])
  
  // Search States
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // Messaging States
  const [messages, setMessages] = useState<any[]>([])
  const [chatProfiles, setChatProfiles] = useState<Record<string, any>>({})
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState("")
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // URL Tab Linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedTab = params.get("tab") as Tab
    if (requestedTab && TABS.includes(requestedTab)) {
      setActiveTab(requestedTab)
    }
  }, [])

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Fetch Groups
      const { data: groupData } = await supabase.from("groups").select("*").order("created_at", { ascending: false })
      setGroups(groupData || [])

      if (user) {
        // Fetch Follows & Activity
        const { data: followsRes } = await supabase.from("follows").select("following_id").eq("follower_id", user.id)
        const followingIds = followsRes?.map(f => f.following_id) || []
        
        if (followingIds.length > 0) {
          const [logsRes, friendRegsRes] = await Promise.all([
            supabase.from("activity_logs").select("*").in("user_id", followingIds).order("logged_at", { ascending: false }).limit(15),
            supabase.from("registrations").select("*, events(title, date, location)").in("user_id", followingIds).order("registered_at", { ascending: false }).limit(15),
          ])
          const { data: friendProfiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", followingIds)
          const pMap: Record<string, any> = {}
          friendProfiles?.forEach(p => { pMap[p.id] = p })
          
          const combinedActivity = [
            ...(logsRes.data || []).map(l => ({ type: "log", timestamp: l.logged_at, profile: pMap[l.user_id], userId: l.user_id, data: l })),
            ...(friendRegsRes.data || []).map(r => ({ type: "reg", timestamp: r.registered_at, profile: pMap[r.user_id], userId: r.user_id, data: r })),
          ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20)
          
          setFriendActivity(combinedActivity)
        }

        // Fetch Suggested People
        const { data: suggestions } = await supabase.from("profiles").select("id, full_name, avatar_url, location, favourite_categories").eq("is_public", true).neq("id", user.id).limit(20)
        setSuggestedPeople((suggestions || []).filter(p => !followingIds.includes(p.id)).slice(0, 8))

        // Fetch Messages & Associated Profiles
        fetchMessages(user.id)
      }

      setLoading(false)
    }
    loadData()
  }, [])

  // Real-time listener for new messages
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel("realtime_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMsg = payload.new
        // If message is relevant to us, add to state
        if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
          setMessages((prev) => [...prev, newMsg])
          // Auto-scroll to bottom if looking at chat
          setTimeout(() => {
            chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' })
          }, 100)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  async function fetchMessages(userId: string) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: true }) // Earliest first so we can map them top-to-bottom

    if (msgs) {
      setMessages(msgs)
      
      // Extract unique user IDs of people we are chatting with
      const otherUserIds = [...new Set(msgs.map(m => m.sender_id === userId ? m.receiver_id : m.sender_id))]
      
      // Fetch their profiles
      if (otherUserIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", otherUserIds)
        const pMap: Record<string, any> = {}
        profiles?.forEach(p => { pMap[p.id] = p })
        setChatProfiles(pMap)
      }
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!newMessage.trim() || !selectedChatUser || !user) return

    const tempMessage = {
      id: "temp-" + Date.now(),
      sender_id: user.id,
      receiver_id: selectedChatUser.id,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      read: false
    }

    // Optimistic UI update
    setMessages(prev => [...prev, tempMessage])
    setNewMessage("")
    
    setTimeout(() => {
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)

    // Send to DB
    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedChatUser.id,
      content: tempMessage.content
    })
  }

  function startChatWith(person: any) {
    // If we haven't loaded their profile in the chat dictionary yet, add it
    if (!chatProfiles[person.id]) {
      setChatProfiles(prev => ({ ...prev, [person.id]: person }))
    }
    setSelectedChatUser(person)
    setActiveTab("messages")
    setTimeout(() => {
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight })
    }, 50)
  }

  // --- Derived Data for UI ---

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase()) || g.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === "all" || g.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Group messages into an Inbox List (Latest message per user)
  const inboxConversations = useMemo(() => {
    if (!user) return []
    const latestMsgs: Record<string, any> = {}
    
    messages.forEach(msg => {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
      // Replace if it's newer
      if (!latestMsgs[otherId] || new Date(msg.created_at) > new Date(latestMsgs[otherId].created_at)) {
        latestMsgs[otherId] = msg
      }
    })

    return Object.values(latestMsgs)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(msg => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
        const profile = chatProfiles[otherId] || { full_name: "Unknown", avatar_url: null }
        return { profile, id: otherId, lastMessage: msg.content, time: msg.created_at, isUnread: !msg.read && msg.receiver_id === user.id }
      })
  }, [messages, chatProfiles, user])

  // Get active chat messages
  const activeMessages = selectedChatUser 
    ? messages.filter(m => (m.sender_id === user?.id && m.receiver_id === selectedChatUser.id) || (m.sender_id === selectedChatUser.id && m.receiver_id === user?.id))
    : []


  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh] bg-slate-50/50">
      <div className="size-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans pb-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-16">
        
        {/* ── BOLD HEADER ── */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <p className="mb-3 text-sm font-bold uppercase tracking-widest text-teal-600">Connect</p>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl mb-4">
              Social{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">
                Hub.
              </span>
            </h1>
            <p className="max-w-xl text-lg font-medium leading-relaxed text-slate-500">
              Catch up with friends, chat with your communities, and discover new athletes.
            </p>
          </div>
          {user && activeTab === "communities" && (
            <Link
              href="/community/create"
              className="flex items-center justify-center gap-2 rounded-full bg-teal-600 text-white px-8 py-4 text-base font-bold hover:bg-teal-700 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 shrink-0"
            >
              <Plus className="size-5" />
              Start a Community
            </Link>
          )}
          {user && activeTab === "messages" && !selectedChatUser && (
            <button onClick={() => setActiveTab("pulse")} className="flex items-center justify-center gap-2 rounded-full bg-teal-600 text-white px-8 py-4 text-base font-bold hover:bg-teal-700 shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 shrink-0">
              <UserPlus className="size-5" />
              Find People
            </button>
          )}
        </div>

        {/* ── NAVIGATION TABS ── */}
        <div className="flex gap-2 border-b border-slate-200 mb-8 overflow-x-auto pb-px" style={{ scrollbarWidth: "none" }}>
          {[
            { id: "pulse", label: "The Pulse", icon: Activity },
            { id: "communities", label: "Communities", icon: UsersRound },
            { id: "messages", label: "Messages", icon: MessageCircle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as Tab)
                if (tab.id !== "messages") setSelectedChatUser(null) // Reset chat view if leaving
              }}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-black transition-all border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? "border-teal-500 text-teal-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <tab.icon className="size-4.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT: THE PULSE & DISCOVER ── */}
        {activeTab === "pulse" && (
          <div className="max-w-4xl mx-auto space-y-10">
            
            {/* Inline Discover Carousel */}
            {suggestedPeople.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <Sparkles className="size-5 text-amber-500" /> Suggested Athletes
                  </h2>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-4 snap-x px-2 -mx-2" style={{ scrollbarWidth: "none" }}>
                  {suggestedPeople.map(person => (
                    <div key={person.id} className="min-w-[220px] max-w-[220px] snap-start bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center shrink-0">
                      <Link href={`/profile/${person.id}`} className="size-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center mb-3 hover:ring-2 hover:ring-teal-300 transition-all">
                        {person.avatar_url ? <img src={person.avatar_url} alt="" className="size-full object-cover" /> : <span className="text-xl font-bold text-slate-400">{person.full_name?.[0] || "?"}</span>}
                      </Link>
                      <Link href={`/profile/${person.id}`}>
                        <h4 className="font-bold text-slate-800 line-clamp-1 hover:text-teal-600 transition-colors">{person.full_name}</h4>
                      </Link>
                      <p className="text-xs font-medium text-slate-500 truncate w-full mb-4 mt-0.5"><MapPin className="size-3 inline mr-1" />{person.location || "Local"}</p>
                      
                      <div className="mt-auto w-full flex gap-2">
                        <button className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-700 py-2 rounded-xl text-xs font-bold transition-colors">
                          Follow
                        </button>
                        <button onClick={() => startChatWith(person)} className="flex-1 bg-teal-50 hover:bg-teal-100 text-teal-700 py-2 rounded-xl text-xs font-bold transition-colors">
                          Chat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feed Section */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 sm:p-10">
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mb-8">
                 <Activity className="size-5 text-teal-500" /> Friend Activity
              </h2>

              {friendActivity.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-base font-medium text-slate-500 leading-relaxed max-w-sm mx-auto">
                    Follow athletes above to see their workouts and events populate your feed!
                  </p>
                </div>
              ) : (
                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[1.3rem] before:-translate-x-px before:h-full before:w-[2px] before:bg-gradient-to-b before:from-teal-100 before:to-transparent">
                  {friendActivity.map((item, i) => (
                    <div key={i} className="relative flex items-start gap-5 group">
                      <Link href={`/profile/${item.userId}`} className="relative z-10 shrink-0 mt-1">
                        <div className="size-11 rounded-full bg-white border-[3px] border-white shadow-sm overflow-hidden flex items-center justify-center ring-1 ring-slate-200 group-hover:ring-teal-300 transition-all">
                          {item.profile?.avatar_url ? <img src={item.profile.avatar_url} alt="" className="size-full object-cover" /> : <span className="text-base font-bold text-slate-400">{item.profile?.full_name?.[0] || "?"}</span>}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0 bg-slate-50 rounded-[1.5rem] p-4 sm:p-5 border border-slate-100 group-hover:border-teal-100 transition-colors">
                        <p className="text-sm sm:text-base text-slate-700 leading-relaxed">
                          <Link href={`/profile/${item.userId}`} className="font-black text-slate-900 hover:text-teal-600 transition-colors mr-1">{item.profile?.full_name || "Someone"}</Link>
                          <span className="font-medium text-slate-500">
                            {item.type === "log" ? `crushed a ${item.data.activity_type.toLowerCase()} workout${item.data.distance ? ` (${item.data.distance}km)` : ""}.` : item.data.events ? `is going to ${item.data.events.title}.` : ""}
                          </span>
                        </p>
                        {item.type === "log" && item.data.notes && (
                          <p className="mt-2 text-sm text-slate-500 italic border-l-2 border-slate-200 pl-3">"{item.data.notes}"</p>
                        )}
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">{format(new Date(item.timestamp), "MMM d · h:mm a")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB CONTENT: COMMUNITIES ── */}
        {activeTab === "communities" && (
          <div className="space-y-8">
            <div className="bg-white p-5 sm:p-7 rounded-[2rem] shadow-sm border border-slate-100 transition-all hover:shadow-md">
              <div className="relative flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-xl border border-transparent focus-within:border-teal-300 focus-within:bg-white transition-colors mb-5">
                <Search className="size-5 text-teal-600 shrink-0" />
                <input className="flex-1 bg-transparent border-none outline-none text-base text-slate-800 placeholder:text-slate-400 font-medium w-full" placeholder="Search communities..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`rounded-full px-5 py-2 text-sm font-bold capitalize transition-all shadow-sm ${selectedCategory === cat ? "bg-teal-600 text-white shadow-md scale-105" : "bg-white border border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-700"}`}>
                    {cat === "all" ? "All Communities" : cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredGroups.length === 0 ? (
               <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100">
                 <p className="text-slate-500 font-medium text-lg">No communities found.</p>
               </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredGroups.map(group => (
                  <Link key={group.id} href={`/community/${group.id}`} className="block h-full">
                    <div className="group relative flex flex-col h-full overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                      <div className="relative h-48 w-full bg-slate-100">
                        {group.image ? <img src={group.image} alt={group.name} className="size-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-500" />}
                        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-900/40 to-transparent" />
                        <div className="absolute top-4 left-4 right-4 flex justify-between">
                          {group.category && <span className="bg-lime-400 text-slate-900 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">{group.category}</span>}
                          {group.is_public ? <span className="bg-white/90 text-slate-900 px-3 py-1.5 rounded-full text-xs font-bold">Public</span> : <span className="bg-slate-900/80 text-white px-3 py-1.5 rounded-full text-xs font-bold">Private</span>}
                        </div>
                      </div>
                      <div className="flex flex-col flex-1 p-6">
                        <h3 className="text-xl font-black text-slate-800 line-clamp-1 mb-2 group-hover:text-teal-600">{group.name}</h3>
                        <p className="text-sm font-medium text-slate-500 line-clamp-2 mb-6">{group.description}</p>
                        <div className="mt-auto flex justify-between border-t border-slate-100 pt-4 text-sm font-bold text-slate-500">
                          <span className="flex items-center gap-1.5 truncate"><MapPin className="size-4 text-teal-500" />{group.location || "Anywhere"}</span>
                          <span className="flex items-center gap-1.5"><Users className="size-4 text-teal-600" />{group.member_count || 0}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB CONTENT: MESSAGES (REAL SUPABASE LOGIC) ── */}
        {activeTab === "messages" && (
          <div className="max-w-3xl mx-auto h-[600px] flex flex-col bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative">
            
            {/* VIEW 1: INBOX LIST */}
            {!selectedChatUser ? (
              <div className="flex flex-col h-full">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                  <h2 className="text-xl font-black text-slate-800">Your Chats</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                  {inboxConversations.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                      <MessageCircle className="size-12 text-slate-200 mb-3" />
                      <p className="text-slate-500 font-medium">No messages yet.</p>
                      <button onClick={() => setActiveTab("pulse")} className="mt-4 text-sm font-bold text-teal-600 hover:text-teal-800">Find someone to chat with →</button>
                    </div>
                  ) : (
                    inboxConversations.map(chat => (
                      <button 
                        key={chat.id} 
                        onClick={() => startChatWith(chat.profile)}
                        className="w-full flex items-center gap-4 p-5 hover:bg-slate-50 transition-colors text-left"
                      >
                        <div className="size-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                          {chat.profile.avatar_url ? <img src={chat.profile.avatar_url} alt="" className="size-full object-cover" /> : <span className="text-lg font-bold text-slate-400">{chat.profile.full_name[0]}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-slate-900 text-lg truncate">{chat.profile.full_name}</h4>
                            <span className="text-xs font-bold text-slate-400">{format(new Date(chat.time), "MMM d")}</span>
                          </div>
                          <p className={`text-sm truncate ${chat.isUnread ? "font-bold text-slate-800" : "font-medium text-slate-500"}`}>{chat.lastMessage}</p>
                        </div>
                        {chat.isUnread && <div className="size-3 shrink-0 rounded-full bg-teal-500 shadow-sm" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              
            /* VIEW 2: ACTIVE CHAT WINDOW */
              <div className="flex flex-col h-full bg-slate-50">
                
                {/* Chat Header */}
                <div className="flex items-center gap-4 p-4 border-b border-slate-200 bg-white z-10 shadow-sm">
                  <button onClick={() => setSelectedChatUser(null)} className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                    <ChevronLeft className="size-6" />
                  </button>
                  <div className="size-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                    {selectedChatUser.avatar_url ? <img src={selectedChatUser.avatar_url} alt="" className="size-full object-cover" /> : <span className="font-bold text-slate-400">{selectedChatUser.full_name[0]}</span>}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 leading-tight">{selectedChatUser.full_name}</h3>
                    <Link href={`/profile/${selectedChatUser.id}`} className="text-xs font-medium text-teal-600 hover:underline">View Profile</Link>
                  </div>
                </div>

                {/* Messages Stream */}
                <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
                  {activeMessages.length === 0 ? (
                     <div className="text-center py-10 text-sm font-medium text-slate-400">Say hi to {selectedChatUser.full_name.split(' ')[0]}!</div>
                  ) : (
                    activeMessages.map((msg, i) => {
                      const isMe = msg.sender_id === user.id
                      return (
                        <div key={msg.id || i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-[0.95rem] ${isMe ? "bg-teal-600 text-white rounded-br-sm shadow-sm" : "bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm"}`}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 mt-1 px-1">{format(new Date(msg.created_at), "h:mm a")}</span>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex gap-3 items-end">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                    placeholder="Type a message..."
                    className="flex-1 max-h-32 min-h-[44px] bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all resize-none"
                    rows={1}
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim()}
                    className="size-11 shrink-0 bg-teal-600 text-white rounded-full flex items-center justify-center hover:bg-teal-700 disabled:opacity-50 disabled:hover:bg-teal-600 transition-colors shadow-sm"
                  >
                    <Send className="size-4 -ml-0.5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}