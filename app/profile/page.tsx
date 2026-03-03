"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { User, MapPin, Calendar, Star, Lock, Globe, Camera } from "lucide-react"

const ALL_CATEGORIES = [
  "padel", "running", "yoga", "tennis", "cycling", "crossfit", "swimming", "hiking"
]

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [registrations, setRegistrations] = useState<any[]>([])
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [form, setForm] = useState({
    full_name: "",
    location: "",
    bio: "",
    favourite_categories: [] as string[],
    is_public: true,
    avatar_url: "",
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/auth/login"); return }
      setUser(user)

      // Load or create profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (profileData) {
        setProfile(profileData)
        setForm({
          full_name: profileData.full_name ?? user.user_metadata?.full_name ?? "",
          location: profileData.location ?? "",
          bio: profileData.bio ?? "",
          favourite_categories: profileData.favourite_categories
            ? profileData.favourite_categories.split(",").filter(Boolean)
            : [],
          is_public: profileData.is_public ?? true,
          avatar_url: profileData.avatar_url ?? "",
        })
      } else {
        // Create profile on first visit
        const newProfile = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name ?? "",
          is_public: true,
          created_at: new Date().toISOString(),
        }
        await supabase.from("profiles").insert([newProfile])
        setProfile(newProfile)
        setForm({
          full_name: newProfile.full_name,
          location: "",
          bio: "",
          favourite_categories: [],
          is_public: true,
          avatar_url: "",
        })
      }

      // Load registrations then fetch events separately
      const { data: regs } = await supabase
        .from("registrations")
        .select("*")
        .eq("user_id", user.id)
        .order("registered_at", { ascending: false })

      console.log("Regs:", regs)

      if (regs && regs.length > 0) {
        const eventIds = regs.map(r => r.event_id)
        const { data: eventData } = await supabase
          .from("events")
          .select("*")
          .in("id", eventIds)

        console.log("Events:", eventData)

        const merged = regs.map(r => ({
          ...r,
          events: eventData?.find(e => e.id === r.event_id) ?? null
        }))
        setRegistrations(merged)
      } else {
        setRegistrations([])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email,
      ...form,
      favourite_categories: form.favourite_categories.join(","),
    })
    setProfile({ ...profile, ...form })
    setEditing(false)
    setSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    const fileName = `${user.id}-${Date.now()}.${file.name.split(".").pop()}`
    const { error } = await supabase.storage.from("avatars").upload(fileName, file)
    if (!error) {
      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName)
      setForm({ ...form, avatar_url: data.publicUrl })
    }
    setUploadingAvatar(false)
  }

  function toggleCategory(cat: string) {
    setForm(prev => ({
      ...prev,
      favourite_categories: prev.favourite_categories.includes(cat)
        ? prev.favourite_categories.filter(c => c !== cat)
        : [...prev.favourite_categories, cat]
    }))
  }

  const upcomingEvents = registrations.filter(r =>
    r.events && new Date(r.events.date) >= new Date()
  )
  const pastEvents = registrations.filter(r =>
    r.events && new Date(r.events.date) < new Date()
  )

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading...</div>

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-5">
          {/* Avatar */}
          <div className="relative">
            <div className="size-20 rounded-full bg-muted overflow-hidden flex items-center justify-center border">
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Avatar" className="size-full object-cover" />
              ) : (
                <User className="size-8 text-muted-foreground" />
              )}
            </div>
            {editing && (
              <label className="absolute bottom-0 right-0 cursor-pointer rounded-full bg-foreground p-1.5">
                <Camera className="size-3 text-background" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </label>
            )}
          </div>

          <div>
            {editing ? (
              <input
                className="text-2xl font-bold bg-transparent border-b border-border focus:outline-none w-full"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Your name"
              />
            ) : (
              <h1 className="text-2xl font-bold">{form.full_name || "No name set"}</h1>
            )}
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <div className="flex items-center gap-1 mt-1">
              {form.is_public
                ? <><Globe className="size-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Public profile</span></>
                : <><Lock className="size-3 text-muted-foreground" /><span className="text-xs text-muted-foreground">Private profile</span></>
              }
            </div>
          </div>
        </div>

        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          disabled={saving}
          className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : editing ? "Save profile" : "Edit profile"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total events", value: registrations.length },
          { label: "Upcoming", value: upcomingEvents.length },
          { label: "Completed", value: pastEvents.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border p-4 text-center">
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Bio & Location */}
      <div className="rounded-xl border p-6 mb-6">
        <h2 className="font-semibold mb-4">About</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            {editing ? (
              <input
                className="text-sm bg-transparent border-b border-border focus:outline-none w-full"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Your city"
              />
            ) : (
              <span className="text-sm text-muted-foreground">{form.location || "No location set"}</span>
            )}
          </div>
          <div className="flex items-start gap-3">
            <User className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            {editing ? (
              <textarea
                className="text-sm bg-transparent border-b border-border focus:outline-none w-full resize-none"
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell us about yourself"
                rows={2}
              />
            ) : (
              <span className="text-sm text-muted-foreground">{form.bio || "No bio yet"}</span>
            )}
          </div>

          {/* Privacy toggle */}
          {editing && (
            <div className="flex items-center gap-3 pt-2">
              <span className="text-sm text-muted-foreground">Profile visibility</span>
              <button
                onClick={() => setForm({ ...form, is_public: !form.is_public })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_public ? "bg-foreground" : "bg-muted-foreground"}`}
              >
                <span className={`inline-block size-4 transform rounded-full bg-background transition-transform ${form.is_public ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm">{form.is_public ? "Public" : "Private"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Favourite categories */}
      <div className="rounded-xl border p-6 mb-6">
        <h2 className="font-semibold mb-4">
          <Star className="size-4 inline mr-2 text-muted-foreground" />
          Favourite Activities
        </h2>
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => editing && toggleCategory(cat)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-colors capitalize ${
                form.favourite_categories.includes(cat)
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground"
              } ${editing ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
            >
              {cat}
            </button>
          ))}
        </div>
        {!editing && form.favourite_categories.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">No favourite activities set — click Edit profile to add some</p>
        )}
      </div>

      {/* Upcoming events */}
      <div className="rounded-xl border p-6 mb-6">
        <h2 className="font-semibold mb-4">
          <Calendar className="size-4 inline mr-2 text-muted-foreground" />
          Upcoming Events ({upcomingEvents.length})
        </h2>
        {upcomingEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming events — <a href="/events" className="underline">browse events</a></p>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map(reg => (
              <a key={reg.id} href={`/events/${reg.events.id}`} className="flex items-center gap-4 rounded-lg hover:bg-muted p-2 transition-colors">
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
        )}
      </div>

      {/* Past events */}
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-4">
          Past Events ({pastEvents.length})
        </h2>
        {pastEvents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past events yet</p>
        ) : (
          <div className="space-y-3">
            {pastEvents.map(reg => (
              <a key={reg.id} href={`/events/${reg.events.id}`} className="flex items-center gap-4 rounded-lg hover:bg-muted p-2 transition-colors opacity-60">
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
        )}
      </div>

    </div>
  )
}