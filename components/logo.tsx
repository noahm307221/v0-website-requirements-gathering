import { cn } from "@/lib/utils"

interface LogoProps {
  className?: string
  iconOnly?: boolean
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {/* Custom balance mark -- two arcs forming an abstract "B" / balance symbol */}
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="28" height="28" rx="7" className="fill-foreground" />
        {/* Top arc */}
        <path
          d="M8 8C8 8 11 8 14 8C17 8 19 9.5 19 12C19 14.5 17 14 14 14"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="text-background"
        />
        {/* Bottom arc - wider */}
        <path
          d="M8 14C8 14 11 14 14 14C18 14 20 15.5 20 18C20 20.5 17 20 14 20C11 20 8 20 8 20"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="text-background"
        />
        {/* Vertical stem */}
        <path
          d="M8 7L8 21"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          className="text-background"
        />
      </svg>
      {!iconOnly && (
        <span className="text-[1.15rem] font-semibold tracking-tight text-foreground">
          balance
        </span>
      )}
    </span>
  )
}
