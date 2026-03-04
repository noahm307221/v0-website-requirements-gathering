import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim()
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()

export const supabase = createBrowserClient(supabaseUrl, supabaseKey)

// helper used in client components to verify admin email
export async function isAdmin(email: string): Promise<boolean> {
  console.log("Checking admin for:", email)
  const { data, error } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle()
  console.log("Admin check result:", data, error)
  return !!data
}
