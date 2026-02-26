import Link from "next/link"
import { Separator } from "@/components/ui/separator"

const footerLinks = {
  platform: [
    { href: "/events", label: "Browse Events" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#categories", label: "Activities" },
  ],
  company: [
    { href: "/#contact", label: "Contact" },
    { href: "#", label: "About" },
    { href: "#", label: "Careers" },
  ],
  legal: [
    { href: "#", label: "Privacy" },
    { href: "#", label: "Terms" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t bg-secondary/40">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          {/* Brand */}
          <div className="flex max-w-xs flex-col gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">B</span>
              </div>
              <span className="text-xl font-semibold tracking-tight text-foreground">
                Balance
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Connecting you with local sports clubs and health communities. Find your people, move together.
            </p>
            <p className="mt-2 rounded-md bg-accent px-3 py-2 text-xs font-medium text-accent-foreground">
              Coming soon to iOS & Android
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-16">
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-foreground">Platform</h4>
              {footerLinks.platform.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-foreground">Company</h4>
              {footerLinks.company.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-foreground">Legal</h4>
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="text-xs text-muted-foreground">
            {'2026 Balance. All rights reserved.'}
          </p>
        </div>
      </div>
    </footer>
  )
}
