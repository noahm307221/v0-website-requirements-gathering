import { Search, UserPlus, Activity } from "lucide-react"

const steps = [
  {
    icon: Search,
    title: "Discover",
    description:
      "Browse events and clubs in your area. Filter by activity, date, and location to find exactly what you're looking for.",
  },
  {
    icon: UserPlus,
    title: "Join",
    description:
      "Sign up for events with a single tap. Reserve your spot and get all the details you need to show up ready.",
  },
  {
    icon: Activity,
    title: "Move",
    description:
      "Show up, get active, and meet your community. Track your activities and discover new favourites along the way.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
            Getting started is simple
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            Three steps to finding your next favourite activity
          </p>
        </div>

        <div className="mt-16 flex flex-col gap-8 md:flex-row md:gap-12">
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="group relative flex flex-1 flex-col items-center text-center"
            >
              {/* Step number connector */}
              {index < steps.length - 1 && (
                <div className="absolute top-7 left-1/2 hidden h-px w-full bg-border md:block" />
              )}

              <div className="relative mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <step.icon className="size-6" />
                <span className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                  {index + 1}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-foreground">
                {step.title}
              </h3>
              <p className="mt-2 max-w-xs leading-relaxed text-muted-foreground text-pretty">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
