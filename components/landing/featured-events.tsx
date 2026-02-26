import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EventCard } from "@/components/event-card"
import { getFeaturedEvents } from "@/lib/data"

export function FeaturedEvents() {
  const events = getFeaturedEvents()

  return (
    <section className="border-y border-border/60 bg-secondary/40 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-[0.8rem] font-medium uppercase tracking-widest text-muted-foreground">
              What{"'"}s on
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Upcoming{" "}
              <span className="font-serif italic text-accent">events</span>
            </h2>
          </div>
          <Button variant="outline" className="gap-2 rounded-lg" asChild>
            <Link href="/events">
              View all events
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </section>
  )
}
