"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { type Event } from "@/lib/data"
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

  useEffect(() => {
    async function fetchEvents() {
      const { data, error } = await supabase
        .from("events")
        .select("*")

      if (error) {
        console.error("Error fetching events:", error)
      } else {
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
    let result = [...allEvents]

    if (search) {
      const query = search.toLowerCase()
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.location.toLowerCase().includes(query) ||
          e.description.toLowerCase().includes(query) ||
          e.organizer.toLowerCase().includes(query),
      )
    }

    if (selectedCategory !== "all") {
      result = result.filter((e) => e.categoryId === selectedCategory)
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
    }

    return result
  }, [search, selectedCategory, sortBy, allEvents])

  function clearFilters() {
    setSearch("")
    setSelectedCategory("all")
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading events...</div>
  }

  return (
    <>
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
