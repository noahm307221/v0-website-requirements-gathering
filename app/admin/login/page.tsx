"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"



export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError("Invalid email or password")
      setLoading(false)
    } else {
      router.push("/admin")
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      {/* Warm ambient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-teal-50 pointer-events-none z-0" />
      <div className="absolute top-[-10%] right-[-5%] w-[700px] h-[700px] rounded-full bg-teal-100/40 blur-[100px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-orange-100/40 blur-[100px] pointer-events-none z-0" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-2xl border p-8 bg-white/80 backdrop-blur">
        <h1 className="text-2xl font-bold mb-1">Admin Login</h1>
        <p className="text-sm text-muted-foreground mb-6">Sign in to manage events</p>

        {error && (
          <p className="text-sm text-destructive mb-4">{error}</p>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Password</label>
            <input
              type="password"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-lg bg-foreground text-background py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}