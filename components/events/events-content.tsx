"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { SearchFilters } from "@/components/events/search-filters"
import { EventsGrid } from "@/components/events/events-grid"
import { MapPin, Loader2, Navigation, X, Search, CheckCircle2, ChevronRight } from "lucide-react"

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

  const hasActiveFilters = search !== "" || selectedCategory !== "all" || locationEnabled || sortBy !== "date"

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

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          )
          const data = await res.json()
          const city =
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.quarter ||
            data.address?.village ||
            data.address?.town ||
            data.address?.municipality ||
            data.address?.city ||
            "Your location"
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
    setSortBy("date")
    setLocationEnabled(false)
    setLocationInput("")
    setLocationLabel("")
    setUserLat(null)
    setUserLon(null)
  }

  if (loading) return null

  return (
    <>
      {/* ── SEARCH ── */}
      <div className="mb-8">

        {/* Main search row */}
        <div className="flex flex-col md:flex-row gap-3 mb-3">

          {/* Keyword */}
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
            <input
              className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-10 py-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 shadow-sm transition-all"
              placeholder="Search events, sports, venues..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-slate-100 transition-colors">
                <X className="size-3.5 text-slate-400" />
              </button>
            )}
          </div>

          {/* Location */}
          {locationEnabled ? (
            <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3 shadow-sm md:min-w-[220px]">
              <CheckCircle2 className="size-4 text-teal-600 shrink-0" />
              <span className="text-sm font-bold text-teal-800 flex-1 truncate capitalize">{locationLabel}</span>
              <button
                onClick={() => { setLocationEnabled(false); setLocationInput(""); setLocationLabel("") }}
                className="p-1 rounded-full hover:bg-teal-100 transition-colors shrink-0">
                <X className="size-3.5 text-teal-600" />
              </button>
            </div>
          ) : (
            <div className="relative group md:w-72">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
              <input
                className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-20 py-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/10 shadow-sm transition-all"
                placeholder="City or postcode"
                value={locationInput}
                onChange={e => setLocationInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && searchLocation()}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                {locationInput && (
                  <button onClick={searchLocation} className="bg-teal-600 text-white rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-teal-700 transition-colors">
                    Go
                  </button>
                )}
                <button
                  onClick={detectLocation}
                  disabled={detectingLocation}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                  title="Use my location">
                  {detectingLocation ? <Loader2 className="size-4 animate-spin text-teal-600" /> : <Navigation className="size-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Radius pills — only when location active */}
        {locationEnabled && (
          <div className="flex items-center gap-2 mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">Within</span>
            {[5, 10, 25, 50].map(r => (
              <button key={r} onClick={() => setRadius(r)}
                className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  radius === r ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-300"
                }`}>
                {r} mi
              </button>
            ))}
          </div>
        )}

        {/* Category pills + sort row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
            <SearchFilters
              search={search}
              onSearchChange={setSearch}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              sortBy={sortBy}
              onSortChange={setSortBy}
              resultCount={filteredEvents.length}
              onClearAll={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>
        </div>

      </div>

      {/* ── EVENTS GRID ── */}
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100 fill-mode-both">
        <EventsGrid events={filteredEvents} onClearFilters={clearFilters} />
      </div>
    </>
  )
}