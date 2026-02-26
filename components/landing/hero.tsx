import Image from "next/image"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <Image
          src="/images/hero.jpg"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
      </div>

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 py-28 text-center md:py-40">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground">
          <span className="inline-block size-2 rounded-full bg-primary" />
          Now connecting communities near you
        </div>

        <h1 className="max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl md:leading-tight">
          Find your tribe.{" "}
          <span className="text-primary">Move together.</span>
        </h1>

        <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
          Discover local sports clubs, health communities, and fitness events.
          From padel to running, yoga to cycling -- find your people and get
          moving.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Button size="lg" className="gap-2 px-8" asChild>
            <Link href="/events">
              Browse Events
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button variant="outline" size="lg" className="px-8" asChild>
            <Link href="#how-it-works">How It Works</Link>
          </Button>
        </div>

        {/* Trust indicators */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex size-8 items-center justify-center rounded-full border-2 border-background bg-accent text-xs font-medium text-accent-foreground"
                >
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <span>10,000+ members</span>
          </div>
          <div className="hidden h-4 w-px bg-border sm:block" />
          <span>500+ clubs</span>
          <div className="hidden h-4 w-px bg-border sm:block" />
          <span>200+ events this month</span>
        </div>
      </div>
    </section>
  )
}
