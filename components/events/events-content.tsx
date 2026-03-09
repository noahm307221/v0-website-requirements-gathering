"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { SearchFilters } from "@/components/events/search-filters"
import { EventsGrid } from "@/components/events/events-grid"
import { MapPin, Loader2, Navigation, X, Search, CheckCircle2 } from "lucide-react"

function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8
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
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
          const data = await res.json()
          const city = data.address?.suburb || data.address?.neighbourhood || data.address?.town || data.address?.city || "Your location"
          setLocationLabel(city); setLocationInput(city)
        } catch { setLocationLabel("Your location") }
        setDetectingLocation(false)
      },
      () => { alert("Could not detect location. Try typing your city instead."); setDetectingLocation(false) }
    )
  }

  async function searchLocation() {
    if (!locationInput.trim()) return
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationInput)}`)
      const data = await res.json()
      if (data.length > 0) {
        setUserLat(parseFloat(data[0].lat)); setUserLon(parseFloat(data[0].lon))
        setLocationEnabled(true); setLocationLabel(locationInput)
      } else { alert("Location not found. Try a different city or postcode.") }
    } catch { alert("Location search failed. Please try again.") }
  }

  const filteredEvents = useMemo(() => {
    let result = [...allEvents]
    if (locationEnabled && userLat !== null && userLon !== null) {
      result = result.filter(e => e.latitude && e.longitude && getDistanceMiles(userLat, userLon, e.latitude, e.longitude) <= radius)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(e => e.title.toLowerCase().includes(q) || e.location.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q))
    }
    if (selectedCategory !== "all") result = result.filter(e => e.categoryId === selectedCategory)
    switch (sortBy) {
      case "date":     result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); break
      case "spots":    result.sort((a, b) => (b.spotsTotal - b.spotsTaken) - (a.spotsTotal - a.spotsTaken)); break
      case "popular":  result.sort((a, b) => b.spotsTaken - a.spotsTaken); break
      case "distance":
        if (userLat && userLon) result.sort((a, b) => {
          const dA = a.latitude ? getDistanceMiles(userLat, userLon, a.latitude, a.longitude) : 9999
          const dB = b.latitude ? getDistanceMiles(userLat, userLon, b.latitude, b.longitude) : 9999
          return dA - dB
        })
        break
    }
    return result
  }, [search, selectedCategory, sortBy, allEvents, locationEnabled, userLat, userLon, radius])

  function clearFilters() {
    setSearch(""); setSelectedCategory("all"); setSortBy("date")
    setLocationEnabled(false); setLocationInput(""); setLocationLabel("")
    setUserLat(null); setUserLon(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="size-10 border-[3px] border-white/10 border-t-teal-400 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: '#F0EFEC' }}>

      {/* ── Softened Dark Header ── */}
      <div className="bg-slate-900 relative overflow-hidden rounded-b-[40px] shadow-sm">
        {/* Subtle dot grid texture */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }} />

        <div className="mx-auto max-w-[1560px] px-6 lg:px-10 pt-16 pb-10 relative z-10">

          {/* Title row */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-1 w-8 bg-teal-500 rounded-full" />
                <span className="text-xs font-bold uppercase tracking-widest text-teal-400">
                  Performance Calendar
                </span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.05]">
                Find your<br />
                <span className="text-teal-400">challenge.</span>
              </h1>
            </div>

            {/* Search + location — Responsive and softer */}
            <div className="flex flex-col gap-4 w-full lg:w-[480px] shrink-0">
              
              {/* Search bar */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-stone-400 group-focus-within:text-teal-400 transition-colors" />
                <input
                  className="w-full bg-white/5 border border-white/10 hover:bg-white/10 focus:bg-white/10 focus:border-teal-400/50 rounded-2xl pl-12 pr-5 py-4 text-[15px] font-medium text-white placeholder:text-stone-400 outline-none transition-all shadow-sm"
                  placeholder="Search sessions, venues..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Location bar */}
              {locationEnabled ? (
                <div className="flex items-center gap-3 bg-teal-500/20 border border-teal-500/40 rounded-2xl px-4 py-3.5 shadow-inner transition-all">
                  <CheckCircle2 className="size-5 text-teal-400 shrink-0" />
                  <span className="text-[15px] font-semibold text-teal-50 flex-1 truncate">{locationLabel}</span>
                  <button 
                    onClick={() => { setLocationEnabled(false); setLocationInput(""); setLocationLabel("") }} 
                    className="p-1.5 rounded-full hover:bg-white/10 transition-colors group"
                    aria-label="Clear location"
                  >
                    <X className="size-4 text-teal-200 group-hover:text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 focus-within:bg-white/10 focus-within:border-teal-400/50 rounded-2xl px-4 py-3.5 transition-all shadow-sm group">
                  <MapPin className="size-5 text-stone-400 group-focus-within:text-teal-400 shrink-0 transition-colors" />
                  <input
                    className="bg-transparent outline-none text-[15px] font-medium text-white placeholder:text-stone-400 flex-1 w-full"
                    placeholder="Enter location..."
                    value={locationInput}
                    onChange={e => setLocationInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && searchLocation()}
                  />
                  <div className="flex items-center gap-2">
                    {locationInput && (
                      <button 
                        onClick={searchLocation} 
                        className="bg-teal-500 text-slate-900 text-xs font-bold uppercase tracking-wide px-4 py-2 rounded-xl hover:bg-teal-400 active:scale-95 transition-all"
                      >
                        Go
                      </button>
                    )}
                    <button 
                      onClick={detectLocation} 
                      className="p-2 text-stone-400 hover:text-teal-400 hover:bg-white/5 rounded-xl transition-all"
                      title="Use my current location"
                    >
                      {detectingLocation ? <Loader2 className="size-5 animate-spin text-teal-400" /> : <Navigation className="size-5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filter strip */}
          <div className="border-t border-white/10 pt-8 mt-4">
            <SearchFilters
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              sortBy={sortBy}
              onSortChange={setSortBy}
              resultCount={filteredEvents.length}
              onClearAll={clearFilters}
              hasActiveFilters={hasActiveFilters}
              radius={radius}
              onRadiusChange={setRadius}
              locationEnabled={locationEnabled}
            />
          </div>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="mx-auto max-w-[1560px] px-6 lg:px-10 pt-12 pb-24">
        <EventsGrid events={filteredEvents} onClearFilters={clearFilters} />
      </div>
    </div>
  )
}