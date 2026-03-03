"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import { Calendar, Clock, MapPin, Users, ArrowLeft, Tag } from "lucide-react"
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

  useEffect(() => {
    async function fetchEvent() {
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
      setLoading(false)
    }
    fetchEvent()
  }, [id])

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>
  if (!event) return <div className="p-12 text-center text-muted-foreground">Event not found.</div>

  const category = getCategoryById(event.categoryId)
  const spotsLeft = event.spotsTotal - event.spotsTaken
  const almostFull = spotsLeft <= 5

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
          src={event.image}
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
              {spotsLeft} spots left of {event.spotsTotal}
            </p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="rounded-xl border p-6 mb-8">
        <h2 className="font-semibold mb-2">About this event</h2>
        <p className="text-muted-foreground leading-relaxed">{event.description}</p>
      </div>

      {/* CTA */}
      <button className="w-full rounded-xl bg-foreground text-background py-3 font-medium hover:opacity-90 transition-opacity">
        Register for this event
      </button>
    </div>
  )
}