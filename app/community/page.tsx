"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { 
  MapPin, Users, Lock, Globe, Plus, Search, 
  UsersRound, Activity, MessageCircle, Sparkles, 
  UserPlus, ChevronLeft, Send, Heart, MessageSquare, User, ArrowRight,
  TrendingUp, Zap, Edit3
} from "lucide-react"
import { cn } from "@/lib/utils"

const CATEGORIES = ["all", "padel", "running", "yoga", "tennis", "cycling", "crossfit", "swimming", "hiking"]
const TABS = ["pulse", "communities", "messages"] as const
type Tab = typeof TABS[number]

export default function CommunityPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("pulse")
  
  // ── CORE DATA STATES ──
  const [groups, setGroups] = useState<any[]>([])
  const [friendActivity, setFriendActivity] = useState<any[]>([])
  const [suggestedPeople, setSuggestedPeople] = useState<any[]>([])
  
  // ── SEARCH STATES ──
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  // ── MESSAGING STATES ──
  const [messages, setMessages] = useState<any[]>([])
  const [chatProfiles, setChatProfiles] = useState<Record<string, any>>({})
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null)
  const [newMessage, setNewMessage] = useState("")
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // ── URL TAB LINKING ──
  useEffect(() => {
    const requestedTab = searchParams.get("tab") as Tab
    if (requestedTab && TABS.includes(requestedTab)) {
      setActiveTab(requestedTab)
    }
  }, [searchParams])

  // ── DATA FETCHING ENGINE ──
  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: groupData } = await supabase.from("groups").select("*").order("created_at", { ascending: false })
      setGroups(groupData || [])

      if (user) {
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

        const { data: suggestions } = await supabase.from("profiles").select("id, full_name, avatar_url, location, favourite_categories").eq("is_public", true).neq("id", user.id).limit(20)
        setSuggestedPeople((suggestions || []).filter(p => !followingIds.includes(p.id)).slice(0, 5))

        fetchMessages(user.id)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  // ── REAL-TIME CHAT ENGINE ──
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel("realtime_messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const newMsg = payload.new
        if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
          setMessages((prev) => [...prev, newMsg])
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
      .order("created_at", { ascending: true })

    if (msgs) {
      setMessages(msgs)
      const otherUserIds = [...new Set(msgs.map(m => m.sender_id === userId ? m.receiver_id : m.sender_id))]
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

    setMessages(prev => [...prev, tempMessage])
    setNewMessage("")
    
    setTimeout(() => {
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)

    await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedChatUser.id,
      content: tempMessage.content
    })
  }

  function startChatWith(person: any) {
    if (!chatProfiles[person.id]) {
      setChatProfiles(prev => ({ ...prev, [person.id]: person }))
    }
    setSelectedChatUser(person)
    setActiveTab("messages")
    setTimeout(() => {
      chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight })
    }, 50)
  }

  // ── FILTERING COMPUTATIONS ──
  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase()) || g.description?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === "all" || g.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const inboxConversations = useMemo(() => {
    if (!user) return []
    const latestMsgs: Record<string, any> = {}
    
    messages.forEach(msg => {
      const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
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

  const activeMessages = selectedChatUser 
    ? messages.filter(m => (m.sender_id === user?.id && m.receiver_id === selectedChatUser.id) || (m.sender_id === selectedChatUser.id && m.receiver_id === user?.id))
    : []

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F4F5]">
      <div className="size-10 border-4 border-slate-200 border-t-teal-500 rounded-full animate-spin" />
    </div>
  )

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || "Athlete"

  return (
    <div className="min-h-screen bg-[#F4F4F5] font-sans pb-32 selection:bg-teal-100">
      
      {/* ── AMBIENT HEADER BACKGROUND ── */}
      <div className="absolute top-0 inset-x-0 h-[40vh] bg-gradient-to-b from-teal-50/50 to-transparent pointer-events-none" />

      <div className="relative mx-auto max-w-[1400px] px-6 py-12">
        
        {/* ── HEADER ── */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <div className="flex items-center gap-3 mb-4">
               <div className="h-1.5 w-8 bg-teal-500 rounded-full shadow-sm" />
               <span className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">Global Network</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-[-0.04em] leading-none mb-3">
              Community<span className="text-teal-500">.</span>
            </h1>
            <p className="text-slate-500 font-bold text-lg max-w-lg">
              Connect with athletes, build your crew, and share your wins.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            {user && activeTab === "communities" && (
              <Link href="/community/create" className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-sm font-bold shadow-xl hover:bg-teal-600 transition-all hover:-translate-y-1">
                <Plus className="size-4" /> Initialize Crew
              </Link>
            )}
            {user && activeTab === "messages" && !selectedChatUser && (
              <button onClick={() => setActiveTab("pulse")} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3.5 rounded-2xl text-sm font-bold shadow-xl hover:bg-teal-600 transition-all hover:-translate-y-1">
                <UserPlus className="size-4" /> Find Athletes
              </button>
            )}
          </div>
        </div>

        {/* ── SEGMENTED TABS (Tactile Bento Style) ── */}
        <div className="inline-flex bg-white/60 backdrop-blur-md p-2 rounded-[2rem] mb-10 w-full sm:w-auto overflow-x-auto scrollbar-hide shadow-sm border border-white/50">
          {[
            { id: "pulse", label: "The Pulse", icon: Activity },
            { id: "communities", label: "Crews & Groups", icon: UsersRound },
            { id: "messages", label: "Messages", icon: MessageCircle },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as Tab)
                if (tab.id !== "messages") setSelectedChatUser(null)
              }}
              className={cn(
                "flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-[1.5rem] text-sm font-black transition-all whitespace-nowrap flex-1 sm:flex-none",
                activeTab === tab.id 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
              )}
            >
              <tab.icon className={cn("size-4", activeTab === tab.id ? "text-teal-400" : "")} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: THE PULSE (Social 2-Column Layout) ── */}
        {activeTab === "pulse" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
            
            {/* Main Feed Column */}
            <div className="xl:col-span-8 space-y-8">
              
              {/* Premium "Write Post" Box */}
              <div className="bg-white rounded-[2.5rem] p-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex items-center gap-4 transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                <div className="size-14 rounded-[1.5rem] bg-slate-50 overflow-hidden shrink-0 border border-slate-200 p-0.5 ml-1">
                  <div className="size-full rounded-[1.3rem] overflow-hidden bg-white flex items-center justify-center">
                    {user?.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} className="size-full object-cover" />
                    ) : (
                      <span className="font-black text-slate-300 text-xl">{firstName[0]}</span>
                    )}
                  </div>
                </div>
                <Link href="/compete/log" className="flex-1 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-400 font-bold px-6 py-4 rounded-[1.5rem] transition-colors text-left text-sm flex items-center gap-2">
                  <Edit3 className="size-4" /> Log a session, share a win...
                </Link>
                <Link href="/compete/log" className="hidden sm:flex bg-slate-900 text-white p-4 rounded-[1.5rem] hover:bg-teal-600 transition-colors shadow-md mr-1">
                   <Plus className="size-5" />
                </Link>
              </div>

              {/* The Feed */}
              {friendActivity.length === 0 ? (
                <div className="bg-white rounded-[3rem] p-16 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col items-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
                     <Activity className="size-40" />
                  </div>
                  <div className="relative z-10">
                    <div className="size-24 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-teal-500/20 mx-auto">
                       <Sparkles className="size-10 text-white" />
                    </div>
                    <h3 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">The Pulse is Quiet.</h3>
                    <p className="text-slate-500 font-bold text-lg max-w-md mx-auto leading-relaxed">
                      Your feed is currently empty. Follow other athletes to see their activity, wins, and events populate here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {friendActivity.map((item, i) => (
                    <div key={i} className="bg-white rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      
                      {/* Post Header */}
                      <div className="flex items-center justify-between mb-6">
                        <Link href={`/profile/${item.userId}`} className="flex items-center gap-4 group">
                          <div className="size-14 rounded-[1.5rem] bg-slate-50 p-0.5 border border-slate-200 group-hover:border-teal-400 transition-colors shrink-0">
                            <div className="size-full rounded-[1.3rem] overflow-hidden bg-white flex items-center justify-center">
                              {item.profile?.avatar_url ? <img src={item.profile.avatar_url} alt="" className="size-full object-cover" /> : <span className="font-black text-slate-300 text-lg">{item.profile?.full_name?.[0] || "?"}</span>}
                            </div>
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-lg group-hover:text-teal-600 transition-colors tracking-tight leading-none mb-1.5">{item.profile?.full_name || "Athlete"}</p>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{format(new Date(item.timestamp), "MMM d · h:mm a")}</p>
                          </div>
                        </Link>
                      </div>

                      {/* Post Content */}
                      <div className="pl-[4.5rem]">
                        <p className="text-slate-700 text-lg font-medium leading-relaxed mb-6">
                          {item.type === "log" 
                            ? `Crushed a ${item.data.activity_type.toLowerCase()} session! ${item.data.distance ? `Covered ${item.data.distance}km.` : ""}` 
                            : `Locked in for ${item.data.events?.title}. Who else is joining?`
                          }
                        </p>

                        {/* Rich Bento Attachment Card */}
                        <div className="bg-slate-50/80 rounded-[2rem] p-5 border border-slate-100 flex items-center gap-5 mb-6 hover:bg-white hover:shadow-lg transition-all cursor-pointer group">
                           <div className="size-16 bg-white rounded-[1.5rem] shadow-sm flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                              {item.type === "log" ? '⚡️' : '🏆'}
                           </div>
                           <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-teal-600 mb-1">
                                 {item.type === "log" ? 'Performance Verified' : 'Event Confirmed'}
                              </p>
                              <p className="font-black text-slate-900 text-lg tracking-tight leading-none mb-2">
                                {item.type === "log" ? `${item.data.activity_type} Workout` : item.data.events?.title}
                              </p>
                              <div className="flex items-center gap-2">
                                <Zap className="size-3.5 text-amber-500 fill-amber-500" />
                                <span className="text-xs font-bold text-slate-500">+{item.data.points || 50} XP Reward</span>
                              </div>
                           </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex items-center gap-8 pt-2">
                           <button className="flex items-center gap-2.5 text-sm font-bold text-slate-400 hover:text-rose-500 transition-colors group">
                             <Heart className="size-5 group-hover:scale-110 transition-transform" /> Kudos
                           </button>
                           <button className="flex items-center gap-2.5 text-sm font-bold text-slate-400 hover:text-teal-600 transition-colors group">
                             <MessageSquare className="size-5 group-hover:scale-110 transition-transform" /> Comment
                           </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar Column (Tactile Suggestions) */}
            <div className="xl:col-span-4 space-y-8">
              {suggestedPeople.length > 0 && (
                <div className="bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-8 sticky top-28">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                      <TrendingUp className="size-5 text-teal-500" /> Suggested Athletes
                    </h3>
                  </div>
                  
                  <div className="space-y-6">
                    {suggestedPeople.map(person => (
                      <div key={person.id} className="flex items-center justify-between group">
                        <Link href={`/profile/${person.id}`} className="flex items-center gap-4 min-w-0">
                          <div className="size-12 rounded-[1.2rem] bg-slate-50 p-0.5 border border-slate-200 shrink-0 group-hover:border-teal-400 transition-colors">
                            <div className="size-full bg-white rounded-xl overflow-hidden flex items-center justify-center">
                              {person.avatar_url ? <img src={person.avatar_url} alt="" className="size-full object-cover" /> : <span className="font-black text-slate-300 text-sm">{person.full_name?.[0]}</span>}
                            </div>
                          </div>
                          <div className="min-w-0 pr-2">
                            <h4 className="font-black text-slate-900 truncate group-hover:text-teal-600 transition-colors leading-none mb-1.5">{person.full_name}</h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{person.location || "Global Network"}</p>
                          </div>
                        </Link>
                        <button onClick={() => startChatWith(person)} className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-teal-600 hover:bg-teal-500 hover:text-white transition-all shrink-0 shadow-sm hover:shadow-md">
                          <MessageCircle className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <Link href="/events" className="mt-8 flex items-center justify-center gap-2 w-full text-[11px] font-black uppercase tracking-[0.2em] text-teal-700 bg-teal-50 py-4 rounded-[1.5rem] hover:bg-teal-100 transition-colors">
                    Find more at Events <ArrowRight className="size-3" />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: COMMUNITIES (Rich Grid) ── */}
        {activeTab === "communities" && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Search Command Bar */}
            <div className="bg-white p-4 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col md:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
                <input 
                  className="w-full bg-slate-50 border-none rounded-[1.5rem] pl-14 pr-6 py-4 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all" 
                  placeholder="Search crews, networks, or locations..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                />
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide items-center">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat} 
                    onClick={() => setSelectedCategory(cat)} 
                    className={cn(
                      "rounded-[1.5rem] px-6 py-4 text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap shrink-0 border",
                      selectedCategory === cat ? "bg-slate-900 text-white border-slate-900 shadow-md" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Grid */}
            {filteredGroups.length === 0 ? (
               <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-sm">
                 <UsersRound className="size-16 text-slate-300 mx-auto mb-6" />
                 <h3 className="text-2xl font-black text-slate-900 mb-2">No crews detected.</h3>
                 <p className="text-slate-500 font-bold">Try adjusting your filters or initialize a new crew.</p>
               </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredGroups.map(group => (
                  <Link key={group.id} href={`/community/${group.id}`} className="group flex flex-col h-full bg-white rounded-[3rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 overflow-hidden isolation-isolate">
                    
                    <div className="relative h-56 w-full bg-slate-100 p-2">
                      <div className="relative size-full rounded-[2.5rem] overflow-hidden">
                        {group.image ? (
                          <img src={group.image} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                        ) : (
                          <div className="absolute inset-0 bg-slate-800" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent" />
                        
                        <div className="absolute top-4 left-4 flex gap-2">
                          {group.category && (
                            <span className="bg-white/95 backdrop-blur-md text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">
                              {group.category}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col flex-1 px-8 pb-8 pt-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-2xl font-black text-slate-900 group-hover:text-teal-600 transition-colors tracking-tight line-clamp-1">{group.name}</h3>
                        {group.is_public ? <Globe className="size-5 text-slate-300 shrink-0 mt-1" /> : <Lock className="size-5 text-slate-300 shrink-0 mt-1" />}
                      </div>
                      <p className="text-sm font-bold text-slate-500 line-clamp-2 mb-8">{group.description}</p>
                      
                      <div className="mt-auto flex justify-between items-center border-t border-slate-50 pt-5">
                        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 truncate max-w-[150px]">
                          <MapPin className="size-4 text-teal-500" />{group.location || "Global"}
                        </span>
                        <span className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-900">
                          <Users className="size-3.5 text-teal-500" />{group.member_count || 0}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: SECURE COMMS (MESSAGES) ── */}
        {activeTab === "messages" && (
          <div className="max-w-[1200px] mx-auto h-[750px] flex bg-white rounded-[3rem] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-200 overflow-hidden animate-in fade-in duration-700">
            
            {/* LEFT COLUMN: INBOX */}
            <div className={cn("w-full md:w-96 flex flex-col border-r border-slate-100 bg-slate-50/50", selectedChatUser ? "hidden md:flex" : "flex")}>
              <div className="p-8 border-b border-slate-200 bg-white">
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <MessageCircle className="size-5 text-teal-500" /> Inbox
                </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
                {inboxConversations.length === 0 ? (
                  <div className="p-10 text-center">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No active chats.</p>
                  </div>
                ) : (
                  inboxConversations.map(chat => (
                    <button 
                      key={chat.id} 
                      onClick={() => startChatWith(chat.profile)}
                      className={cn(
                        "w-full flex items-center gap-4 p-5 rounded-[1.5rem] transition-all text-left group mb-2",
                        selectedChatUser?.id === chat.id ? "bg-white shadow-md border border-slate-100" : "hover:bg-white border border-transparent"
                      )}
                    >
                      <div className="size-14 rounded-[1.2rem] bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                        {chat.profile.avatar_url ? <img src={chat.profile.avatar_url} alt="" className="size-full object-cover" /> : <span className="font-black text-slate-400">{chat.profile.full_name[0]}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-black text-slate-900 text-base truncate group-hover:text-teal-600 transition-colors">{chat.profile.full_name}</h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{format(new Date(chat.time), "MMM d")}</span>
                        </div>
                        <p className={cn("text-sm truncate", chat.isUnread ? "font-bold text-slate-900" : "font-medium text-slate-500")}>{chat.lastMessage}</p>
                      </div>
                      {chat.isUnread && <div className="size-3 shrink-0 rounded-full bg-teal-500 shadow-sm" />}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: ACTIVE CHAT */}
            <div className={cn("flex-1 flex flex-col bg-white", !selectedChatUser ? "hidden md:flex" : "flex")}>
              {!selectedChatUser ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-50/50">
                   <div className="size-24 bg-white rounded-[2rem] flex items-center justify-center mb-6 shadow-sm border border-slate-200">
                      <MessageSquare className="size-10 text-teal-400" />
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Your Messages</h3>
                   <p className="text-slate-500 font-bold max-w-sm leading-relaxed">Select a conversation from the sidebar or find athletes in The Pulse to start chatting.</p>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="flex items-center gap-5 p-6 border-b border-slate-100 bg-white shadow-sm z-10">
                    <button onClick={() => setSelectedChatUser(null)} className="md:hidden p-3 -ml-2 rounded-2xl hover:bg-slate-100 text-slate-500 transition-colors">
                      <ChevronLeft className="size-6" />
                    </button>
                    <div className="size-14 rounded-[1.2rem] bg-slate-50 p-0.5 border border-slate-200 shrink-0">
                      <div className="size-full rounded-xl overflow-hidden bg-white flex items-center justify-center">
                        {selectedChatUser.avatar_url ? <img src={selectedChatUser.avatar_url} alt="" className="size-full object-cover" /> : <span className="font-black text-slate-400 text-lg">{selectedChatUser.full_name[0]}</span>}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 leading-none mb-1.5 tracking-tight">{selectedChatUser.full_name}</h3>
                      <Link href={`/profile/${selectedChatUser.id}`} className="text-[10px] font-black uppercase tracking-widest text-teal-600 hover:underline">View Profile</Link>
                    </div>
                  </div>

                  {/* Messages Feed */}
                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/50">
                    {activeMessages.length === 0 ? (
                       <div className="text-center text-slate-400 text-xs font-black uppercase tracking-widest mt-10">
                          Start the conversation with {selectedChatUser.full_name.split(' ')[0]}
                       </div>
                    ) : (
                      activeMessages.map((msg, i) => {
                        const isMe = msg.sender_id === user.id
                        return (
                          <div key={msg.id || i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                            <div className={cn(
                               "max-w-[70%] px-6 py-4 text-base font-medium leading-relaxed shadow-sm",
                               isMe ? "bg-slate-900 text-white rounded-[1.5rem] rounded-tr-sm" : "bg-white border border-slate-200 text-slate-800 rounded-[1.5rem] rounded-tl-sm"
                            )}>
                              {msg.content}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 mt-2 px-2 uppercase tracking-widest">{format(new Date(msg.created_at), "h:mm a")}</span>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {/* Input form */}
                  <form onSubmit={handleSendMessage} className="p-6 bg-white border-t border-slate-100 flex gap-4 items-end">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                      placeholder="Type a message..."
                      className="flex-1 max-h-32 min-h-[56px] bg-slate-50 border border-slate-200 rounded-[1.5rem] px-6 py-4 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 transition-all resize-none shadow-inner"
                      rows={1}
                    />
                    <button 
                      type="submit" 
                      disabled={!newMessage.trim()}
                      className="size-14 shrink-0 bg-teal-500 text-slate-900 rounded-[1.2rem] flex items-center justify-center hover:bg-teal-400 disabled:opacity-50 transition-all shadow-md active:scale-95"
                    >
                      <Send className="size-5 -ml-1" />
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}