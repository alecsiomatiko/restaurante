import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { getCurrentUser as getLegacyUser } from "@/lib/auth-simple"

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Verificar sesión de Supabase
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session) {
      // Si hay sesión de Supabase, devolver los datos del usuario
      return NextResponse.json({
        isLoggedIn: true,
        user: {
          id: session.user.id,
          email: session.user.email,
          username: session.user.email?.split("@")[0] || session.user.id,
          isAdmin: session.user.app_metadata?.isAdmin || false,
        },
        authType: "supabase",
      })
    }

    // Si no hay sesión de Supabase, verificar sistema legacy
    const legacyUser = getLegacyUser()

    if (legacyUser) {
      return NextResponse.json({
        isLoggedIn: true,
        user: {
          id: legacyUser.id,
          username: legacyUser.username,
          isAdmin: legacyUser.isAdmin,
        },
        authType: "legacy",
      })
    }

    // Si no hay sesión en ningún sistema, devolver no autenticado
    return NextResponse.json({
      isLoggedIn: false,
      message: "No autenticado",
    })
  } catch (error) {
    console.error("Error al verificar autenticación:", error)
    return NextResponse.json(
      {
        isLoggedIn: false,
        error: "Error al verificar autenticación",
      },
      { status: 500 },
    )
  }
}
