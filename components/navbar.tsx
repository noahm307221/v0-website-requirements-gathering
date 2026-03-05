"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, ArrowUpRight, User, Bell, LogOut, ShieldAlert, ChevronDown } from "lucide-react"
import { SearchOverlay } from "@/components/search"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/logo"
import { supabase, isAdmin } from "@/lib/supabase"

const navLinks = [
  { href: "/events", label: "Events" },
  { href: "/community", label: "Community" },
  { href: "/compete", label: "Compete" },
]

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)
  
  const pathname = usePathname()
  const router = useRouter()

  // Dynamic link array (Adds 'Home' to the start if logged in)
  const desktopLinks = user ? [{ href: "/dashboard", label: "Home" }, ...navLinks] : navLinks

  // Handle scroll effect for glassmorphism
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      setUser(user)
      if (user?.email) {
        isAdmin(user.email).then(setIsUserAdmin)
      }
      if (user?.id) {
        const { count } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false)
        setUnreadCount(count ?? 0)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user?.email) {
        isAdmin(session.user.email).then(setIsUserAdmin)
      } else {
        setIsUserAdmin(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <header 
      className={cn(
        "sticky top-0 w-full z-50 transition-all duration-300",
        isScrolled 
          ? "bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm" 
          : "bg-white border-b border-slate-100"
      )}
    >
      <nav className="relative mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        
        {/* ── LEFT: LOGO ── */}
        <div className="flex w-1/4 items-center justify-start">
          <Link href="/" className="flex items-center hover:opacity-70 hover:scale-105 active:scale-95 transition-all duration-200">
            <Logo />
          </Link>
        </div>

        {/* ── CENTER: LINKS (Absolutely centered to prevent layout breaking) ── */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-8">
          {desktopLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative text-sm font-bold transition-all duration-200 hover:text-slate-900 active:scale-95",
                  isActive ? "text-slate-900" : "text-slate-500"
                )}
              >
                {link.label}
                {/* Minimal dot indicator for active state */}
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-slate-900" />
                )}
              </Link>
            )
          })}
        </div>

        {/* ── RIGHT: ACTIONS ── */}
        <div className="flex w-1/4 items-center justify-end gap-3 lg:gap-4">
          <div className="hidden md:block">
            <SearchOverlay />
          </div>
          
          {user ? (
            <>
              {/* Notification Bell */}
              <Link href="/notifications" className="relative p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:scale-95 transition-all duration-200 hidden md:block">
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500 border-2 border-white" />
                )}
              </Link>
              
              {/* Profile Dropdown (Sleek Avatar style) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="group flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1 pr-3 hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                    <div className="size-7 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0">
                      <User className="size-4 text-slate-500" />
                    </div>
                    <span className="text-sm font-bold text-slate-700 hidden sm:block">
                      {user.user_metadata?.full_name?.split(" ")[0] ?? "Account"}
                    </span>
                    <ChevronDown className="size-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent 
                  align="end" 
                  className="w-48 rounded-2xl p-2 mt-2 shadow-xl border-slate-100 origin-top-right animate-in fade-in zoom-in-95 duration-200"
                >
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 focus:bg-teal-50 focus:text-teal-700 transition-colors">
                    <Link href="/profile" className="flex items-center gap-2 font-bold group">
                      <User className="size-4 text-slate-400 group-hover:text-teal-600 transition-colors" /> View Profile
                    </Link>
                  </DropdownMenuItem>
                  
                  {isUserAdmin && (
                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 focus:bg-amber-50 focus:text-amber-700 transition-colors">
                      <Link href="/admin" className="flex items-center gap-2 font-bold group">
                        <ShieldAlert className="size-4 text-slate-400 group-hover:text-amber-600 transition-colors" /> Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator className="bg-slate-100 my-1" />
                  
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="rounded-xl cursor-pointer py-2.5 focus:bg-rose-50 focus:text-rose-600 text-rose-500 font-bold flex items-center gap-2 group transition-colors"
                  >
                    <LogOut className="size-4 text-rose-400 group-hover:text-rose-600 transition-colors" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link 
                href="/auth/login"
                className="rounded-full px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 active:scale-95 transition-all duration-200"
              >
                Log in
              </Link>
              <Link 
                href="/auth/signup"
                className="group flex items-center gap-1.5 rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-slate-800 hover:shadow-lg active:scale-95 transition-all duration-200"
              >
                Get Started
                <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 opacity-70" />
              </Link>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-full active:scale-90 transition-all duration-200 ml-1" aria-label="Open navigation menu">
                <Menu className="size-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 rounded-l-[2rem] border-l-0 shadow-2xl p-6 bg-white/95 backdrop-blur-xl">
              <SheetHeader className="mb-6 border-b border-slate-100 pb-4">
                <SheetTitle className="text-left">
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2">
                {desktopLinks.map((link) => {
                  const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "rounded-2xl px-5 py-3.5 text-base font-bold transition-all active:scale-95 flex items-center justify-between",
                        isActive ? "bg-slate-50 text-slate-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {link.label}
                      {isActive && <span className="size-1.5 rounded-full bg-slate-900" />}
                    </Link>
                  )
                })}
                
                <div className="mt-8 flex flex-col gap-3 pt-6 border-t border-slate-100">
                  {user ? (
                    <>
                      <Link 
                        href="/profile" 
                        onClick={() => setOpen(false)}
                        className="group flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 px-5 py-3.5 text-base font-bold text-slate-700 hover:border-teal-300 hover:text-teal-700 active:scale-95 transition-all shadow-sm"
                      >
                        <User className="size-5 text-slate-400 group-hover:text-teal-600 transition-colors" /> Profile
                      </Link>
                      
                      {isUserAdmin && (
                        <Link 
                          href="/admin" 
                          onClick={() => setOpen(false)}
                          className="group flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 active:scale-95 transition-all"
                        >
                          <ShieldAlert className="size-5 text-amber-500 transition-transform group-hover:scale-110" /> Manage Events
                        </Link>
                      )}

                      <button 
                        onClick={() => { handleSignOut(); setOpen(false) }}
                        className="group flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-bold text-rose-600 hover:bg-rose-50 active:scale-95 transition-all"
                      >
                        <LogOut className="size-5 text-rose-400 group-hover:text-rose-600 transition-colors" /> Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link 
                        href="/auth/login" 
                        onClick={() => setOpen(false)}
                        className="rounded-2xl border border-slate-200 px-5 py-3.5 text-center text-base font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                      >
                        Log in
                      </Link>
                      <Link 
                        href="/auth/signup" 
                        onClick={() => setOpen(false)}
                        className="group flex items-center justify-center gap-1.5 rounded-2xl bg-slate-900 px-5 py-3.5 text-center text-base font-bold text-white shadow-md hover:bg-slate-800 active:scale-95 transition-all"
                      >
                        Get Started
                        <ArrowUpRight className="size-4 opacity-70 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}