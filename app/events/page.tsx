import { Suspense } from "react"
import type { Metadata } from "next"
import { EventsContent } from "@/components/events/events-content"

export const metadata: Metadata = {
  title: "Browse Events | Balance",
  description:
    "Discover sports events, fitness activities, and club meetups happening near you.",
}

function EventsSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      
      {/* ── FILTERS & SEARCH SKELETON ── */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="flex gap-2 w-full md:w-auto overflow-hidden">
          <div className="h-10 w-24 rounded-full bg-slate-200/80 shrink-0" />
          <div className="h-10 w-32 rounded-full bg-slate-200/80 shrink-0" />
          <div className="h-10 w-28 rounded-full bg-slate-200/80 shrink-0" />
        </div>
        <div className="h-12 w-full md:w-72 rounded-xl bg-slate-100 shrink-0" />
      </div>
      
      {/* ── BENTO GRID SKELETON ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4 flex flex-col h-full">
            {/* Image Block */}
            <div className="h-48 w-full rounded-2xl bg-slate-200/80 mb-5 shrink-0" />
            
            {/* Content Details */}
            <div className="flex-1 flex flex-col px-2">
              <div className="flex items-center justify-between mb-3">
                <div className="h-6 w-20 rounded-md bg-slate-100" />
                <div className="h-6 w-16 rounded-md bg-slate-100" />
              </div>
              <div className="h-6 w-4/5 rounded-lg bg-slate-200/80 mb-2" />
              <div className="h-6 w-1/2 rounded-lg bg-slate-200/80 mb-4" />
              
              {/* Card Footer */}
              <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="h-4 w-24 rounded-md bg-slate-100" />
                <div className="h-10 w-28 rounded-full bg-slate-200/80" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 font-sans pb-24 overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
        
        {/* ── BOLD HEADER ── */}
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-teal-600">
            Explore
          </p>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl mb-4">
            Find your next{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">
              challenge.
            </span>
          </h1>
          <p className="max-w-xl text-lg font-medium leading-relaxed text-slate-500">
            Discover local sports events, fitness communities, and high-energy matches happening near you.
          </p>
        </div>

        {/* ── CONTENT BOUNDARY ── */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200 fill-mode-both">
          <Suspense fallback={<EventsSkeleton />}>
            <EventsContent />
          </Suspense>
        </div>
        
      </div>
    </div>
  )
}
