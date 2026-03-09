"use client"

import Link from "next/link"
import { MapPin, ArrowRight, Zap, Users } from "lucide-react"
import { format, isToday, isTomorrow } from "date-fns"
import { cn } from "@/lib/utils"

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  return format(d, "EEE, MMM do").toUpperCase()
}

export function EventsGrid({ events, onClearFilters }: any) {
  if (events.length === 0) {
    return (
      <div className="w-full py-32 flex flex-col items-center justify-center bg-white rounded-3xl border border-stone-200">
        <p className="text-3xl font-black italic uppercase text-slate-900 mb-2">No events found</p>
        <p className="text-stone-400 text-sm mb-6">Try adjusting your filters or location</p>
        <button
          onClick={onClearFilters}
          className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-teal-600 transition-colors"
        >
          Clear Filters
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {events.map((event: any) => {
        const spotsLeft = (event.spotsTotal || 0) - (event.spotsTaken || 0)
        const isUrgent = spotsLeft <= 3 && spotsLeft > 0
        const isFull = event.spotsTotal > 0 && spotsLeft <= 0
        const fillPct = event.spotsTotal
          ? Math.min(100, Math.round(((event.spotsTaken || 0) / event.spotsTotal) * 100))
          : 0

        return (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group flex flex-col bg-white rounded-3xl border border-stone-200/70 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
          >
            {/* ── Photo — taller, more dominant ── */}
            <div className="relative h-72 overflow-hidden shrink-0">
              <img
                src={event.image || "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80"}
                className="absolute inset-0 size-full object-cover group-hover:scale-105 transition-transform duration-500"
                alt=""
              />
              {/* Stronger gradient — title readable over any image */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />

              {/* Top: category + XP */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <span className="bg-white text-slate-900 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-sm">
                  {event.categoryId || "Open"}
                </span>
                <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-1.5 shadow-sm">
                  <Zap className="size-3 text-teal-400 fill-teal-400" />
                  <span className="text-[10px] font-black text-white">+150 XP</span>
                </div>
              </div>

              {/* Bottom: date line + title — sits flush at image bottom */}
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-6 pt-12">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-px w-6 bg-teal-400 inline-block" />
                  <p className="text-[10px] font-black text-teal-400 uppercase tracking-widest">
                    {formatEventDate(event.date)}
                  </p>
                </div>
                <h4 className="text-[22px] font-black text-white uppercase italic tracking-tight leading-tight group-hover:text-teal-200 transition-colors line-clamp-2">
                  {event.title}
                </h4>
              </div>
            </div>

            {/* ── Details — compact, purposeful ── */}
            <div className="px-6 py-5 flex flex-col gap-4">

              {/* Location + spots badge on one line */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-stone-500 flex items-center gap-1.5 truncate min-w-0">
                  <MapPin className="size-3.5 text-teal-500 shrink-0" />
                  <span className="truncate">{event.location}</span>
                </p>
                {isFull ? (
                  <span className="text-[11px] font-black px-3 py-1 rounded-xl bg-stone-100 text-stone-400 border border-stone-200 shrink-0">Full</span>
                ) : isUrgent ? (
                  <span className="text-[11px] font-black px-3 py-1 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 shrink-0">{spotsLeft} left</span>
                ) : event.spotsTotal > 0 ? (
                  <span className="text-[11px] font-medium text-stone-400 shrink-0">{spotsLeft} spots</span>
                ) : null}
              </div>

              {/* Capacity bar — only if spots data exists */}
              {event.spotsTotal > 0 && (
                <div className="space-y-1.5">
                  <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        fillPct >= 100 ? "bg-stone-400"
                        : fillPct >= 85 ? "bg-amber-500"
                        : "bg-teal-500"
                      )}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-stone-400 font-medium">
                    {event.spotsTaken || 0} / {event.spotsTotal} attending
                  </p>
                </div>
              )}

              {/* Footer row: attendee avatars + arrow */}
              <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {[1, 2, 3].map(n => (
                      <div key={n} className="size-7 rounded-lg border-2 border-white bg-stone-100 flex items-center justify-center">
                        <Users className="size-3 text-stone-300" />
                      </div>
                    ))}
                  </div>
                  {(event.spotsTaken || 0) > 3 && (
                    <span className="text-[11px] font-medium text-stone-400">+{(event.spotsTaken || 0) - 3}</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    View
                  </span>
                  <div className="size-9 rounded-xl bg-slate-900 group-hover:bg-teal-500 flex items-center justify-center transition-colors shadow-sm">
                    <ArrowRight className="size-4 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}