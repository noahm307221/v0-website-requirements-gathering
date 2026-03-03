import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// helper used in client components to verify admin email
export async function isAdmin(email: string): Promise<boolean> {
  const { data } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .single()
  return !!data
}
