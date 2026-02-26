import { Mail, MapPin, Phone } from "lucide-react"
import { ContactForm } from "@/components/contact-form"

export function ContactSection() {
  return (
    <section id="contact" className="py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-16 lg:flex-row lg:gap-24">
          {/* Left column */}
          <div className="flex flex-1 flex-col gap-6">
            <p className="text-[0.8rem] font-medium uppercase tracking-widest text-muted-foreground">
              Contact
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Let{"'"}s{" "}
              <span className="font-serif italic text-accent">connect</span>
            </h2>
            <p className="max-w-md text-[0.95rem] leading-relaxed text-muted-foreground">
              Want to list your club or have a question about the platform?
              We{"'"}d love to hear from you.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center gap-3.5 text-sm text-muted-foreground">
                <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <Mail className="size-4" />
                </div>
                <span>hello@balance.app</span>
              </div>
              <div className="flex items-center gap-3.5 text-sm text-muted-foreground">
                <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <Phone className="size-4" />
                </div>
                <span>+44 20 1234 5678</span>
              </div>
              <div className="flex items-center gap-3.5 text-sm text-muted-foreground">
                <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <MapPin className="size-4" />
                </div>
                <span>London, United Kingdom</span>
              </div>
            </div>
          </div>

          {/* Right column - form */}
          <div className="flex-1">
            <div className="rounded-2xl border bg-card p-6 shadow-sm md:p-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
