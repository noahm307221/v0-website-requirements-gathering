"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

const CATEGORIES = ["padel", "running", "yoga", "tennis", "cycling", "crossfit", "swimming", "hiking"]

export default function CreateGroupPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    location: "",
    is_public: true,
    image: "",
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push("/auth/login")
      else setUser(user)
    })
  }, [])

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fileName = `group-${Date.now()}.${file.name.split(".").pop()}`
    const { error } = await supabase.storage.from("event-images").upload(fileName, file)
    if (!error) {
      const { data } = supabase.storage.from("event-images").getPublicUrl(fileName)
      setForm({ ...form, image: data.publicUrl })
    }
    setUploading(false)
  }

  async function handleCreate() {
    setError("")
    if (!form.name.trim()) return setError("Group name is required")
    if (!form.category) return setError("Please select a category")
    if (!form.location.trim()) return setError("Location is required")

    setLoading(true)

    // Geocode location
    let latitude = null
    let longitude = null
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.location)}`
      )
      const data = await res.json()
      if (data.length > 0) {
        latitude = parseFloat(data[0].lat)
        longitude = parseFloat(data[0].lon)
      }
    } catch (e) {}

    const groupId = crypto.randomUUID()

    const { error: groupError } = await supabase.from("groups").insert([{
      id: groupId,
      ...form,
      latitude,
      longitude,
      created_by: user.id,
      created_at: new Date().toISOString(),
      member_count: 1,
    }])

    if (groupError) {
      setError("Error creating group: " + groupError.message)
      setLoading(false)
      return
    }

    // Auto join as owner
    await supabase.from("group_members").insert([{
      id: crypto.randomUUID(),
      group_id: groupId,
      user_id: user.id,
      role: "owner",
      joined_at: new Date().toISOString(),
    }])

    router.push(`/community/${groupId}`)
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Create a group</h1>
      <p className="text-muted-foreground mb-8">Build a community around your favourite activity</p>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Group name</label>
          <input
            className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
            placeholder="e.g. Morning Runners Edinburgh"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Description</label>
          <textarea
            className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
            rows={3}
            placeholder="What's this group about?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setForm({ ...form, category: cat })}
                className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                  form.category === cat
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Location (city or area)</label>
          <input
            className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm"
            placeholder="e.g. Edinburgh, Scotland"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Group image</label>
          <label className="cursor-pointer rounded-xl border border-dashed bg-background px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors block">
            {uploading ? "Uploading..." : "📁 Upload image"}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          {form.image && (
            <img src={form.image} alt="Preview" className="mt-2 h-32 rounded-xl object-cover" />
          )}
          <input
            className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm mt-2"
            placeholder="Or paste image URL..."
            value={form.image}
            onChange={(e) => setForm({ ...form, image: e.target.value })}
          />
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-2 block">Visibility</label>
          <div className="flex gap-3">
            <button
              onClick={() => setForm({ ...form, is_public: true })}
              className={`flex-1 rounded-xl border p-4 text-left transition-colors ${form.is_public ? "border-foreground" : "border-border"}`}
            >
              <p className="font-medium text-sm mb-1">🌍 Public</p>
              <p className="text-xs text-muted-foreground">Anyone can find and join</p>
            </button>
            <button
              onClick={() => setForm({ ...form, is_public: false })}
              className={`flex-1 rounded-xl border p-4 text-left transition-colors ${!form.is_public ? "border-foreground" : "border-border"}`}
            >
              <p className="font-medium text-sm mb-1">🔒 Private</p>
              <p className="text-xs text-muted-foreground">Only visible to members</p>
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={loading || uploading}
          className="w-full rounded-xl bg-foreground text-background py-3 font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create group"}
        </button>
      </div>
    </div>
  )
}