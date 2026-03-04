"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { format, isToday, isTomorrow } from "date-fns"
import { Calendar, Clock, MapPin, Users, ArrowLeft, CheckCircle2, Ticket, Share2 } from "lucide-react"

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today, " + format(d, "MMMM do")
  if (isTomorrow(d)) return "Tomorrow, " + format(d, "MMMM do")
  return format(d, "EEEE, MMMM do")
}

export default function EventDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const [event, setEvent] = useState<any>(null)
  const [user, setUser] = useState<any>(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [attendees, setAttendees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function loadEventData() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Fetch Event
      const { data: eventData } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single()
      
      if (eventData) setEvent(eventData)

      // Fetch Registration Status & Attendees
      if (eventData) {
        const { data: regs } = await supabase
          .from("registrations")
          .select("user_id, profiles(id, full_name, avatar_url)")
          .eq("event_id", eventId)

        if (regs) {
          if (user) {
            setIsRegistered(regs.some(r => r.user_id === user.id))
          }
          setAttendees(regs.map(r => r.profiles).filter(Boolean))
        }
      }
      setLoading(false)
    }
    loadEventData()
  }, [eventId])

  async function handleRSVP() {
    if (!user) {
      router.push("/auth/login")
      return
    }
    
    setProcessing(true)
    
    if (isRegistered) {
      // Cancel RSVP
      await supabase.from("registrations").delete().match({ event_id: eventId, user_id: user.id })
      await supabase.rpc('decrement_spots_taken', { event_id: eventId }) // Assuming you have this RPC, or you can update the row
      setIsRegistered(false)
      setEvent({ ...event, spots_taken: Math.max(0, event.spots_taken - 1) })
      setAttendees(attendees.filter(a => a.id !== user.id))
    } else {
      // Join Event
      await supabase.from("registrations").insert({ event_id: eventId, user_id: user.id })
      await supabase.rpc('increment_spots_taken', { event_id: eventId })
      setIsRegistered(true)
      setEvent({ ...event, spots_taken: event.spots_taken + 1 })
      
      // Optimistically add user to attendees
      const { data: myProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (myProfile) setAttendees([...attendees, myProfile])
    }
    
    setProcessing(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="size-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
    </div>
  )

  if (!event) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-black text-slate-800 mb-4">Event not found</h1>
      <Link href="/events" className="text-teal-600 font-bold hover:underline">← Back to calendar</Link>
    </div>
  )

  const spotsLeft = event.spots_total - event.spots_taken
  const almostFull = spotsLeft <= 5 && spotsLeft > 0
  const isFull = spotsLeft <= 0

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      
      {/* ── TOP NAV BACK BUTTON ── */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-4">
        <Link href="/events" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
          <ArrowLeft className="size-4" /> Back to Events
        </Link>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        
        {/* ── HERO IMAGE SECTION ── */}
        <div className="relative w-full h-[40vh] min-h-[300px] max-h-[500px] rounded-[2rem] overflow-hidden shadow-lg mb-8 sm:mb-12 bg-slate-200">
          {event.image ? (
            <img src={event.image} alt={event.title} className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-emerald-600" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
          
          <div className="absolute top-6 right-6 flex gap-3">
            <button className="size-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center hover:bg-white hover:text-slate-900 transition-colors">
              <Share2 className="size-4.5" />
            </button>
          </div>

          <div className="absolute bottom-8 left-8 right-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {event.category_id && (
                <span className="bg-lime-400 text-slate-900 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
                  {event.category_id}
                </span>
              )}
              {event.price === "Free" || event.price === "0" ? (
                <span className="bg-white text-slate-900 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
                  Free Event
                </span>
              ) : (
                <span className="bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border border-white/20">
                  {event.price}
                </span>
              )}
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-tight max-w-3xl">
              {event.title}
            </h1>
          </div>
        </div>

        {/* ── GRID LAYOUT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* LEFT COLUMN: Event Details */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Quick Details Bento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-start gap-4">
                <div className="size-12 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0">
                  <Calendar className="size-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-0.5">When</p>
                  <p className="font-bold text-slate-800">{formatEventDate(event.date)}</p>
                  <p className="text-sm font-medium text-slate-500 mt-0.5">{event.time} {event.duration && `· ${event.duration}`}</p>
                </div>
              </div>
              
              <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-start gap-4">
                <div className="size-12 rounded-2xl bg-teal-50 flex items-center justify-center shrink-0">
                  <MapPin className="size-6 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-0.5">Where</p>
                  <p className="font-bold text-slate-800 line-clamp-1">{event.location}</p>
                  {/* Future: Add Google Maps link here */}
                  <button className="text-sm font-bold text-teal-600 hover:text-teal-800 mt-0.5">Show on map</button>
                </div>
              </div>
            </div>

            {/* About Section */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
              <h3 className="text-2xl font-black text-slate-800 mb-4">About this event</h3>
              <p className="text-lg text-slate-600 leading-relaxed font-medium whitespace-pre-line">
                {event.description || "No description provided."}
              </p>
              
              {event.organiser && (
                <div className="mt-8 pt-8 border-t border-slate-100 flex items-center gap-4">
                  <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-xl">👋</div>
                  <div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-0.5">Organized by</p>
                    <p className="font-bold text-slate-800">{event.organiser}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Attendees Section */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-black text-slate-800">Who's going</h3>
                <span className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-sm font-bold border border-slate-100">
                  {event.spots_taken} / {event.spots_total}
                </span>
              </div>
              
              {attendees.length === 0 ? (
                <p className="text-slate-500 font-medium bg-slate-50 rounded-2xl p-6 text-center border border-dashed border-slate-200">
                  Be the first to join this event!
                </p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {attendees.map(a => (
                    <Link key={a.id} href={`/profile/${a.id}`} className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-300 rounded-full pr-4 p-1 transition-colors">
                      <div className="size-8 rounded-full bg-white overflow-hidden flex items-center justify-center shadow-sm">
                        {a.avatar_url ? <img src={a.avatar_url} alt="" className="size-full object-cover" /> : <span className="text-xs font-bold text-slate-400">{a.full_name?.[0]}</span>}
                      </div>
                      <span className="text-sm font-bold text-slate-700">{a.full_name?.split(" ")[0]}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: Sticky Booking Widget */}
          <div className="lg:col-span-4 relative">
            <div className="sticky top-24 bg-white rounded-[2rem] p-6 sm:p-8 border border-slate-100 shadow-xl shadow-slate-200/50">
              
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-black text-slate-800">Registration</h4>
                  <Ticket className="size-5 text-slate-400" />
                </div>
                
                {/* Progress Bar */}
                <div className="mt-6 mb-2 flex items-end justify-between">
                  <span className={`text-2xl font-black ${almostFull || isFull ? 'text-rose-500' : 'text-teal-600'}`}>
                    {isFull ? 'Sold Out' : `${spotsLeft} spots left`}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${isFull || almostFull ? 'bg-rose-500' : 'bg-gradient-to-r from-teal-400 to-emerald-500'}`}
                    style={{ width: `${(event.spots_taken / event.spots_total) * 100}%` }}
                  />
                </div>
              </div>

              {/* Action Button */}
              {isRegistered ? (
                <div className="space-y-3">
                  <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl py-4 flex flex-col items-center justify-center gap-1 shadow-inner">
                    <CheckCircle2 className="size-6 text-emerald-500" />
                    <span className="font-black text-lg">You're going!</span>
                  </div>
                  <button 
                    onClick={handleRSVP} 
                    disabled={processing}
                    className="w-full py-3 text-sm font-bold text-slate-400 hover:text-rose-500 transition-colors disabled:opacity-50"
                  >
                    {processing ? "Updating..." : "Cancel my spot"}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleRSVP}
                  disabled={processing || isFull}
                  className={`w-full rounded-2xl py-4 text-lg font-black text-white shadow-md transition-all ${
                    isFull 
                      ? 'bg-slate-300 cursor-not-allowed' 
                      : 'bg-teal-600 hover:bg-teal-700 hover:shadow-lg hover:-translate-y-0.5'
                  }`}
                >
                  {processing ? "Processing..." : isFull ? "Waitlist Only" : "Book your spot"}
                </button>
              )}

              <p className="text-center text-xs font-medium text-slate-400 mt-6">
                Free cancellation up to 24 hours before the event starts.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}