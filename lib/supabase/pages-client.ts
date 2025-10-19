import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Client specifically for pages/ directory
export const createPagesClient = () => {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  )
}

// Admin client with service role key
export const createAdminClient = () => {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
