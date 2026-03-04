"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { ArrowRight, CalendarCheck, Trophy, Mail, MapPin, Users, Activity, MessageCircle } from "lucide-react"
import { EventCard } from "@/components/event-card"

export default function LandingPage() {
  const [popularEvents, setPopularEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPopularEvents() {
      const today = new Date().toISOString().split("T")[0]
      const { data } = await supabase
        .from("events")
        .select("*")
        .gte("date", today)
        .order("spots_taken", { ascending: false })
        .limit(3)

      if (data) {
        const formattedEvents = data.map((e: any) => ({
          ...e,
          categoryId: e.category_id,
          spotsTotal: e.spots_total,
          spotsTaken: e.spots_taken,
        }))
        setPopularEvents(formattedEvents)
      }
      setLoading(false)
    }

    fetchPopularEvents()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* ── 1. HERO SECTION ── */}
      <section className="mx-auto max-w-7xl px-6 py-12 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          
          {/* Left Text */}
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">
              Community-Powered Fitness
            </p>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 leading-[1.1] mb-6">
              Your city is full of{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-500">
                people
              </span>{" "}
              who move like you.
            </h1>
            <p className="text-lg sm:text-xl text-slate-500 font-medium leading-relaxed mb-8 max-w-lg">
              Discover local sports clubs, health communities, and fitness events. From padel to running, yoga to cycling — find your people and get moving.
            </p>
            
            <div className="flex flex-wrap items-center gap-4">
              <Link 
                href="/auth/signup" 
                className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full text-base font-bold hover:bg-teal-600 hover:shadow-lg transition-all hover:-translate-y-0.5"
              >
                Join the Movement <ArrowRight className="size-5" />
              </Link>
              <Link 
                href="#features" 
                className="px-8 py-4 rounded-full text-base font-bold text-slate-600 hover:text-teal-700 hover:bg-teal-50 transition-colors"
              >
                Explore Features
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-4 pt-8 border-t border-slate-200">
              <div className="flex -space-x-3">
                {['🏃', '🎾', '🧘‍♀️', '🚴', '🏊‍♂️'].map((emoji, i) => (
                  <div key={i} className="size-10 rounded-full bg-white border-2 border-slate-50 flex items-center justify-center text-lg shadow-sm">
                    {emoji}
                  </div>
                ))}
              </div>
              <div>
                <p className="font-bold text-slate-900">Built for everyday athletes</p>
                <p className="text-sm text-slate-500 font-medium">Connect, compete, and train locally.</p>
              </div>
            </div>
          </div>

          {/* Right Image Grid (Bento Box Style) */}
          <div className="grid grid-cols-2 gap-4 h-[500px] sm:h-[600px]">
            <div className="relative rounded-[2rem] overflow-hidden shadow-md group bg-slate-200">
              <Image src="https://images.unsplash.com/photo-1622228837686-21841b8a5fcb?q=80&w=800&auto=format&fit=crop" alt="Padel" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="relative rounded-[2rem] overflow-hidden shadow-md group bg-slate-200">
              <Image src="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=800&auto=format&fit=crop" alt="Running" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="relative rounded-[2rem] overflow-hidden shadow-md group bg-slate-200">
              <Image src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop" alt="Yoga" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="relative rounded-[2rem] overflow-hidden shadow-md group bg-slate-200">
              <Image src="https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=800&auto=format&fit=crop" alt="Cycling" fill className="object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
          </div>
          
        </div>
      </section>

      {/* ── 2. FEATURES GRID (The full ecosystem) ── */}
      <section id="features" className="py-24 bg-white border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-4">Everything you need to move together</h2>
            <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">Balance is more than just an events calendar. It's a complete social hub for your active life.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { 
                icon: Users, 
                title: "Join Communities", 
                desc: "Find local groups based on your sports. Dive into active discussions and build your network." 
              },
              { 
                icon: MessageCircle, 
                title: "Chat & Connect", 
                desc: "Message athletes 1-on-1 or coordinate your next match directly in community group chats." 
              },
              { 
                icon: CalendarCheck, 
                title: "Book Events", 
                desc: "Browse local matches, group runs, or fitness classes and secure your spot instantly." 
              },
              { 
                icon: Trophy, 
                title: "Leagues & Tracking", 
                desc: "Log your activities, build weekly streaks, and compete in private leagues or public leaderboards." 
              }
            ].map((feature, i) => (
              <div key={i} className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 hover:border-teal-200 hover:shadow-md transition-all group">
                <div className="size-14 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 text-teal-600 group-hover:scale-110 group-hover:bg-teal-600 group-hover:text-white transition-all duration-300">
                  <feature.icon className="size-6" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-3">{feature.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. POPULAR EVENTS SECTION ── */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Trending near you</h2>
              <p className="text-lg text-slate-500 font-medium">The most popular local events filling up fast this week.</p>
            </div>
            <Link href="/events" className="hidden sm:flex items-center gap-2 px-6 py-3 rounded-full bg-teal-50 text-teal-700 font-bold hover:bg-teal-100 transition-colors shadow-sm">
              View Calendar <ArrowRight className="size-4" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="size-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : popularEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {popularEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
              <p className="text-lg font-medium text-slate-500">More events being added soon!</p>
            </div>
          )}

          <Link href="/events" className="sm:hidden mt-8 flex justify-center items-center gap-2 px-6 py-3 rounded-full bg-teal-50 text-teal-700 font-bold hover:bg-teal-100 transition-colors w-full shadow-sm">
            View Calendar <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* ── 4. FOOTER / CONTACT ── */}
      <footer id="contact" className="bg-slate-900 text-slate-300 py-16 rounded-t-[3rem] mt-12">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
          
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight mb-4">balance.</h2>
            <p className="max-w-xs font-medium leading-relaxed mb-8">
              Empowering cities to move together. Join the fastest-growing active community platform.
            </p>
            <div className="flex gap-4">
              <Link href="/auth/signup" className="px-6 py-3 rounded-full bg-teal-500 text-white font-bold hover:bg-teal-400 transition-colors">
                Sign Up Free
              </Link>
            </div>
          </div>

          <div className="flex flex-col md:items-end justify-center">
            <h3 className="text-xl font-bold text-white mb-4">Get in touch</h3>
            <div className="space-y-3 font-medium flex flex-col md:items-end">
              <a href="mailto:hello@balanceapp.com" className="flex items-center gap-2 hover:text-teal-400 transition-colors">
                <Mail className="size-4" /> hello@balanceapp.com
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="size-4" /> Edinburgh, Scotland
              </div>
            </div>
          </div>

        </div>
        
        <div className="mx-auto max-w-7xl px-6 mt-16 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-sm font-medium text-slate-500">
          <p>© {new Date().getFullYear()} Balance Fitness App. All rights reserved.</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}