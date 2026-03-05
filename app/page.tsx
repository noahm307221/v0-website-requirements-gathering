"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { ArrowRight, CalendarCheck, Trophy, Mail, MapPin, Users, MessageCircle, ChevronDown } from "lucide-react"
import { EventCard } from "@/components/event-card"

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); obs.disconnect() }
    }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return { ref, inView }
}

const IMAGES = [
  { src: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?q=80&w=800&auto=format&fit=crop", alt: "Running", label: "Running" },
  { src: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop", alt: "Yoga", label: "Yoga" },
  { src: "https://images.unsplash.com/photo-1541625602330-2277a4c46182?q=80&w=800&auto=format&fit=crop", alt: "Cycling", label: "Cycling" },
  { src: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?q=80&w=800&auto=format&fit=crop", alt: "Padel", label: "Padel" },
]

const SPORTS = ["🏃 Running","🎾 Tennis","🏊 Swimming","🧘 Yoga","🚴 Cycling","🏸 Badminton","⛹️ Basketball","🧗 Climbing","🥊 Boxing","🏋️ CrossFit","🎱 Padel","🤸 Gymnastics"]

// Rotating words that cycle in the headline
const ROTATING_WORDS = ["running club", "padel group", "yoga studio", "cycling crew", "swim squad", "fitness tribe"]

export default function LandingPage() {
  const [popularEvents, setPopularEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [wordIdx, setWordIdx] = useState(0)
  const [wordVisible, setWordVisible] = useState(true)
  const features = useInView()
  const eventsRef = useInView()
  const footer = useInView()

  useEffect(() => {
    setMounted(true)
    async function fetchEvents() {
      const today = new Date().toISOString().split("T")[0]
      const { data } = await supabase.from("events").select("*").gte("date", today).order("spots_taken", { ascending: false }).limit(3)
      if (data) setPopularEvents(data.map((e: any) => ({ ...e, categoryId: e.category_id, spotsTotal: e.spots_total, spotsTaken: e.spots_taken })))
      setLoading(false)
    }
    fetchEvents()

    // Rotate words every 2.5s
    const interval = setInterval(() => {
      setWordVisible(false)
      setTimeout(() => {
        setWordIdx(i => (i + 1) % ROTATING_WORDS.length)
        setWordVisible(true)
      }, 300)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      <style>{`
        @keyframes fadeUp   { from { opacity:0; transform:translateY(28px) } to { opacity:1; transform:translateY(0) } }
        @keyframes fadeDown { from { opacity:0; transform:translateY(-12px) } to { opacity:1; transform:translateY(0) } }
        @keyframes float1   { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-10px) } }
        @keyframes float2   { 0%,100% { transform:translateY(0) rotate(0deg) } 50% { transform:translateY(-14px) rotate(1.2deg) } }
        @keyframes float3   { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-8px) } }
        @keyframes float4   { 0%,100% { transform:translateY(0) rotate(0deg) } 50% { transform:translateY(-11px) rotate(-1deg) } }
        @keyframes ticker   { from { transform:translateX(0) } to { transform:translateX(-50%) } }
        @keyframes bob      { 0%,100% { transform:translateY(0) } 50% { transform:translateY(6px) } }
        @keyframes pulse-ring { 0% { transform:scale(.9); opacity:.7 } 70% { transform:scale(1.3); opacity:0 } 100% { opacity:0 } }
        .fade-up  { animation: fadeUp  0.8s cubic-bezier(.22,1,.36,1) both }
        .fade-dn  { animation: fadeDown 0.5s cubic-bezier(.22,1,.36,1) both }
        .d1{animation-delay:.05s} .d2{animation-delay:.18s} .d3{animation-delay:.32s}
        .d4{animation-delay:.46s} .d5{animation-delay:.60s} .d6{animation-delay:.74s}
        .img1 { animation: float1 7s   ease-in-out       infinite }
        .img2 { animation: float2 8.5s ease-in-out .4s   infinite }
        .img3 { animation: float1 6.5s ease-in-out .9s   infinite }
        .img4 { animation: float4 9s   ease-in-out 1.3s  infinite }
        .ticker-inner { animation: ticker 30s linear infinite }
        .ticker-inner:hover { animation-play-state:paused }
        .bob  { animation: bob 2s ease-in-out infinite }
        .word-in  { animation: fadeDown 0.3s cubic-bezier(.22,1,.36,1) both }
        .word-out { opacity: 0; transform: translateY(8px) }
      `}</style>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">

        {/* Warm ambient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-teal-50 pointer-events-none" />
        <div className="absolute top-[-10%] right-[-5%] w-[700px] h-[700px] rounded-full bg-teal-100/40 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-orange-100/40 blur-[100px] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl w-full px-6 py-20 grid lg:grid-cols-[1fr_520px] gap-16 items-center">

          {/* LEFT */}
          <div>
            {mounted && <>
              {/* Pill badge */}
              <div className="fade-up d1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-teal-700 mb-8 rounded-full bg-teal-50 border border-teal-100 px-4 py-2">
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-teal-500" />
                </span>
                Community-powered fitness
              </div>

              {/* Headline — rotating word */}
              <h1 className="font-black tracking-tight leading-[1.05] text-slate-900 mb-6">
                <span className="fade-up d2 block text-[clamp(2.6rem,6.5vw,5.5rem)]">Find your</span>
                <span className="fade-up d3 block text-[clamp(2.6rem,6.5vw,5.5rem)]">
                  <span
                    className={`inline-block text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-300 ${wordVisible ? "word-in" : "word-out"}`}
                    style={{ minWidth: "10ch" }}
                  >
                    {ROTATING_WORDS[wordIdx]}
                  </span>
                </span>
                <span className="fade-up d4 block text-[clamp(2.6rem,6.5vw,5.5rem)]">in {" "}
                  <span className="relative inline-block">
                    Edinburgh
                    <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 200 8" fill="none">
                      <path d="M2 6 Q50 2 100 5 Q150 8 198 4" stroke="url(#teal-grad)" strokeWidth="3" strokeLinecap="round"/>
                      <defs>
                        <linearGradient id="teal-grad" x1="0" y1="0" x2="1" y2="0">
                          <stop offset="0%" stopColor="#14b8a6"/>
                          <stop offset="100%" stopColor="#10b981"/>
                        </linearGradient>
                      </defs>
                    </svg>
                  </span>
                </span>
              </h1>

              <p className="fade-up d5 text-lg sm:text-xl text-slate-500 font-medium leading-relaxed max-w-lg mb-10">
                Balance connects you with local clubs, fitness events and people who share your passion. Show up, get moving, make friends.
              </p>

              <div className="fade-up d6 flex flex-wrap gap-3 mb-10">
                <Link href="/auth/signup"
                  className="group flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full text-base font-bold hover:bg-teal-600 hover:shadow-2xl hover:shadow-teal-200/60 transition-all duration-300 hover:-translate-y-0.5">
                  Join for free
                  <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/events"
                  className="flex items-center gap-2 px-8 py-4 rounded-full text-base font-bold text-slate-600 border border-slate-200 hover:border-teal-300 hover:text-teal-700 hover:bg-teal-50/50 transition-all">
                  Browse events
                </Link>
              </div>

              {/* Social proof row */}
              <div className="fade-up d6 flex items-center gap-4">
                <div className="flex -space-x-2.5">
                  {["🏃","🎾","🧘‍♀️","🚴","🏊‍♂️"].map((e, i) => (
                    <div key={i} className="size-10 rounded-full bg-white border-2 border-slate-100 flex items-center justify-center text-lg shadow-sm">{e}</div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">Thousands already active</p>
                  <p className="text-xs text-slate-400">New groups and events added every week</p>
                </div>
              </div>
            </>}
          </div>

          {/* RIGHT — asymmetric floating collage */}
          {mounted && (
            <div className="relative h-[560px] hidden lg:block">

              {/* Large top-left */}
              <div className="img1 absolute top-0 left-0 w-[290px] h-[330px] rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/80">
                <Image src={IMAGES[0].src} alt={IMAGES[0].alt} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute bottom-4 left-4 text-white text-xs font-bold uppercase tracking-widest bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">{IMAGES[0].label}</span>
              </div>

              {/* Tall top-right — overlaps slightly */}
              <div className="img2 absolute top-[-30px] right-0 w-[200px] h-[380px] rounded-[2.5rem] overflow-hidden shadow-xl">
                <Image src={IMAGES[1].src} alt={IMAGES[1].alt} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute bottom-4 left-4 text-white text-xs font-bold uppercase tracking-widest bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">{IMAGES[1].label}</span>
              </div>

              {/* Wide bottom-left */}
              <div className="img3 absolute bottom-0 left-0 w-[270px] h-[190px] rounded-[2rem] overflow-hidden shadow-lg">
                <Image src={IMAGES[2].src} alt={IMAGES[2].alt} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute bottom-3 left-3 text-white text-xs font-bold uppercase tracking-widest bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">{IMAGES[2].label}</span>
              </div>

              {/* Small bottom-right with white border */}
              <div className="img4 absolute bottom-[24px] right-[8px] w-[165px] h-[165px] rounded-[2rem] overflow-hidden shadow-lg border-4 border-white">
                <Image src={IMAGES[3].src} alt={IMAGES[3].alt} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <span className="absolute bottom-2 left-2 text-white text-xs font-bold uppercase tracking-widest bg-white/20 backdrop-blur-sm rounded-full px-2 py-0.5">{IMAGES[3].label}</span>
              </div>

              {/* Floating stat card */}
              <div className="fade-up d4 absolute top-[180px] left-[265px] bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-3 z-20 backdrop-blur-sm">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mb-0.5">Active this week</p>
                <p className="text-2xl font-black text-slate-900 tabular-nums">2,400+</p>
              </div>

              {/* Floating event count pill */}
              <div className="fade-up d5 absolute top-[360px] right-[-12px] z-20 flex items-center gap-2 bg-teal-500 text-white text-xs font-bold rounded-full px-4 py-2.5 shadow-lg shadow-teal-200">
                <span className="size-2 rounded-full bg-white animate-pulse" />
                12 events this weekend
              </div>

              {/* Floating friend joined card */}
              <div className="fade-up d6 absolute top-[-10px] left-[180px] z-20 bg-white rounded-2xl shadow-lg border border-slate-100 px-3 py-2.5 flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-orange-100 flex items-center justify-center text-sm">🏃</div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Sarah joined</p>
                  <p className="text-[10px] text-slate-400">Morning Runners · 2m ago</p>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Scroll nudge */}
        {mounted && (
          <div className="relative z-10 flex flex-col items-center pb-8 gap-2 fade-up d6">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Scroll to explore</p>
            <ChevronDown className="size-5 text-slate-300 bob" />
          </div>
        )}
      </section>

      {/* ── SPORTS TICKER ── */}
      <div className="border-y border-slate-100 bg-slate-50/80 py-4 overflow-hidden">
        <div className="ticker-inner flex gap-4 w-max">
          {[...SPORTS, ...SPORTS].map((sport, i) => (
            <span key={i} className="shrink-0 rounded-full bg-white border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-500 shadow-sm whitespace-nowrap">
              {sport}
            </span>
          ))}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="features" className="py-28 bg-white" ref={features.ref}>
        <div className="mx-auto max-w-7xl px-6">
          <div className={`max-w-2xl mb-16 transition-all duration-700 ${features.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-3">The full picture</p>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
              More than events.<br />A place to belong.
            </h2>
            <p className="text-lg text-slate-500 font-medium leading-relaxed">
              Balance brings together everyone who wants to move — whether you're a seasoned athlete or just getting started.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Users,         color: "bg-violet-500", bg: "bg-violet-50",  border: "hover:border-violet-200", title: "Join Communities",   desc: "Find local groups for your sport. Build your network and stay in the loop with people nearby." },
              { icon: MessageCircle, color: "bg-sky-500",    bg: "bg-sky-50",     border: "hover:border-sky-200",    title: "Chat & Connect",     desc: "Coordinate your next game, run or session directly in group chats or 1-on-1 messages." },
              { icon: CalendarCheck, color: "bg-emerald-500",bg: "bg-emerald-50", border: "hover:border-emerald-200",title: "Discover Events",    desc: "Browse local matches, group runs and fitness classes. Register in seconds." },
              { icon: Trophy,        color: "bg-amber-500",  bg: "bg-amber-50",   border: "hover:border-amber-200",  title: "Track & Compete",    desc: "Log activities, build streaks and compete with friends in private leagues." },
            ].map((f, i) => (
              <div key={i}
                className={`rounded-[2rem] p-8 border border-transparent ${f.bg} ${f.border} hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 group cursor-default ${features.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                style={{ transitionDelay: `${i * 80}ms`, transitionProperty: "opacity,transform,box-shadow,border-color" }}>
                <div className={`size-14 ${f.color} rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <f.icon className="size-6" />
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-3">{f.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <div className="bg-slate-900 py-12 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-8">
          {[
            { value: "2,400+", label: "Athletes this week" },
            { value: "150+",   label: "Events per month" },
            { value: "40+",    label: "Local communities" },
            { value: "⭐ 4.9", label: "Average rating" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-4xl font-black text-white tabular-nums">{value}</p>
              <p className="text-slate-400 text-sm font-medium mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── EVENTS ── */}
      <section className="py-28 bg-slate-50" ref={eventsRef.ref}>
        <div className="mx-auto max-w-7xl px-6">
          <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-14 transition-all duration-700 ${eventsRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-teal-600 mb-2">Happening soon</p>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">Trending near you</h2>
            </div>
            <Link href="/events" className="group hidden sm:flex items-center gap-2 px-6 py-3 rounded-full bg-white border border-slate-200 text-slate-700 font-bold hover:border-teal-300 hover:text-teal-700 transition-colors shadow-sm">
              View all events <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="size-10 border-[3px] border-teal-200 border-t-teal-600 rounded-full animate-spin" />
            </div>
          ) : popularEvents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularEvents.map((event, i) => (
                <div key={event.id}
                  className={`transition-all duration-700 ${eventsRef.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                  style={{ transitionDelay: `${i * 120}ms` }}>
                  <EventCard event={event} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100">
              <p className="text-slate-500 font-medium">More events being added soon!</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/events" className="group inline-flex items-center gap-2 px-8 py-4 rounded-full bg-slate-900 text-white font-bold hover:bg-teal-600 hover:shadow-xl hover:shadow-teal-200/40 transition-all hover:-translate-y-0.5">
              See all events <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" ref={footer.ref} className="bg-slate-900 text-slate-400 py-20 rounded-t-[3rem] mt-2">
        <div className={`mx-auto max-w-7xl px-6 transition-all duration-700 ${footer.inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-4xl font-black text-white tracking-tight mb-4">balance.</h2>
              <p className="max-w-xs font-medium leading-relaxed mb-8">
                Empowering cities to move together. The fastest-growing active community platform.
              </p>
              <Link href="/auth/signup" className="group inline-flex items-center gap-2 px-6 py-3 rounded-full bg-teal-500 text-white font-bold hover:bg-teal-400 transition-colors">
                Sign Up Free <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="flex flex-col md:items-end justify-center gap-4 font-medium">
              <h3 className="text-xl font-bold text-white">Get in touch</h3>
              <a href="mailto:hello@balanceapp.com" className="flex items-center gap-2 hover:text-teal-400 transition-colors">
                <Mail className="size-4" /> hello@balanceapp.com
              </a>
              <div className="flex items-center gap-2"><MapPin className="size-4" /> Edinburgh, Scotland</div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-500 gap-4">
            <p>© {new Date().getFullYear()} Balance. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}