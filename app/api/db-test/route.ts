import { NextResponse } from "next/server"
// Assuming your server-side Supabase client initialization is in one of these common locations.
// Please verify this path is correct for your project structure.
import { createClient } from "@/lib/supabase/server" // For App Router Route Handlers
// import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'; // If using Pages Router or specific setup

export async function GET() {
  console.log("/api/db-test: Received request")
  try {
    // If using createPagesServerClient, it needs { req, res }
    // For App Router with createClient from '@supabase/ssr' or a wrapper like '@/lib/supabase/server',
    // it often implicitly uses cookies() from 'next/headers'.
    const supabase = createClient()
    console.log("/api/db-test: Supabase client initialized")

    // Let's try the most basic query possible: select a single value.
    // Using a known simple table like 'categories' which you have.
    const { data, error } = await supabase.from("categories").select("id").limit(1)

    if (error) {
      console.error("/api/db-test: Supabase query error:", error)
      return NextResponse.json(
        {
          success: false,
          message: "Supabase query failed.",
          error: error.message,
          details: error, // Send the full error object
        },
        { status: 500 },
      )
    }

    console.log("/api/db-test: Supabase query successful, data:", data)
    return NextResponse.json({
      success: true,
      message: "Conexión y consulta básica a la BD exitosa.",
      data: data,
    })
  } catch (e: unknown) {
    // Catch unknown for better type safety
    console.error("/api/db-test: Caught an exception in GET handler:", e)

    let errorMessage = "An unknown error occurred."
    let errorDetails: any = {}

    if (e instanceof Error) {
      errorMessage = e.message
      errorDetails = { name: e.name, stack: e.stack, cause: e.cause }
    } else if (typeof e === "object" && e !== null && "message" in e) {
      errorMessage = String((e as { message: any }).message)
      errorDetails = e
    } else if (typeof e === "string") {
      errorMessage = e
    }

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor en la prueba de BD.",
        error: errorMessage,
        details: errorDetails,
      },
      { status: 500 },
    )
  }
}
