import { createClient as supabaseCreateClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Implementación de patrón singleton para evitar múltiples instancias
let supabaseClient: ReturnType<typeof supabaseCreateClient> | null = null

export const createClient = () => {
  if (supabaseClient) return supabaseClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Faltan variables de entorno de Supabase")
    throw new Error("Faltan variables de entorno de Supabase")
  }

  supabaseClient = supabaseCreateClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })

  return supabaseClient
}
