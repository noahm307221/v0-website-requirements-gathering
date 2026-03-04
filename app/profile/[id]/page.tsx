"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { User, MapPin, Calendar } from "lucide-react"
import { format } from "date-fns"

export default function PublicProfilePage() {
  const { id } = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      if (!profile || !profile.is_public) {
        router.push("/community")
        return
      }

      setProfile(profile)

      const { data: regs } = await supabase
        .from("registrations")
        .select("*")
        .eq("user_id", id)

      if (regs && regs.length > 0) {
        const { data: eventData } = await supabase
          .from("events")
          .select("*")
          .in("id", regs.map(r => r.event_id))

        const today = new Date().toISOString().split("T")[0]
        setRegistrations(
          regs
            .map(r => ({ ...r, events: eventData?.find(e => e.id === r.event_id) }))
            .filter(r => r.events && r.events.date >= today)
        )
      }

      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>
  if (!profile) return null

  const categories = profile.favourite_categories
    ? profile.favourite_categories.split(",").filter(Boolean)
    : []

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      {/* Header */}
      <div className="flex items-center gap-5 mb-8">
        <div className="size-20 rounded-full bg-muted overflow-hidden flex items-center justify-center border">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={profile.full_name} className="size-full object-cover" />
            : <User className="size-8 text-muted-foreground" />
          }
        </div>
        <div>
          <h1 className="text-2xl font-bold">{profile.full_name}</h1>
          {profile.location && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="size-3.5" />{profile.location}
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <div className="rounded-xl border p-6 mb-6">
          <p className="text-muted-foreground">{profile.bio}</p>
        </div>
      )}

      {/* Favourite activities */}
      {categories.length > 0 && (
        <div className="rounded-xl border p-6 mb-6">
          <h2 className="font-semibold mb-3">Favourite Activities</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat: string) => (
              <span key={cat} className="rounded-full bg-muted px-3 py-1 text-sm capitalize">{cat}</span>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming events */}
      {registrations.length > 0 && (
        <div className="rounded-xl border p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Calendar className="size-4 text-muted-foreground" />
            Upcoming Events
          </h2>
          <div className="space-y-3">
            {registrations.map(reg => (
              <a key={reg.id} href={`/events/${reg.events.id}`} className="flex items-center gap-3 rounded-lg hover:bg-muted p-2 transition-colors">
                {reg.events.image && (
                  <img src={reg.events.image} alt={reg.events.title} className="size-12 rounded-lg object-cover shrink-0" />
                )}
                <div>
                  <p className="font-medium text-sm">{reg.events.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(reg.events.date), "EEE, MMM d")} · {reg.events.location}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
