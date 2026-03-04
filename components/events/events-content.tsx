"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { type Event } from "@/lib/data"
import { SearchFilters } from "@/components/events/search-filters"
import { EventsGrid } from "@/components/events/events-grid"
import { MapPin, Loader2, Navigation, X, Search, CheckCircle2 } from "lucide-react"

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

  // Master check for any active filters
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="size-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <>
      <div className="bg-white p-5 sm:p-7 rounded-[2rem] shadow-sm border border-slate-100 mb-8 transition-all hover:shadow-md">
        
        {/* Top Row: The Inputs */}
        <div className="flex flex-col md:flex-row gap-4">
          
          {/* Keyword Search */}
          <div className="flex-1 flex items-center gap-3 px-4 py-3.5 bg-slate-50 rounded-2xl border border-transparent focus-within:border-teal-300 focus-within:bg-white transition-colors">
            <Search className="size-5 text-teal-600 shrink-0" />
            <input
              className="flex-1 bg-transparent border-none outline-none text-base text-slate-800 placeholder:text-slate-400 font-medium w-full"
              placeholder="Search events, sports, or clubs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <X className="size-4 text-slate-400" />
              </button>
            )}
          </div>

          {/* Location Area - Swaps between Input and Confirmed Badge */}
          {locationEnabled ? (
            <div className="flex-1 flex items-center justify-between gap-3 px-5 py-3.5 bg-teal-50 rounded-2xl border border-teal-200 shadow-inner transition-all animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <CheckCircle2 className="size-5 text-teal-600 shrink-0" />
                <span className="text-base font-bold text-teal-900 truncate">
                  Area set to: <span className="capitalize">{locationLabel}</span>
                </span>
              </div>
              <button
                onClick={() => {
                  setLocationEnabled(false)
                  setLocationInput("")
                  setLocationLabel("")
                }}
                className="text-sm font-bold text-teal-700 hover:text-teal-900 bg-teal-100/50 hover:bg-teal-200 px-4 py-1.5 rounded-full transition-colors shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-0">
              <div className="flex-1 flex items-center gap-3 px-4 py-3.5 bg-slate-50 rounded-2xl border border-transparent focus-within:border-teal-300 focus-within:bg-white transition-colors">
                <MapPin className="size-5 text-teal-600 shrink-0" />
                <input
                  className="flex-1 bg-transparent border-none outline-none text-base text-slate-800 placeholder:text-slate-400 font-medium w-full"
                  placeholder="Where? (City or postcode)"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchLocation()}
                />
                {locationInput && (
                  <button onClick={() => setLocationInput("")} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                    <X className="size-4 text-slate-400" />
                  </button>
                )}
                
                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />
                
                <button
                  onClick={detectLocation}
                  disabled={detectingLocation}
                  className="hidden sm:flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-500 font-bold text-sm hover:text-teal-700 hover:bg-teal-50 transition-colors disabled:opacity-50"
                >
                  {detectingLocation ? <Loader2 className="size-4 animate-spin text-teal-600" /> : <Navigation className="size-4" />}
                  <span>Near Me</span>
                </button>
                
                <button
                  onClick={searchLocation}
                  className="hidden sm:block whitespace-nowrap rounded-xl bg-teal-600 text-white px-5 py-2 text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
                >
                  Search Area
                </button>
              </div>

              {/* Mobile Action Buttons (Visible only on small screens when input is active) */}
              <div className="flex gap-2 sm:hidden mt-2">
                <button
                  onClick={detectLocation}
                  disabled={detectingLocation}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl border-2 border-slate-100 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:border-teal-200 hover:text-teal-700 transition-colors disabled:opacity-50"
                >
                  {detectingLocation ? <Loader2 className="size-4 animate-spin text-teal-600" /> : <Navigation className="size-4" />}
                  Near Me
                </button>
                <button
                  onClick={searchLocation}
                  className="flex-1 rounded-2xl bg-teal-600 text-white px-5 py-3 text-sm font-bold hover:bg-teal-700 transition-colors shadow-sm"
                >
                  Search Area
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Radius Selector */}
        {locationEnabled && (
          <div className="mt-5 flex flex-wrap items-center gap-3 px-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Search Radius
            </span>
            <div className="flex flex-wrap gap-2 bg-slate-50 p-1.5 rounded-[1.5rem] border border-slate-100 shadow-inner">
              {[5, 10, 25, 50].map(r => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-bold transition-all ${
                    radius === r
                      ? "bg-teal-600 text-white shadow-md scale-105"
                      : "bg-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  {r} miles
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories and Sort */}
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
      
      <div className="mt-8">
        <EventsGrid events={filteredEvents} onClearFilters={clearFilters} />
      </div>
    </>
  )
}