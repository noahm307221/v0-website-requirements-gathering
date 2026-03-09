"use client"

import { SlidersHorizontal, X, Target } from "lucide-react"
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
  selectedCategory: string
  onCategoryChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
  resultCount: number
  onClearAll?: () => void
  hasActiveFilters: boolean
  radius: number
  onRadiusChange: (value: number) => void
  locationEnabled: boolean
}

export function SearchFilters({
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  resultCount,
  onClearAll,
  hasActiveFilters,
  radius,
  onRadiusChange,
  locationEnabled,
}: SearchFiltersProps) {
  return (
    <div className="flex flex-col gap-5">

      {/* Category pills — styled for dark background */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onCategoryChange("all")}
          className={cn(
            "rounded-2xl px-5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all border whitespace-nowrap",
            selectedCategory === "all"
              ? "bg-white text-slate-900 border-white"
              : "bg-white/8 border-white/10 text-stone-400 hover:text-white hover:bg-white/15 hover:border-white/20"
          )}
        >
          All Sports
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(selectedCategory === cat.id ? "all" : cat.id)}
            className={cn(
              "rounded-2xl px-5 py-2.5 text-[11px] font-black uppercase tracking-wider transition-all border whitespace-nowrap",
              selectedCategory === cat.id
                ? "bg-white text-slate-900 border-white"
                : "bg-white/8 border-white/10 text-stone-400 hover:text-white hover:bg-white/15 hover:border-white/20"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Second row: count + radius + sort + clear */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-5">
          {/* Live count */}
          <div className="flex items-center gap-2">
            <span className="size-1.5 bg-teal-400 rounded-full animate-pulse" />
            <span className="text-[11px] font-black text-stone-400 uppercase tracking-wider">
              {resultCount} {resultCount === 1 ? "event" : "events"} found
            </span>
          </div>

          {/* Radius — only when location active */}
          {locationEnabled && (
            <div className="flex items-center gap-3 bg-white/8 border border-white/10 px-4 py-2 rounded-2xl">
              <Target className="size-3 text-teal-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 mr-1">Within</span>
              <div className="flex gap-1">
                {[5, 10, 25, 50].map(r => (
                  <button
                    key={r}
                    onClick={() => onRadiusChange(r)}
                    className={cn(
                      "text-[10px] font-black px-2.5 py-1 rounded-xl transition-all",
                      radius === r ? "bg-teal-500 text-slate-900" : "text-stone-500 hover:text-white"
                    )}
                  >
                    {r}mi
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="h-10 w-44 bg-white/8 border border-white/10 hover:border-white/20 rounded-2xl px-4 text-[11px] font-black uppercase tracking-wider text-stone-400 hover:text-white outline-none shadow-none transition-all focus:ring-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-teal-400" />
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-stone-200 p-2 shadow-xl bg-white">
              <SelectItem value="date"     className="rounded-xl text-[11px] font-black uppercase tracking-wider py-2.5 cursor-pointer">Soonest</SelectItem>
              <SelectItem value="spots"    className="rounded-xl text-[11px] font-black uppercase tracking-wider py-2.5 cursor-pointer">Most Spots</SelectItem>
              <SelectItem value="popular"  className="rounded-xl text-[11px] font-black uppercase tracking-wider py-2.5 cursor-pointer">Most Popular</SelectItem>
              <SelectItem value="distance" className="rounded-xl text-[11px] font-black uppercase tracking-wider py-2.5 cursor-pointer">Nearest</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 text-[11px] font-black text-stone-500 hover:text-rose-400 uppercase tracking-wider px-4 py-2 rounded-2xl transition-colors"
            >
              <X className="size-3.5" /> Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}