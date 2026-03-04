import { Dashboard } from "@/components/dashboard"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    { cookies: { get(name: string) { return cookieStore.get(name)?.value } } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login")

  return <Dashboard userId={user.id} userEmail={user.email ?? ""} />
}