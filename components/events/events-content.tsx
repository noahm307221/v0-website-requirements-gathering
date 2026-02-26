"use client"

import { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { events as allEvents } from "@/lib/data"
import { SearchFilters } from "@/components/events/search-filters"
import { EventsGrid } from "@/components/events/events-grid"

export function EventsContent() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get("category") ?? "all"

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [sortBy, setSortBy] = useState("date")

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
        result.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        )
        break
      case "spots":
        result.sort(
          (a, b) =>
            b.spotsTotal - b.spotsTaken - (a.spotsTotal - a.spotsTaken),
        )
        break
      case "popular":
        result.sort((a, b) => b.spotsTaken - a.spotsTaken)
        break
    }

    return result
  }, [search, selectedCategory, sortBy])

  function clearFilters() {
    setSearch("")
    setSelectedCategory("all")
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
