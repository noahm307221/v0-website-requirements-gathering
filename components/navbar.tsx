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
  const pathname = usePathname()
  const router = useRouter()

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
    <header className="w-full bg-white border-b border-slate-200 z-50">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        
        <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <Logo />
        </Link>

        {/* Desktop links */}
        <div className="hidden items-center gap-1 md:flex">
          {user && (
            <Link
              href="/dashboard"
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition-all",
                pathname === "/dashboard" 
                  ? "bg-teal-50 text-teal-700" 
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              Home
            </Link>
          )}
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-bold transition-all",
                pathname === link.href 
                  ? "bg-teal-50 text-teal-700" 
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop auth buttons */}
        <div className="hidden items-center gap-2 lg:gap-3 md:flex">
          <SearchOverlay />
          
          {user ? (
            <>
              {/* Notification Bell */}
              <Link href="/notifications" className="relative p-2.5 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                <Bell className="size-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 size-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </Link>
              
              {/* --- New Protected User Dropdown --- */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full border-2 border-slate-100 bg-slate-50 pl-4 pr-3 py-1.5 text-sm font-bold text-slate-700 hover:border-teal-200 hover:bg-white hover:text-teal-700 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20">
                    <User className="size-4" />
                    <span>{user.user_metadata?.full_name?.split(" ")[0] ?? "Account"}</span>
                    <ChevronDown className="size-4 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 mt-1 shadow-xl border-slate-100 animate-in fade-in slide-in-from-top-2 duration-200">
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 focus:bg-teal-50 focus:text-teal-700">
                    <Link href="/profile" className="flex items-center gap-2 font-bold">
                      <User className="size-4" /> View Profile
                    </Link>
                  </DropdownMenuItem>
                  
                  {isUserAdmin && (
                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-2.5 focus:bg-amber-50 focus:text-amber-700">
                      <Link href="/admin" className="flex items-center gap-2 font-bold">
                        <ShieldAlert className="size-4" /> Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator className="bg-slate-100 my-1" />
                  
                  <DropdownMenuItem 
                    onClick={handleSignOut}
                    className="rounded-xl cursor-pointer py-2.5 focus:bg-rose-50 focus:text-rose-600 text-rose-500 font-bold flex items-center gap-2"
                  >
                    <LogOut className="size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link 
                href="/auth/login"
                className="rounded-full px-5 py-2 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Log in
              </Link>
              <Link 
                href="/auth/signup"
                className="flex items-center gap-1.5 rounded-full bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-teal-700 hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                Get Started
                <ArrowUpRight className="size-4" />
              </Link>
            </>
          )}
        </div>

        {/* Mobile sheet toggle */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors" aria-label="Open navigation menu">
              <Menu className="size-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 rounded-l-3xl border-l-0 shadow-2xl p-6 bg-white/95 backdrop-blur-xl">
            <SheetHeader className="mb-6 border-b border-slate-100 pb-4">
              <SheetTitle className="text-left">
                <Logo />
              </SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2">
              {user && (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-2xl px-5 py-3.5 text-base font-bold transition-colors",
                    pathname === "/dashboard" ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  Home
                </Link>
              )}
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-2xl px-5 py-3.5 text-base font-bold transition-colors",
                    pathname === link.href ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              
              <div className="mt-8 flex flex-col gap-3 pt-6 border-t border-slate-100">
                {user ? (
                  <>
                    <Link 
                      href="/profile" 
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-slate-50 border border-slate-200 px-5 py-3.5 text-base font-bold text-slate-700 hover:bg-white hover:border-teal-200 hover:text-teal-700 transition-all"
                    >
                      <User className="size-5" /> Profile
                    </Link>
                    
                    {isUserAdmin && (
                      <Link 
                        href="/admin" 
                        onClick={() => setOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
                      >
                        <ShieldAlert className="size-5" /> Manage Events
                      </Link>
                    )}

                    <button 
                      onClick={() => { handleSignOut(); setOpen(false) }}
                      className="flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-base font-bold text-rose-500 hover:bg-rose-50 transition-colors"
                    >
                      <LogOut className="size-5" /> Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link 
                      href="/auth/login" 
                      onClick={() => setOpen(false)}
                      className="rounded-2xl border-2 border-slate-100 px-5 py-3.5 text-center text-base font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Log in
                    </Link>
                    <Link 
                      href="/auth/signup" 
                      onClick={() => setOpen(false)}
                      className="rounded-2xl bg-teal-600 px-5 py-3.5 text-center text-base font-bold text-white shadow-md hover:bg-teal-700 transition-colors"
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  )
}