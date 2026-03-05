"use client"

import { Suspense } from "react"
import { EventsContent } from "@/components/events/events-content"

// ── SKELETON LOADER (Updated to match the new wide style) ──
function EventsSkeleton() {
  return (
    <div className="animate-pulse space-y-12">
      <div className="h-40 w-2/3 bg-slate-200 rounded-[3rem]" />
      <div className="h-24 w-full bg-slate-200 rounded-[2.5rem]" />
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[500px] rounded-[3.5rem] bg-slate-100" />
        ))}
      </div>
    </div>
  )
}

export default function EventsPage() {
  return (
    // Changed bg-slate-50 to #FDFDFD to match the dashboard
    // Changed max-w-6xl to max-w-[1800px] (or remove completely to let Content handle it)
    <div className="min-h-screen bg-[#FDFDFD] font-sans pb-24">
      <div className="mx-auto max-w-[1900px] px-4 sm:px-8 py-12">
        
        {/* ── CONTENT BOUNDARY ── */}
        {/* We removed the "BOLD HEADER" section from here because it's now inside <EventsContent /> */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
          <Suspense fallback={<EventsSkeleton />}>
            <EventsContent />
          </Suspense>
        </div>
        
      </div>
    </div>
  )
}