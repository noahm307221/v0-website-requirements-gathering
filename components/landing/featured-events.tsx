import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EventCard } from "@/components/event-card"
import { getFeaturedEvents } from "@/lib/data"

export function FeaturedEvents() {
  const events = getFeaturedEvents()

  return (
    <section className="bg-secondary/30 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
              Upcoming events
            </h2>
            <p className="mt-2 text-lg text-muted-foreground">
              Popular events happening in your area
            </p>
          </div>
          <Button variant="ghost" className="gap-2" asChild>
            <Link href="/events">
              View all events
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </section>
  )
}
