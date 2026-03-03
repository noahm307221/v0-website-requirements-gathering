import { createBrowserClient } from "@supabase/ssr"

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function isAdmin(email: string): Promise<boolean> {
  const { data } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle()
  return !!data
}