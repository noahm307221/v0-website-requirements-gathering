"use client"

import { SlidersHorizontal, X } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  onClearAll?: () => void
  hasActiveFilters: boolean // Added this to perfectly track all filter states
}

export function SearchFilters({
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  resultCount,
  onClearAll,
  hasActiveFilters
}: SearchFiltersProps) {

  return (
    <div className="flex flex-col gap-6 pt-5 border-t border-slate-100 mt-2">
      
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Category filter pills - Made smaller and more compact */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onCategoryChange("all")}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-all shadow-sm",
              selectedCategory === "all"
                ? "bg-teal-600 text-white shadow-md scale-105"
                : "bg-white border border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50"
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
                "rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-all shadow-sm",
                selectedCategory === cat.id
                  ? "bg-teal-600 text-white shadow-md scale-105"
                  : "bg-white border border-slate-200 text-slate-500 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50"
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={onSortChange}>
          <SelectTrigger className="h-10 w-full lg:w-48 rounded-xl bg-white border border-slate-200 shadow-sm px-4 text-sm font-bold text-slate-700 hover:border-teal-300 transition-all focus:ring-4 focus:ring-teal-50 focus:border-teal-400 focus:outline-none">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-teal-600" />
              <SelectValue placeholder="Sort by" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-slate-100 shadow-xl p-2">
            <SelectItem value="date" className="rounded-xl focus:bg-teal-50 focus:text-teal-800 cursor-pointer font-bold py-2">Soonest first</SelectItem>
            <SelectItem value="spots" className="rounded-xl focus:bg-teal-50 focus:text-teal-800 cursor-pointer font-bold py-2">Most spots left</SelectItem>
            <SelectItem value="popular" className="rounded-xl focus:bg-teal-50 focus:text-teal-800 cursor-pointer font-bold py-2">Most popular</SelectItem>
          </SelectContent>
        </Select>

      </div>

      {/* Active filter info & Global Clear (Only shows if filters are actually applied) */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {resultCount} {resultCount === 1 ? "event" : "events"} found
        </p>
        {hasActiveFilters && onClearAll && (
          <button 
            onClick={onClearAll}
            className="flex items-center gap-1.5 text-sm font-bold text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-full transition-colors"
          >
            <X className="size-4" />
            Clear all filters
          </button>
        )}
      </div>
      
    </div>
  )
}
