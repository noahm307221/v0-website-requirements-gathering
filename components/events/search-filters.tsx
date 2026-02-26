"use client"

import { Search, SlidersHorizontal, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { categories } from "@/lib/data"
import { cn } from "@/lib/utils"

interface SearchFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  selectedCategory: string
  onCategoryChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
  resultCount: number
}

export function SearchFilters({
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  resultCount,
}: SearchFiltersProps) {
  const hasFilters = search !== "" || selectedCategory !== "all"

  function clearFilters() {
    onSearchChange("")
    onCategoryChange("all")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Search bar + sort */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events, locations..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="w-full sm:w-48">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Soonest first</SelectItem>
            <SelectItem value="spots">Most spots left</SelectItem>
            <SelectItem value="popular">Most popular</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onCategoryChange("all")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
            selectedCategory === "all"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              onCategoryChange(selectedCategory === cat.id ? "all" : cat.id)
            }
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              selectedCategory === cat.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Active filter info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {resultCount} {resultCount === 1 ? "event" : "events"} found
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={clearFilters}>
            <X className="size-3.5" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  )
}
