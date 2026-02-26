"use client"

import { useEffect, useRef, useState } from "react"

const stats = [
  { value: 10000, suffix: "+", label: "Active members" },
  { value: 500, suffix: "+", label: "Sports clubs" },
  { value: 200, suffix: "+", label: "Events this month" },
  { value: 15, suffix: "", label: "Cities covered" },
]

function useCountUp(target: number, isVisible: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isVisible) return

    let start = 0
    const duration = 2000
    const step = target / (duration / 16)

    const timer = setInterval(() => {
      start += step
      if (start >= target) {
        setCount(target)
        clearInterval(timer)
      } else {
        setCount(Math.floor(start))
      }
    }, 16)

    return () => clearInterval(timer)
  }, [target, isVisible])

  return count
}

function StatItem({
  value,
  suffix,
  label,
  isVisible,
}: {
  value: number
  suffix: string
  label: string
  isVisible: boolean
}) {
  const count = useCountUp(value, isVisible)

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="text-4xl font-bold tabular-nums text-foreground md:text-5xl">
        {count.toLocaleString()}
        {suffix}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

export function Stats() {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 },
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={ref} className="border-y bg-secondary/30 py-20">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 md:grid-cols-4">
        {stats.map((stat) => (
          <StatItem key={stat.label} {...stat} isVisible={isVisible} />
        ))}
      </div>
    </section>
  )
}
