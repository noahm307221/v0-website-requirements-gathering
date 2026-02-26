import {
  Volleyball,
  Footprints,
  Flower2,
  CircleDot,
  Bike,
  Dumbbell,
  Waves,
  Mountain,
} from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Category } from "@/lib/data"

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Volleyball,
  Footprints,
  Flower2,
  CircleDot,
  Bike,
  Dumbbell,
  Waves,
  Mountain,
}

interface CategoryCardProps {
  category: Category
  className?: string
}

export function CategoryCard({ category, className }: CategoryCardProps) {
  const Icon = iconMap[category.icon]

  return (
    <Link
      href={`/events?category=${category.id}`}
      className={cn(
        "group flex flex-col items-center gap-3 rounded-xl border bg-card p-6 text-center transition-all duration-300 hover:shadow-md hover:-translate-y-1",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
          category.color,
        )}
      >
        {Icon && <Icon className="size-6" />}
      </div>
      <span className="text-sm font-medium text-foreground">{category.name}</span>
    </Link>
  )
}
