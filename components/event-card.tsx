import Link from "next/link"
import Image from "next/image"
import { Calendar, Clock, MapPin, Users } from "lucide-react"
import { format, isToday, isTomorrow } from "date-fns"
import { cn } from "@/lib/utils"
import type { Event } from "@/lib/data"
import { getCategoryById } from "@/lib/data"

interface EventCardProps {
  event: Event
  className?: string
}

function formatEventDate(dateStr: string) {
  const d = new Date(dateStr)
  if (isToday(d)) return "Today"
  if (isTomorrow(d)) return "Tomorrow"
  return format(d, "EEE, MMM do")
}

export function EventCard({ event, className }: EventCardProps) {
  const category = getCategoryById(event.categoryId)
  const spotsLeft = event.spotsTotal - event.spotsTaken
  const almostFull = spotsLeft <= 5

  return (
    <Link href={`/events/${event.id}`} className="block h-full">
      <article
        className={cn(
          "group relative flex flex-col h-full overflow-hidden rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer",
          className,
        )}
      >
        {/* Edge-to-Edge Image Section */}
        <div className="relative h-56 w-full overflow-hidden shrink-0 bg-slate-100">
          {event.image ? (
            <Image
              src={event.image}
              alt={event.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-teal-400 to-cyan-400" />
          )}
          
          {/* Subtle gradient overlay to make tags pop */}
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-900/40 to-transparent" />
          
          {/* Top Tags (Category & Date) */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-2">
            <span className="bg-lime-300 text-slate-800 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
              {formatEventDate(event.date)}
            </span>
            
            <div className="flex flex-col gap-2 items-end">
              {event.price === "Free" || event.price === "0" ? (
                <span className="bg-white text-slate-900 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
                  Free
                </span>
              ) : (
                <span className="bg-slate-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border border-white/10">
                  {event.price}
                </span>
              )}
              {category && (
                <span className="bg-white/20 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/20 shadow-sm capitalize">
                  {category.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Card Content */}
        <div className="flex flex-col flex-1 p-6 sm:p-7">
          <div className="mb-4">
            <h3 className="text-xl font-black leading-tight text-slate-800 line-clamp-2 group-hover:text-teal-500 transition-colors">
              {event.title}
            </h3>
            <p className="mt-2 line-clamp-2 text-sm font-medium leading-relaxed text-slate-500">
              {event.description}
            </p>
          </div>

          <div className="flex flex-col gap-2.5 text-sm font-medium text-slate-500 mb-6">
            <div className="flex items-center gap-2.5">
              <Clock className="size-4 text-teal-500 shrink-0" />
              <span>{event.time}</span>
              {event.duration && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>{event.duration}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <MapPin className="size-4 text-teal-500 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>

          {/* Spots Left / Progress Footer (Pushed to bottom) */}
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2">
              <Users className={cn("size-4 shrink-0", almostFull ? "text-rose-500" : "text-slate-400")} />
              <span className={cn("text-sm font-bold", almostFull ? "text-rose-500" : "text-slate-600")}>
                {spotsLeft} spots left
              </span>
            </div>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  almostFull ? "bg-rose-400" : "bg-gradient-to-r from-teal-400 to-cyan-400",
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