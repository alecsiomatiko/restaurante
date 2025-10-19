/**
 * This file is for App Router (app/ directory) server components only.
 * Do not import this in pages/ directory files.
 */
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Importamos cookies de manera condicional para evitar errores en tiempo de compilación
let cookies: any
if (typeof process !== "undefined" && process.env.NEXT_RUNTIME === "nodejs") {
  // Solo importamos en el servidor
  try {
    // Usamos require dinámico para evitar que webpack lo procese en tiempo de compilación
    cookies = require("next/headers").cookies
  } catch (e) {
    // Fallback silencioso si estamos en un entorno que no soporta next/headers
    cookies = {
      get: () => null,
      set: () => null,
      delete: () => null,
    }
  }
}

// Cliente para componentes del lado del servidor (App Router)
export const createServerClient = () => {
  if (!cookies) {
    throw new Error("This function can only be called in a Server Component in the app/ directory")
  }
  return createServerComponentClient<Database>({ cookies })
}

// Exportación de createClient que falta (App Router)
export const createClient = () => {
  if (!cookies) {
    throw new Error("This function can only be called in a Server Component in the app/ directory")
  }

  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined")
  }

  if (!supabaseKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined")
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.delete({ name, ...options })
      },
    },
  })
}
