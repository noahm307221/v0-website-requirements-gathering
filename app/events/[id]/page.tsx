"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Calendar, Clock, MapPin, Users, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { supabase } from "@/lib/supabase"
import { getCategoryById } from "@/lib/data"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function EventDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [event, setEvent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [registered, setRegistered] = useState(false)
  const [registering, setRegistering] = useState(false)
  const [regMessage, setRegMessage] = useState("")

  useEffect(() => {
    async function load() {
      // Get user
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      // Get event
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        console.error(error)
      } else {
        setEvent({
          ...data,
          categoryId: data.category_id,
          spotsTotal: data.spots_total,
          spotsTaken: data.spots_taken,
        })
      }

      // Check if already registered
      if (user) {
        const { data: reg } = await supabase
          .from("registrations")
          .select("id")
          .eq("user_id", user.id)
          .eq("event_id", parseInt(id as string))
          .single()
        setRegistered(!!reg)
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function handleRegister() {
    if (!user) {
      router.push("/auth/login")
      return
    }

    setRegistering(true)
    setRegMessage("")

    if (registered) {
      // Unregister
      await supabase
        .from("registrations")
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", parseInt(id as string))

      setRegistered(false)
      setEvent({ ...event, spotsTaken: event.spotsTaken - 1 })
      setRegMessage("You've been unregistered from this event.")
    } else {
      // Check spots available
      if (event.spotsTaken >= event.spotsTotal) {
        setRegMessage("Sorry, this event is full!")
        setRegistering(false)
        return
      }

      // Register
      await supabase.from("registrations").insert([{
        id: crypto.randomUUID(),
        user_id: user.id,
        event_id: parseInt(id as string),
        registered_at: new Date().toISOString(),
      }])

      // Increase spots taken
      await supabase
        .from("events")
        .update({ spots_taken: event.spotsTaken + 1 })
        .eq("id", id)

      setRegistered(true)
      setEvent({ ...event, spotsTaken: event.spotsTaken + 1 })
      setRegMessage("You're registered! See you there 🎉")
    }

    setRegistering(false)
  }

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>
  if (!event) return <div className="p-12 text-center text-muted-foreground">Event not found.</div>

  const category = getCategoryById(event.categoryId)
  const spotsLeft = event.spotsTotal - event.spotsTaken
  const almostFull = spotsLeft <= 5
  const isFull = spotsLeft <= 0

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> Back to events
      </button>

      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl mb-8">
        <Image
          src={event.image || "/placeholder.jpg"}
          alt={event.title}
          fill
          className="object-cover"
        />
        {category && (
          <Badge className={cn("absolute top-4 left-4 border-none", category.color)}>
            {category.name}
          </Badge>
        )}
        <Badge className="absolute top-4 right-4 border-none bg-foreground text-background">
          {event.price === "Free" ? "Free" : event.price}
        </Badge>
      </div>

      {/* Title & organiser */}
      <h1 className="text-3xl font-bold tracking-tight mb-1">{event.title}</h1>
      <p className="text-muted-foreground mb-6">Organised by {event.organiser}</p>

      {/* Details */}
      <div className="grid gap-3 sm:grid-cols-2 mb-8">
        <div className="flex items-center gap-3 rounded-xl border p-4">
          <Calendar className="size-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="font-medium">{format(new Date(event.date), "EEEE, MMMM d, yyyy")}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border p-4">
          <Clock className="size-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="font-medium">{event.time}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border p-4">
          <MapPin className="size-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="font-medium">{event.location}</p>
            <p className="text-sm text-muted-foreground">{event.address}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border p-4">
          <Users className="size-5 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Availability</p>
            <p className={cn("font-medium", almostFull ? "text-destructive" : "")}>
              {isFull ? "Event full" : `${spotsLeft} spots left of ${event.spotsTotal}`}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border p-6 mb-8">
        <h2 className="font-semibold mb-2">About this event</h2>
        <p className="text-muted-foreground leading-relaxed">{event.description}</p>
      </div>

      {/* Registration message */}
      {regMessage && (
        <div className={cn(
          "rounded-xl p-4 mb-4 text-sm font-medium",
          registered ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"
        )}>
          {regMessage}
        </div>
      )}

      {/* CTA button */}
      <button
        onClick={handleRegister}
        disabled={registering || (isFull && !registered)}
        className={cn(
          "w-full rounded-xl py-3 font-medium transition-opacity disabled:opacity-50",
          registered
            ? "bg-muted text-foreground hover:bg-muted/80"
            : "bg-foreground text-background hover:opacity-90"
        )}
      >
        {registering
          ? "Processing..."
          : registered
          ? "Cancel registration"
          : isFull
          ? "Event full"
          : user
          ? "Register for this event"
          : "Log in to register"}
      </button>
    </div>
  )
}