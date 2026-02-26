"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"

const navLinks = [
  { href: "/events", label: "Events" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/#contact", label: "Contact" },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <Logo />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3.5 py-2 text-[0.84rem] font-medium transition-colors hover:text-foreground",
                pathname === link.href
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
            <Link href="/events">Log in</Link>
          </Button>
          <Button size="sm" className="gap-1.5 rounded-lg" asChild>
            <Link href="/events">
              Get Started
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile sheet */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle className="text-left">
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <div className="mt-8 flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary hover:text-foreground",
                    pathname === link.href
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <div className="mt-6 flex flex-col gap-2 px-4">
                <Button variant="outline" className="rounded-lg" asChild>
                  <Link href="/events" onClick={() => setOpen(false)}>Log in</Link>
                </Button>
                <Button className="rounded-lg" asChild>
                  <Link href="/events" onClick={() => setOpen(false)}>Get Started</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}
