import Link from "next/link"
import Image from "next/image"
import { Calendar, Clock, MapPin, Users } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Event } from "@/lib/data"
import { getCategoryById } from "@/lib/data"

interface EventCardProps {
  event: Event
  className?: string
}

export function EventCard({ event, className }: EventCardProps) {
  const category = getCategoryById(event.categoryId)
  const spotsLeft = event.spotsTotal - event.spotsTaken
  const almostFull = spotsLeft <= 5

  return (
    <Link href={`/events/${event.id}`}>
      <article
        className={cn(
          "group overflow-hidden rounded-xl border border-border/60 bg-card transition-all duration-200 hover:border-foreground/20 hover:shadow-lg cursor-pointer",
          className,
        )}
      >
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={event.image}
            alt={event.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-foreground/30 to-transparent" />
          {category && (
            <Badge
              className={cn(
                "absolute top-3 left-3 border-none text-xs font-medium",
                category.color,
              )}
            >
              {category.name}
            </Badge>
          )}
          {event.price === "Free" ? (
            <Badge className="absolute top-3 right-3 border-none bg-foreground text-background text-xs font-medium">
              Free
            </Badge>
          ) : (
            <Badge variant="secondary" className="absolute top-3 right-3 border-none text-xs font-medium">
              {event.price}
            </Badge>
          )}
        </div>

        <div className="flex flex-col gap-3 p-5">
          <div>
            <h3 className="text-[0.95rem] font-semibold leading-snug text-foreground">
              {event.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="size-3.5 shrink-0" />
              <span>{format(new Date(event.date), "EEE, MMM d")}</span>
              <span className="text-border">|</span>
              <Clock className="size-3.5 shrink-0" />
              <span>{event.time}</span>
              {event.duration && (
                <>
                  <span className="text-border">|</span>
                  <span>{event.duration}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-border/60 pt-3">
            <Users className="size-3.5 shrink-0 text-muted-foreground" />
            <span
              className={cn(
                "text-sm font-medium",
                almostFull ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {spotsLeft} spots left
            </span>
            <div className="ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  almostFull ? "bg-destructive" : "bg-accent",
                )}
                style={{
                  width: `${(event.spotsTaken / event.spotsTotal) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
}