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
    <div className="animate-pulse space-y-6">
      <div className="h-12 rounded-lg bg-muted" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}

export default function EventsPage() {
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

      <Suspense fallback={<EventsSkeleton />}>
        <EventsContent />
      </Suspense>
    </div>
  )
}
