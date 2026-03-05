"use client"

import Link from "next/link"
import { MapPin, ArrowRight, Zap, User } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export function EventsGrid({ events, onClearFilters }: any) {
  if (events.length === 0) {
    return (
      <div className="w-full py-40 flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-100 rounded-[3rem]">
        <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic mb-2">MODULE NOT DETECTED.</h3>
        <button onClick={onClearFilters} className="px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em]">Reset Matrix</button>
      </div>
    )
  }

  return (
    // Expanded to 3 columns with a slightly smaller gap (gap-8) to keep them wide on the 1800px-1900px canvas
    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8 w-full max-w-[1900px] mx-auto">
      {events.map((event: any, i: number) => {
        const spotsLeft = (event.spotsTotal || 0) - (event.spotsTaken || 0)
        const isUrgent = spotsLeft <= 3 && spotsLeft > 0

        return (
          <Link 
            key={event.id} 
            href={`/events/${event.id}`}
            className="group relative flex flex-col bg-white rounded-[3.5rem] border border-slate-100 shadow-[0_15px_50px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] hover:-translate-y-2 transition-all duration-500 overflow-hidden backface-visibility-hidden transform-gpu"
          >
            {/* ── THE IMAGE MODULE ── */}
            <div className="relative h-[380px] w-full overflow-hidden rounded-[3.5rem] p-3">
              <div className="relative size-full overflow-hidden rounded-[2.8rem] isolation-isolate bg-slate-100">
                <img 
                  src={event.image || "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5"} 
                  className="absolute inset-0 size-full object-cover transition-transform duration-1000 ease-out group-hover:scale-110 will-change-transform transform-gpu" 
                  alt=""
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                
                {/* Performance Badges */}
                <div className="absolute top-6 left-6 flex items-center gap-2">
                  <span className="bg-white/95 backdrop-blur-md text-slate-900 text-[9px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl shadow-xl border border-white">
                    {event.categoryId || "PRO MODULE"}
                  </span>
                  <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 flex items-center gap-1.5 shadow-lg">
                      <Zap className="size-3 text-teal-400 fill-teal-400" />
                      <span className="text-[10px] font-black text-white tracking-tighter">+150 XP</span>
                  </div>
                </div>

                {/* Event Heading Overlay */}
                <div className="absolute bottom-6 left-8 right-8">
                   <div className="flex items-center gap-2 mb-2">
                      <div className="h-1 w-8 bg-teal-500 rounded-full" />
                      <p className="text-[10px] font-black text-teal-400 uppercase tracking-[0.3em]">
                        {format(new Date(event.date), 'EEEE, MMM do')}
                      </p>
                   </div>
                   <h4 className="text-3xl font-black text-white leading-[0.85] tracking-[-0.05em] uppercase italic transition-transform duration-500 group-hover:translate-x-1">
                      {event.title}
                   </h4>
                </div>
              </div>
            </div>

            {/* ── INTEL PANEL ── */}
            <div className="px-10 pb-10 pt-4 flex flex-col gap-6">
               <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin className="size-3 text-teal-500" /> Venue Intel
                    </p>
                    <p className="text-base font-black text-slate-700 tracking-tight line-clamp-1">{event.location}</p>
                  </div>

                  <div className={cn(
                    "flex flex-col items-end px-3 py-1.5 rounded-xl border transition-colors",
                    isUrgent ? "bg-rose-50 border-rose-100" : "bg-slate-50 border-slate-100"
                  )}>
                     <span className={cn("text-xl font-black leading-none", isUrgent ? "text-rose-600" : "text-slate-900")}>
                        {spotsLeft}
                     </span>
                     <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 mt-1">Modules Left</span>
                  </div>
               </div>

               {/* Action Line */}
               <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                  <div className="flex -space-x-3">
                    {[1, 2, 3].map(item => (
                       <div key={item} className="size-9 rounded-xl border-4 border-white bg-slate-100 flex items-center justify-center overflow-hidden shadow-sm">
                          <User className="size-3.5 text-slate-300" />
                       </div>
                    ))}
                    <div className="size-9 rounded-xl border-4 border-white bg-teal-50 flex items-center justify-center shadow-sm">
                       <span className="text-[8px] font-black text-teal-600">+{event.spotsTaken || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group/btn">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                        Initiate Access
                     </span>
                     <div className="size-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white transition-all group-hover:bg-teal-500 group-hover:rotate-12 group-hover:scale-110 shadow-lg">
                        <ArrowRight className="size-5" />
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