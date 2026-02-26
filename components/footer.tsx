import Link from "next/link"
import { Logo } from "@/components/logo"

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
    <footer className="border-t border-border/60 bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col gap-12 md:flex-row md:justify-between">
          {/* Brand */}
          <div className="flex max-w-xs flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5">
              {/* Inverted logo for dark footer */}
              <svg
                width="28"
                height="28"
                viewBox="0 0 28 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="shrink-0"
              >
                <rect width="28" height="28" rx="7" className="fill-background" />
                <path d="M8 8C8 8 11 8 14 8C17 8 19 9.5 19 12C19 14.5 17 14 14 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-foreground" />
                <path d="M8 14C8 14 11 14 14 14C18 14 20 15.5 20 18C20 20.5 17 20 14 20C11 20 8 20 8 20" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-foreground" />
                <path d="M8 7L8 21" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="text-foreground" />
              </svg>
              <span className="text-[1.15rem] font-semibold tracking-tight text-background">
                balance
              </span>
            </Link>
            <p className="text-sm leading-relaxed text-background/60">
              Connecting you with local sports clubs and health communities.
              Find your people, move together.
            </p>
            <p className="mt-1 inline-flex w-fit rounded-md bg-background/10 px-3 py-1.5 text-xs font-medium text-background/80">
              Coming soon to iOS & Android
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-16">
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-background/40">
                Platform
              </h4>
              {footerLinks.platform.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-background/60 transition-colors hover:text-background"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-background/40">
                Company
              </h4>
              {footerLinks.company.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-background/60 transition-colors hover:text-background"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-background/40">
                Legal
              </h4>
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-background/60 transition-colors hover:text-background"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-8 md:flex-row">
          <p className="text-xs text-background/40">
            {"2026 Balance. All rights reserved."}
          </p>
        </div>
      </div>
    </footer>
  )
}
