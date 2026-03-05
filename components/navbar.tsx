"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, ArrowUpRight, User, Bell, LogOut, ShieldAlert, ChevronDown, Zap, Search } from "lucide-react"
import { SearchOverlay } from "@/components/search"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
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
        "sticky top-0 w-full z-[100] transition-all duration-500",
        isScrolled 
          ? "bg-white/70 backdrop-blur-2xl border-b border-slate-100 h-16 shadow-[0_2px_20px_-5px_rgba(0,0,0,0.02)]" 
          : "bg-white border-transparent h-20"
      )}
    >
      <nav className="mx-auto max-w-[1800px] h-full flex items-center justify-between px-8">
        
        {/* ── LEFT: BRAND ── */}
        <div className="flex w-1/4 items-center justify-start">
          <Link href="/" className="group flex items-center gap-3 active:scale-95 transition-all">
            <div className="size-10 bg-slate-900 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500 shadow-lg shadow-slate-200">
               <Zap className="text-teal-400 size-5 fill-teal-400" />
            </div>
            <span className="font-black text-2xl tracking-[-0.06em] text-slate-900">
              balance<span className="text-teal-500">.</span>
            </span>
          </Link>
        </div>

        {/* ── CENTER: NAVIGATION ── */}
        <div className="hidden xl:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-10">
          {desktopLinks.map((link) => {
            const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "relative text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 active:scale-95",
                  isActive ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {link.label}
                {isActive && (
                  <span className="absolute -bottom-2 left-0 w-full h-0.5 bg-teal-500 animate-in zoom-in duration-300" />
                )}
              </Link>
            )
          })}
        </div>

        {/* ── RIGHT: ACTIONS ── */}
        <div className="flex w-1/4 items-center justify-end gap-6">
          <div className="hidden lg:block">
            <SearchOverlay />
          </div>
          
          {user ? (
            <>
              {/* Notification Bell */}
              <Link href="/notifications" className="relative size-10 rounded-2xl bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors hidden md:flex">
                <Bell className="size-5 text-slate-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-rose-500 border-2 border-white" />
                )}
              </Link>
              
              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 bg-slate-900 p-1 pr-4 rounded-2xl hover:scale-105 transition-transform active:scale-95 shadow-lg shadow-slate-200">
                    <div className="size-8 rounded-[0.8rem] bg-white overflow-hidden shrink-0">
                      {user.user_metadata?.avatar_url ? (
                        <img src={user.user_metadata.avatar_url} className="size-full object-cover" />
                      ) : (
                        <User className="size-full p-2 text-slate-400" />
                      )}
                    </div>
                    <span className="text-[10px] font-black text-white uppercase tracking-widest hidden sm:block">
                      {user.user_metadata?.full_name?.split(" ")[0] ?? "Athlete"}
                    </span>
                    <ChevronDown className="size-3 text-white/50" />
                  </button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="w-56 rounded-[1.5rem] p-2 mt-4 shadow-2xl border-slate-100 animate-in fade-in zoom-in-95">
                  <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-3 focus:bg-teal-50 focus:text-teal-700">
                    <Link href="/profile" className="flex items-center gap-2 font-black text-xs uppercase tracking-widest">
                      <User className="size-4 opacity-50" /> View Profile
                    </Link>
                  </DropdownMenuItem>
                  
                  {isUserAdmin && (
                    <DropdownMenuItem asChild className="rounded-xl cursor-pointer py-3 focus:bg-amber-50 focus:text-amber-700">
                      <Link href="/admin" className="flex items-center gap-2 font-black text-xs uppercase tracking-widest">
                        <ShieldAlert className="size-4 opacity-50" /> Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  
                  <DropdownMenuSeparator className="bg-slate-100 my-1" />
                  
                  <DropdownMenuItem onClick={handleSignOut} className="rounded-xl cursor-pointer py-3 text-rose-500 focus:bg-rose-50 focus:text-rose-600 font-black text-xs uppercase tracking-widest">
                    <LogOut className="size-4 opacity-50" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="hidden md:flex items-center gap-4">
              <Link href="/auth/login" className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900">
                Log in
              </Link>
              <Link href="/auth/signup" className="flex items-center gap-2 rounded-full bg-slate-900 px-7 py-3 text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 transition-all active:scale-95">
                Join <ArrowUpRight className="size-3" />
              </Link>
            </div>
          )}

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="xl:hidden p-3 bg-slate-50 rounded-2xl text-slate-900">
                <Menu className="size-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 rounded-l-[3rem] border-l-0 shadow-2xl p-8 bg-white/95 backdrop-blur-xl">
              <SheetHeader className="mb-10 border-b border-slate-100 pb-6">
                <SheetTitle className="text-left flex items-center gap-3">
                  <div className="size-8 bg-slate-900 rounded-xl flex items-center justify-center">
                    <Zap className="text-teal-400 size-4 fill-teal-400" />
                  </div>
                  <span className="font-black text-xl text-slate-900 tracking-tighter italic">BALANCE.</span>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4">
                {desktopLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-[0.2em] transition-all",
                      pathname === link.href ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  )
}