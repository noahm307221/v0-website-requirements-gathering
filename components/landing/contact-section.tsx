import { Mail, MapPin, Phone } from "lucide-react"
import { ContactForm } from "@/components/contact-form"

export function ContactSection() {
  return (
    <section id="contact" className="py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col gap-16 lg:flex-row">
          {/* Left column */}
          <div className="flex flex-1 flex-col gap-6">
            <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl text-balance">
              Get in touch
            </h2>
            <p className="max-w-md text-lg leading-relaxed text-muted-foreground text-pretty">
              Have a question or want to list your club? We'd love to hear from
              you. Send us a message and we'll get back to you as soon as
              possible.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Mail className="size-4" />
                </div>
                <span>hello@balance.app</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Phone className="size-4" />
                </div>
                <span>+44 20 1234 5678</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <div className="flex size-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
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
