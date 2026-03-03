"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { type Event } from "@/lib/data"
import { SearchFilters } from "@/components/events/search-filters"
import { EventsGrid } from "@/components/events/events-grid"
import { MapPin, Loader2 } from "lucide-react"

function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function EventsContent() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get("category") ?? "all"

  const [allEvents, setAllEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [sortBy, setSortBy] = useState("date")

  // Location state
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLon, setUserLon] = useState<number | null>(null)
  const [locationInput, setLocationInput] = useState("")
  const [radius, setRadius] = useState<number>(10)
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationLabel, setLocationLabel] = useState("")

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase.from("events").select("*")
      if (!error && data) {
        setAllEvents(data.map((e: any) => ({
          ...e,
          categoryId: e.category_id,
          spotsTotal: e.spots_total,
          spotsTaken: e.spots_taken,
        })))
      }
      setLoading(false)
    }
    fetchEvents()
  }, [])

  async function detectLocation() {
    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setUserLat(pos.coords.latitude)
        setUserLon(pos.coords.longitude)
        setLocationEnabled(true)

        // Reverse geocode to get city name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          )
          const data = await res.json()
          const city = data.address?.city || data.address?.town || data.address?.village || "Your location"
          setLocationLabel(city)
          setLocationInput(city)
        } catch {
          setLocationLabel("Your location")
        }
        setDetectingLocation(false)
      },
      () => {
        alert("Could not detect location. Try typing your city instead.")
        setDetectingLocation(false)
      }
    )
  }

  async function searchLocation() {
    if (!locationInput.trim()) return
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}`
      )
      const data = await res.json()
      if (data.length > 0) {
        setUserLat(parseFloat(data[0].lat))
        setUserLon(parseFloat(data[0].lon))
        setLocationEnabled(true)
        setLocationLabel(locationInput)
      } else {
        alert("Location not found. Try a different city or postcode.")
      }
    } catch {
      alert("Location search failed. Please try again.")
    }
  }

  const filteredEvents = useMemo(() => {
    let result = [...allEvents]

    // Location filter
    if (locationEnabled && userLat !== null && userLon !== null) {
      result = result.filter(e => {
        if (!e.latitude || !e.longitude) return false
        const dist = getDistanceMiles(userLat, userLon, e.latitude, e.longitude)
        return dist <= radius
      })
    }

    if (search) {
      const query = search.toLowerCase()
      result = result.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.location.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.organiser?.toLowerCase().includes(query)
      )
    }

    if (selectedCategory !== "all") {
      result = result.filter(e => e.categoryId === selectedCategory)
    }

    switch (sortBy) {
      case "date":
        result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        break
      case "spots":
        result.sort((a, b) => b.spotsTotal - b.spotsTaken - (a.spotsTotal - a.spotsTaken))
        break
      case "popular":
        result.sort((a, b) => b.spotsTaken - a.spotsTaken)
        break
      case "distance":
        if (userLat && userLon) {
          result.sort((a, b) => {
            const distA = a.latitude ? getDistanceMiles(userLat, userLon, a.latitude, a.longitude) : 999
            const distB = b.latitude ? getDistanceMiles(userLat, userLon, b.latitude, b.longitude) : 999
            return distA - distB
          })
        }
        break
    }

    return result
  }, [search, selectedCategory, sortBy, allEvents, locationEnabled, userLat, userLon, radius])

  function clearFilters() {
    setSearch("")
    setSelectedCategory("all")
    setLocationEnabled(false)
    setLocationInput("")
    setLocationLabel("")
    setUserLat(null)
    setUserLon(null)
  }

  if (loading) return <div className="text-muted-foreground">Loading events...</div>

  return (
    <>
      {/* Location bar */}
      <div className="mb-6 rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-3">
          <MapPin className="size-4 text-muted-foreground shrink-0" />
          <input
            className="flex-1 min-w-40 rounded-lg border bg-background px-3 py-1.5 text-sm"
            placeholder="Enter city or postcode..."
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchLocation()}
          />
          <button
            onClick={searchLocation}
            className="rounded-lg bg-foreground text-background px-3 py-1.5 text-sm font-medium hover:opacity-90"
          >
            Search
          </button>
          <button
            onClick={detectLocation}
            disabled={detectingLocation}
            className="rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {detectingLocation ? <Loader2 className="size-3 animate-spin" /> : <MapPin className="size-3" />}
            {detectingLocation ? "Detecting..." : "Use my location"}
          </button>

          {locationEnabled && (
            <button
              onClick={() => { setLocationEnabled(false); setLocationInput(""); setLocationLabel("") }}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Clear
            </button>
          )}
        </div>

        {locationEnabled && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Showing events within
            </span>
            {[5, 10, 25, 50].map(r => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                  radius === r
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {r} miles
              </button>
            ))}
            <span className="text-sm font-medium">of {locationLabel}</span>
          </div>
        )}
      </div>

      <SearchFilters
        search={search}
        onSearchChange={setSearch}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
        resultCount={filteredEvents.length}
      />
      <div className="mt-8">
        <EventsGrid events={filteredEvents} onClearFilters={clearFilters} />
      </div>
    </>
  )
}
