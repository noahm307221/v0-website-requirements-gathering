import { Search, UserPlus, Activity } from "lucide-react"

const steps = [
  {
    icon: Search,
    number: "01",
    title: "Discover",
    description:
      "Browse events and clubs in your area. Filter by sport, date, and distance to find what moves you.",
  },
  {
    icon: UserPlus,
    number: "02",
    title: "Join",
    description:
      "Reserve your spot with one tap. Get all the info you need -- location, time, what to bring.",
  },
  {
    icon: Activity,
    number: "03",
    title: "Move",
    description:
      "Show up, get active, meet your community. Track your sessions and discover new favourites.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-[0.8rem] font-medium uppercase tracking-widest text-muted-foreground">
              How it works
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Three steps to{" "}
              <span className="font-serif italic text-accent">moving</span>
            </h2>
          </div>
          <p className="max-w-sm text-[0.95rem] leading-relaxed text-muted-foreground lg:text-right">
            Getting started takes under a minute. No commitments, no subscriptions, just show up.
          </p>
        </div>

        <div className="mt-16 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="group flex flex-col gap-5 bg-card p-8 transition-colors hover:bg-secondary/60 lg:p-10"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-11 items-center justify-center rounded-xl bg-secondary text-foreground transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  <step.icon className="size-5" />
                </div>
                <span className="text-3xl font-bold tabular-nums text-border transition-colors group-hover:text-accent/40">
                  {step.number}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
