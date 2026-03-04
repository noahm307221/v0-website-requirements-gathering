"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, X, Calendar, Users, User } from "lucide-react"
import { supabase } from "@/lib/supabase"

export function SearchOverlay() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<{
    events: any[]
    groups: any[]
    users: any[]
  }>({ events: [], groups: [], users: [] })
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Open with Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else setQuery("")
  }, [open])

  // Search as you type
  useEffect(() => {
    if (!query.trim()) {
      setResults({ events: [], groups: [], users: [] })
      return
    }

    const timeout = setTimeout(async () => {
      setLoading(true)
      const q = query.toLowerCase()

      const [eventsRes, groupsRes, usersRes] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, date, location, image")
          .or(`title.ilike.%${q}%,location.ilike.%${q}%,description.ilike.%${q}%`)
          .limit(4),
        supabase
          .from("groups")
          .select("id, name, location, category, image, member_count")
          .or(`name.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`)
          .limit(4),
        supabase
          .from("profiles")
          .select("id, full_name, avatar_url, location")
          .ilike("full_name", `%${q}%`)
          .eq("is_public", true)
          .limit(4),
      ])

      setResults({
        events: eventsRes.data || [],
        groups: groupsRes.data || [],
        users: usersRes.data || [],
      })
      setLoading(false)
    }, 300)

    return () => clearTimeout(timeout)
  }, [query])

  function navigate(path: string) {
    setOpen(false)
    router.push(path)
  }

  const hasResults = results.events.length > 0 || results.groups.length > 0 || results.users.length > 0

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Search className="size-3.5" />
        <span className="hidden sm:block">Search...</span>
        <kbd className="hidden sm:block rounded border bg-background px-1.5 text-xs">⌘K</kbd>
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Search panel */}
          <div className="relative w-full max-w-xl bg-background border rounded-2xl shadow-2xl overflow-hidden">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Search className="size-4 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Search events, groups, people..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button onClick={() => setQuery("")}>
                  <X className="size-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground"
              >
                Esc
              </button>
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {!query && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Start typing to search...
                </p>
              )}

              {query && loading && (
                <p className="text-center text-sm text-muted-foreground py-8">Searching...</p>
              )}

              {query && !loading && !hasResults && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No results for "{query}"
                </p>
              )}

              {/* Events */}
              {results.events.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Events</p>
                  {results.events.map(event => (
                    <button
                      key={event.id}
                      onClick={() => navigate(`/events/${event.id}`)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors text-left"
                    >
                      <div className="size-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        {event.image
                          ? <img src={event.image} alt={event.title} className="size-full object-cover" />
                          : <Calendar className="size-5 m-2.5 text-muted-foreground" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium">{event.title}</p>
                        <p className="text-xs text-muted-foreground">{event.location} · {event.date}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Groups */}
              {results.groups.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">Groups</p>
                  {results.groups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => navigate(`/community/${group.id}`)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors text-left"
                    >
                      <div className="size-10 rounded-lg overflow-hidden bg-muted shrink-0">
                        {group.image
                          ? <img src={group.image} alt={group.name} className="size-full object-cover" />
                          : <Users className="size-5 m-2.5 text-muted-foreground" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium">{group.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{group.category} · {group.member_count || 0} members</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Users */}
              {results.users.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">People</p>
                  {results.users.map(user => (
                    <button
                      key={user.id}
                      onClick={() => navigate(`/profile/${user.id}`)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-muted transition-colors text-left"
                    >
                      <div className="size-10 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                        {user.avatar_url
                          ? <img src={user.avatar_url} alt={user.full_name} className="size-full object-cover" />
                          : <User className="size-5 text-muted-foreground" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground">{user.location || "No location"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}