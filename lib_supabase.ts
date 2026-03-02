"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { type Event } from "@/lib/data" // keep using the same type
import { SearchFilters } from "@/components/events/search-filters"
import { EventsGrid } from "@/components/events/events-grid"

export function EventsContent() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get("category") ?? "all"

  const [allEvents, setAllEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [sortBy, setSortBy] = useState("date")

  // Fetch events from Supabase
  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from("events")
        .select("*")
      
      if (error) {
        console.error("Error fetching events:", error)
      } else {
        // Map Supabase column names back to what the app expects
        const mapped = data.map((e: any) => ({
          ...e,
          categoryId: e.category_id,
          spotsTotal: e.spots_total,
          spotsTaken: e.spots_taken,
        }))
        setAllEvents(mapped)
      }
      setLoading(false)
    }

    fetchEvents()
  }, [])

  const filteredEvents = useMemo(() => {
    // ... rest stays exactly the same as before
  }, [search, selectedCategory, sortBy, allEvents])

  // ... rest of your component stays the same
}

