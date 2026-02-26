import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        {/* Left -- copy */}
        <div className="flex flex-1 flex-col justify-center px-6 py-20 lg:py-28 lg:pr-16">
          <p className="mb-5 text-[0.8rem] font-medium uppercase tracking-widest text-muted-foreground">
            Community-powered fitness
          </p>

          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Your city is full of{" "}
            <span className="font-serif italic text-accent">people</span>{" "}
            who move like you
          </h1>

          <p className="mt-6 max-w-md text-[1.05rem] leading-relaxed text-muted-foreground">
            Discover local sports clubs, health communities and fitness events.
            From padel to running, yoga to cycling -- find your people and
            get moving.
          </p>

          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Button size="lg" className="gap-2 rounded-lg px-7 text-[0.9rem]" asChild>
              <Link href="/events">
                Browse Events
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="lg" className="text-[0.9rem] text-muted-foreground" asChild>
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>

          {/* Social proof strip */}
          <div className="mt-14 flex items-center gap-6 border-t border-border/60 pt-8">
            <div className="flex -space-x-2.5">
              {["A", "J", "M", "S", "R"].map((letter) => (
                <div
                  key={letter}
                  className="flex size-9 items-center justify-center rounded-full border-2 border-background bg-secondary text-xs font-semibold text-secondary-foreground"
                >
                  {letter}
                </div>
              ))}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">10,000+ members</span>
              <span className="text-xs text-muted-foreground">across 15 cities</span>
            </div>
          </div>
        </div>

        {/* Right -- image grid */}
        <div className="relative flex-1 lg:min-h-[600px]">
          <div className="grid h-full grid-cols-2 gap-1.5 p-1.5 lg:absolute lg:inset-0 lg:p-0 lg:gap-1">
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl lg:rounded-none lg:rounded-tl-none">
              <Image
                src="/images/padel.jpg"
                alt="Padel players in action"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl lg:rounded-none">
              <Image
                src="/images/running.jpg"
                alt="Running club in a park"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl lg:rounded-none">
              <Image
                src="/images/yoga.jpg"
                alt="Outdoor yoga session"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl lg:rounded-none">
              <Image
                src="/images/cycling.jpg"
                alt="Community cycling event"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
            </div>
          </div>

          {/* Stats overlay on the image grid */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-foreground/60 to-transparent p-8 lg:flex">
            <div className="pointer-events-auto flex w-full justify-between text-background">
              <div>
                <span className="text-2xl font-bold">500+</span>
                <p className="text-xs opacity-80">Sports Clubs</p>
              </div>
              <div>
                <span className="text-2xl font-bold">200+</span>
                <p className="text-xs opacity-80">Monthly Events</p>
              </div>
              <div>
                <span className="text-2xl font-bold">15</span>
                <p className="text-xs opacity-80">Cities</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
