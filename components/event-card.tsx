import Image from "next/image"
import { Calendar, Clock, MapPin, Users } from "lucide-react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
    <Card
      className={cn(
        "group overflow-hidden border transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
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
          <Badge className="absolute top-3 right-3 border-none bg-primary text-primary-foreground text-xs font-medium">
            Free
          </Badge>
        ) : (
          <Badge variant="secondary" className="absolute top-3 right-3 border-none text-xs font-medium">
            {event.price}
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-1 text-base">{event.title}</CardTitle>
        <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">
          {event.description}
        </p>
      </CardHeader>

      <CardContent className="flex flex-col gap-2 pb-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="size-3.5 shrink-0" />
          <span>{format(new Date(event.date), "EEE, MMM d")}</span>
          <Clock className="ml-2 size-3.5 shrink-0" />
          <span>{event.time}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Users className="size-3.5 shrink-0 text-muted-foreground" />
          <span
            className={cn(
              "font-medium",
              almostFull ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {spotsLeft} spots left
          </span>
          <div className="ml-auto h-1.5 w-20 overflow-hidden rounded-full bg-secondary">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                almostFull ? "bg-destructive" : "bg-primary",
              )}
              style={{
                width: `${(event.spotsTaken / event.spotsTotal) * 100}%`,
              }}
            />
          </div>
        </div>
      </CardContent>

      <CardFooter>
        <Button className="w-full" size="sm">
          View Details
        </Button>
      </CardFooter>
    </Card>
  )
}
