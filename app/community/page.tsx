"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { MapPin, Users, Lock, Globe, Plus, Search } from "lucide-react"

const CATEGORIES = ["all", "padel", "running", "yoga", "tennis", "cycling", "crossfit", "swimming", "hiking"]

export default function CommunityPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    fetchGroups()
  }, [])

  async function fetchGroups() {
    const { data } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false })
    setGroups(data || [])
    setLoading(false)
  }

  const filtered = groups.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.description?.toLowerCase().includes(search.toLowerCase()) ||
      g.location?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = selectedCategory === "all" || g.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      {/* Header */}
      <div className="mb-10 flex items-start justify-between">
        <div>
          <p className="mb-3 text-[0.8rem] font-medium uppercase tracking-widest text-muted-foreground">Connect</p>
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Community{" "}
            <span className="font-serif italic text-accent">groups</span>
          </h1>
          <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
            Find your people. Join local groups, chat with members, and discover events together.
          </p>
        </div>
        {user && (
          <Link
            href="/community/create"
            className="flex items-center gap-2 rounded-xl bg-foreground text-background px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" />
            Create group
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="mb-6 flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            className="w-full rounded-xl border bg-background pl-9 pr-4 py-2.5 text-sm"
            placeholder="Search groups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="mb-8 flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              selectedCategory === cat
                ? "bg-foreground text-background"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Groups grid */}
      {loading ? (
        <div className="text-muted-foreground">Loading groups...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">No groups found</p>
          {user && (
            <Link href="/community/create" className="text-sm underline">
              Create the first one
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(group => (
            <Link key={group.id} href={`/community/${group.id}`}>
              <div className="group rounded-xl border border-border/60 bg-card hover:border-foreground/20 hover:shadow-lg transition-all duration-200 overflow-hidden">
                {/* Image */}
                <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                  {group.image ? (
                    <img src={group.image} alt={group.name} className="size-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="size-full flex items-center justify-center text-4xl bg-gradient-to-br from-muted to-muted/50">
                      🏃
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    {group.is_public
                      ? <span className="flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-medium"><Globe className="size-3" /> Public</span>
                      : <span className="flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-xs font-medium"><Lock className="size-3" /> Private</span>
                    }
                  </div>
                  {group.category && (
                    <span className="absolute top-3 left-3 rounded-full bg-foreground/80 text-background px-2 py-1 text-xs font-medium capitalize">
                      {group.category}
                    </span>
                  )}
                </div>

                <div className="p-5">
                  <h3 className="font-semibold text-foreground mb-1">{group.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{group.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" />{group.location || "No location"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3" />{group.member_count || 0} members
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}