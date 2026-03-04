import { Suspense } from "react"
import type { Metadata } from "next"
import { EventsContent } from "@/components/events/events-content"

export const metadata: Metadata = {
  title: "Browse Events",
  description:
    "Discover sports events, fitness activities, and club meetups happening near you.",
}

function EventsSkeleton() {
  return (
    <div className="animate-pulse space-y-8 mt-10">
      {/* Fake filters/search bar skeleton */}
      <div className="flex gap-3">
        <div className="h-12 w-full max-w-sm rounded-full bg-slate-200/60" />
        <div className="h-12 w-24 rounded-full bg-slate-200/60 hidden sm:block" />
      </div>
      
      {/* Bento box card skeletons */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[340px] rounded-[2rem] bg-white border border-slate-100 shadow-sm p-5 flex flex-col">
            <div className="flex-1 rounded-2xl bg-slate-100 mb-5" />
            <div className="space-y-3 px-1">
              <div className="h-4 w-24 rounded-full bg-slate-100" />
              <div className="h-6 w-3/4 rounded-lg bg-slate-200" />
              <div className="h-4 w-1/2 rounded-lg bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EventsPage() {
  return (
    <div className="min-h-screen bg-slate-50/50 font-sans pb-24">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-16">
        
        {/* Bold New Header */}
        <div className="mb-12">
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

        {/* Content Boundary */}
        <Suspense fallback={<EventsSkeleton />}>
          <EventsContent />
        </Suspense>
        
      </div>
    </div>
  )
}
