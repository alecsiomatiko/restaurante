/**
 * This file is for Pages Router (pages/ directory) server-side code.
 * It doesn't use next/headers which is only available in App Router.
 */
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"
import type { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next"

// For getServerSideProps in pages/ directory
export const createServerClientForSSR = (context: GetServerSidePropsContext) => {
  return createServerComponentClient<Database>({ cookies: context.req.cookies })
}

// For API routes in pages/api directory
export const createServerClientForAPI = (req: NextApiRequest, res: NextApiResponse) => {
  return createServerComponentClient<Database>({
    cookies: {
      get: (name: string) => {
        return req.cookies[name]
      },
      set: (name: string, value: string, options: any) => {
        res.setHeader("Set-Cookie", `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`)
      },
    },
  })
}

// Alternative createClient for pages/ directory
export const createClient = (context?: { req?: NextApiRequest; res?: NextApiResponse }) => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not defined")
  }

  if (!supabaseKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined")
  }

  // If we have context, use it for cookies
  if (context?.req && context?.res) {
    return createSupabaseClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return context.req?.cookies[name]
        },
        set(name: string, value: string, options: any) {
          context.res?.setHeader("Set-Cookie", `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`)
        },
        remove(name: string, options: any) {
          context.res?.setHeader("Set-Cookie", `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
        },
      },
    })
  }

  // Otherwise, return a client without cookie handling
  return createSupabaseClient(supabaseUrl, supabaseKey)
}
