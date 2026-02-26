"use client"

import { useState, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { events as allEvents } from "@/lib/data"
import { SearchFilters } from "@/components/events/search-filters"
import { EventsGrid } from "@/components/events/events-grid"

export default function EventsPage() {
  const searchParams = useSearchParams()
  const initialCategory = searchParams.get("category") ?? "all"

  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [sortBy, setSortBy] = useState("date")

  const filteredEvents = useMemo(() => {
    let result = [...allEvents]

    // Text search
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

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter((e) => e.categoryId === selectedCategory)
    }

    // Sort
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
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          Browse Events
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Discover sports events and fitness activities happening near you
        </p>
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
    </div>
  )
}
