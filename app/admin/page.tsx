"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function AdminPage() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formError, setFormError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    title: "",
    description: "",
    category_id: "",
    date: "",
    time: "",
    location: "",
    address: "",
    spots_total: "",
    spots_taken: "0",
    organiser: "",
    price: "",
    image: "",
  })
  const router = useRouter()

  async function fetchEvents() {
    const { data } = await supabase.from("events").select("*").order("date")
    setEvents(data || [])
    setLoading(false)
  }

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/admin/login")
        return
      }
      fetchEvents()
    }
    checkAuth()
  }, [])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fileExt = file.name.split(".").pop()
    const fileName = `${Date.now()}.${fileExt}`

    const { error } = await supabase.storage
      .from("event-images")
      .upload(fileName, file)

    if (error) {
      setFormError("Image upload failed: " + error.message)
    } else {
      const { data } = supabase.storage
        .from("event-images")
        .getPublicUrl(fileName)
      setForm({ ...form, image: data.publicUrl })
    }
    setUploading(false)
  }

  async function handleAdd() {
    setFormError("")

    if (!form.title.trim()) return setFormError("Title is required")
    if (!form.category_id.trim()) return setFormError("Category is required")
    if (!form.date.match(/^\d{4}-\d{2}-\d{2}$/)) return setFormError("Date must be in YYYY-MM-DD format")
    if (!form.time.match(/^\d{2}:\d{2}$/)) return setFormError("Time must be in HH:MM format (e.g. 09:00)")
    if (!form.location.trim()) return setFormError("Location is required")
    if (!form.spots_total || isNaN(parseInt(form.spots_total))) return setFormError("Total spots must be a number")
    if (!form.price.trim()) return setFormError("Price is required (use 'Free' if free)")

    // Geocode the address to get coordinates
    let latitude = null
    let longitude = null

    if (form.address) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.address)}`
        )
        const geoData = await geoRes.json()
        if (geoData.length > 0) {
          latitude = parseFloat(geoData[0].lat)
          longitude = parseFloat(geoData[0].lon)
        }
      } catch (e) {
        console.error("Geocoding failed:", e)
      }
    }

    const { error } = await supabase.from("events").insert([{
      ...form,
      spots_total: parseInt(form.spots_total) || 0,
      spots_taken: parseInt(form.spots_taken) || 0,
      latitude,
      longitude,
    }])

    if (error) {
      setFormError("Error adding event: " + error.message)
    } else {
      alert("Event added!")
      setFormError("")
      setForm({
        title: "", description: "", category_id: "", date: "",
        time: "", location: "", address: "", spots_total: "",
        spots_taken: "0", organiser: "", price: "", image: "",
      })
      fetchEvents()
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this event?")) return
    await supabase.from("events").delete().eq("id", id)
    fetchEvents()
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <button
          onClick={async () => {
            await supabase.auth.signOut()
            router.push("/admin/login")
          }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Sign out
        </button>
      </div>

      {/* Add Event Form */}
      <div className="bg-muted rounded-xl p-6 mb-10">
        <h2 className="text-xl font-semibold mb-4">Add New Event</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { key: "title", label: "Title" },
            { key: "category_id", label: "Category (e.g. running, yoga)" },
            { key: "time", label: "Time (e.g. 09:00)" },
            { key: "location", label: "Location Name" },
            { key: "address", label: "Full Address" },
            { key: "organiser", label: "Organiser" },
            { key: "price", label: "Price (e.g. Free or $10)" },
            { key: "spots_total", label: "Total Spots" },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm text-muted-foreground mb-1 block">{label}</label>
              <input
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}

          {/* Date picker */}
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Date</label>
            <input
              type="date"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="text-sm text-muted-foreground mb-1 block">Description</label>
            <textarea
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Image upload */}
          <div className="sm:col-span-2">
            <label className="text-sm text-muted-foreground mb-1 block">Event Image</label>
            
            <div className="flex items-center gap-3">
              <label className="cursor-pointer rounded-lg border border-dashed bg-background px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:border-foreground transition-colors">
                {uploading ? "Uploading..." : "📁 Upload image"}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
              <span className="text-sm text-muted-foreground">or paste a URL below</span>
            </div>

            <input
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm mt-2"
              placeholder="https://images.unsplash.com/..."
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
            />

            {form.image && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Preview:</p>
                <img src={form.image} alt="Preview" className="h-32 rounded-lg object-cover" />
              </div>
            )}
          </div>
        </div>

        {formError && (
          <p className="mt-3 text-sm text-destructive font-medium">{formError}</p>
        )}

        <button
          onClick={handleAdd}
          disabled={uploading}
          className="mt-4 rounded-lg bg-foreground text-background px-6 py-2 text-sm font-medium disabled:opacity-50"
        >
          Add Event
        </button>
      </div>

      {/* Events List */}
      <h2 className="text-xl font-semibold mb-4">All Events ({events.length})</h2>
      {loading ? <p>Loading...</p> : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="flex items-center justify-between rounded-xl border px-4 py-3">
              <div className="flex items-center gap-3">
                {event.image && (
                  <img src={event.image} alt={event.title} className="h-12 w-16 rounded-lg object-cover" />
                )}
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">{event.date} · {event.location}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(event.id)}
                className="text-sm text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}