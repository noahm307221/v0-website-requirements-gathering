"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { SearchFilters } from "@/components/events/search-filters"
import { EventsGrid } from "@/components/events/events-grid"
import { 
  MapPin, Loader2, Navigation, X, Search, CheckCircle2, 
  ChevronRight, Sparkles, Filter, Zap, Globe, SlidersHorizontal 
} from "lucide-react"
import { cn } from "@/lib/utils"

/** ── THE ENGINE: HARVESINE DISTANCE CALCULATION ── **/
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

  // ── FULL STATE PERSISTENCE ──
  const [allEvents, setAllEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [sortBy, setSortBy] = useState("date")

  // ── GEOLOCATION ENGINE STATE ──
  const [userLat, setUserLat] = useState<number | null>(null)
  const [userLon, setUserLon] = useState<number | null>(null)
  const [locationInput, setLocationInput] = useState("")
  const [radius, setRadius] = useState<number>(10)
  const [locationEnabled, setLocationEnabled] = useState(false)
  const [detectingLocation, setDetectingLocation] = useState(false)
  const [locationLabel, setLocationLabel] = useState("")

  const hasActiveFilters = search !== "" || selectedCategory !== "all" || locationEnabled || sortBy !== "date"

  // ── DATA FETCHING ──
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

  // ── GEOLOCATION & GEOCODING LOGIC ──
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

  // ── THE FILTERING & SORTING MATRIX ──
  const filteredEvents = useMemo(() => {
    let result = [...allEvents]

    // Distance Filter
    if (locationEnabled && userLat !== null && userLon !== null) {
      result = result.filter(e => {
        if (!e.latitude || !e.longitude) return false
        const dist = getDistanceMiles(userLat, userLon, e.latitude, e.longitude)
        return dist <= radius
      })
    }

    // Keyword Search
    if (search) {
      const query = search.toLowerCase()
      result = result.filter(e =>
        e.title.toLowerCase().includes(query) ||
        e.location.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.organiser?.toLowerCase().includes(query)
      )
    }

    // Category Filter
    if (selectedCategory !== "all") {
      result = result.filter(e => e.categoryId === selectedCategory)
    }

    // Advanced Sorting
    switch (sortBy) {
      case "date":
        result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        break
      case "spots":
        result.sort((a, b) => (b.spotsTotal - b.spotsTaken) - (a.spotsTotal - a.spotsTaken))
        break
      case "popular":
        result.sort((a, b) => b.spotsTaken - a.spotsTaken)
        break
      case "distance":
        if (userLat && userLon) {
          result.sort((a, b) => {
            const distA = a.latitude ? getDistanceMiles(userLat, userLon, a.latitude, a.longitude) : 9999
            const distB = b.latitude ? getDistanceMiles(userLat, userLon, b.latitude, b.longitude) : 9999
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
    <div className="mx-auto max-w-[1800px] w-full px-8 pb-40">
      
      {/* ── CINEMATIC HEADER ── */}
      <div className="pt-16 mb-16 animate-in fade-in slide-in-from-left-8 duration-1000">
        <div className="flex items-center gap-4 mb-6">
           <div className="h-1 w-12 bg-teal-500 rounded-full" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-teal-600/70">Performance Hub</span>
        </div>
        <h1 className="text-7xl md:text-9xl font-black tracking-[-0.06em] text-slate-900 leading-[0.85] italic uppercase">
          Find Your <br/> Challenge<span className="text-teal-500">.</span>
        </h1>
      </div>

      {/* ── THE COMMAND CENTER (Sticky Unified Strip) ── */}
      <div className="relative z-40 space-y-6 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        
        {/* Layer 1: Search & Location */}
        <div className="bg-white/80 backdrop-blur-2xl border border-white p-4 rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] flex flex-col xl:flex-row gap-4">
          
          <div className="relative flex-1 group">
            <Search className="absolute left-7 top-1/2 -translate-y-1/2 size-5 text-slate-400 group-focus-within:text-teal-600 transition-colors" />
            <input
              className="w-full bg-slate-50 border-none rounded-[2rem] pl-16 pr-10 py-6 text-base font-black text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 transition-all outline-none"
              placeholder="Search sessions, crews, venues..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="xl:w-[450px] flex items-center bg-slate-900 rounded-[2rem] px-8 py-5 relative overflow-hidden group/loc shadow-xl">
             <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 to-transparent opacity-0 group-hover/loc:opacity-100 transition-opacity" />
             
             {locationEnabled ? (
               <div className="flex items-center justify-between w-full relative z-10">
                  <div className="flex items-center gap-4">
                    <CheckCircle2 className="size-4 text-teal-400" />
                    <span className="text-sm font-black text-white uppercase tracking-[0.2em]">{locationLabel}</span>
                  </div>
                  <button onClick={() => { setLocationEnabled(false); setLocationInput(""); setLocationLabel("") }} className="p-2 rounded-xl bg-white/10 text-white hover:bg-rose-500 transition-all">
                    <X className="size-4" />
                  </button>
               </div>
             ) : (
               <div className="flex items-center w-full relative z-10 gap-4">
                  <MapPin className="size-5 text-teal-500" />
                  <input
                    className="bg-transparent border-none outline-none text-sm font-black text-white placeholder:text-zinc-600 w-full tracking-widest uppercase"
                    placeholder="Enter Location..."
                    value={locationInput}
                    onChange={e => setLocationInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && searchLocation()}
                  />
                  <div className="flex items-center gap-2">
                     {locationInput && (
                       <button onClick={searchLocation} className="bg-teal-500 text-slate-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-teal-400 transition-all">
                         Go
                       </button>
                     )}
                     <button onClick={detectLocation} className="text-zinc-500 hover:text-white transition-colors p-2 rounded-xl bg-white/5">
                        {detectingLocation ? <Loader2 className="size-4 animate-spin" /> : <Navigation className="size-4" />}
                     </button>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Layer 2: Spread-out Modalities & Sorting */}
        <div className="bg-white/50 backdrop-blur-md rounded-[3rem] border border-slate-100 p-6 shadow-sm">
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

      {/* ── FULL WIDTH RESULTS ── */}
      <main className="w-full animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
         <EventsGrid events={filteredEvents} onClearFilters={clearFilters} />
      </main>
    </div>
  )
}