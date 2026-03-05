"use client"

import { SlidersHorizontal, X, ChevronDown, Zap, Target } from "lucide-react"
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
  locationEnabled
}: SearchFiltersProps) {

  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* ROW 1: SPREAD OUT SPORTS MODALITIES */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => onCategoryChange("all")}
          className={cn(
            "rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-[0.25em] transition-all whitespace-nowrap border",
            selectedCategory === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-105"
              : "bg-white border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-300"
          )}
        >
          All Modalities
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(selectedCategory === cat.id ? "all" : cat.id)}
            className={cn(
              "rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-[0.25em] transition-all whitespace-nowrap border",
              selectedCategory === cat.id
                ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-105"
                : "bg-white border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-300"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* ROW 2: ANALYTICS & CONTROLS */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 pt-4 border-t border-slate-100/50">
        
        <div className="flex items-center gap-6">
          {/* Result Count Module */}
          <div className="flex items-center gap-2">
            <div className="size-2 bg-teal-500 rounded-full animate-pulse" />
            <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em]">
              {resultCount} {resultCount === 1 ? "Module" : "Modules"} Detected
            </p>
          </div>

          {/* Range Matrix (Visible when location is active) */}
          {locationEnabled && (
            <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg shadow-slate-200">
              <Target className="size-3 text-teal-400" />
              <span className="text-[9px] font-black uppercase tracking-widest mr-2">Range Matrix:</span>
              <div className="flex gap-3">
                {[5, 10, 25, 50].map(r => (
                  <button 
                    key={r} 
                    onClick={() => onRadiusChange(r)}
                    className={cn(
                      "text-[9px] font-black transition-all",
                      radius === r ? "text-teal-400 scale-125 underline decoration-2 underline-offset-4" : "text-slate-400 hover:text-white"
                    )}
                  >
                    {r}M
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          <Select value={sortBy} onValueChange={onSortChange}>
            <SelectTrigger className="h-12 w-52 bg-white border border-slate-200 rounded-xl px-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 hover:border-teal-500 transition-all outline-none shadow-sm">
               <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-3.5 text-teal-500" />
                  <SelectValue placeholder="Sort Matrix" />
               </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-slate-100 p-2 shadow-2xl">
              <SelectItem value="date" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-3 cursor-pointer">Soonest</SelectItem>
              <SelectItem value="spots" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-3 cursor-pointer">Capacity</SelectItem>
              <SelectItem value="popular" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-3 cursor-pointer">Trending</SelectItem>
              <SelectItem value="distance" className="rounded-xl font-black text-[10px] uppercase tracking-widest py-3 cursor-pointer">Proximity</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <button 
              onClick={onClearAll} 
              className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest px-5 py-3 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
            >
               <X className="size-3.5" /> Reset Matrix
            </button>
          )}
        </div>
      </div>
    </div>
  )
}