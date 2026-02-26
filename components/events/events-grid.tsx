import { CalendarOff } from "lucide-react"
import { EventCard } from "@/components/event-card"
import { Button } from "@/components/ui/button"
import type { Event } from "@/lib/data"

interface EventsGridProps {
  events: Event[]
  onClearFilters: () => void
}

export function EventsGrid({ events, onClearFilters }: EventsGridProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
          <CalendarOff className="size-8" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No events found</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Try adjusting your search or filters to find events that match what
          you're looking for.
        </p>
        <Button variant="outline" onClick={onClearFilters}>
          Clear all filters
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  )
}
