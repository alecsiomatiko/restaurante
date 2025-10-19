import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ success: false, message: "Email y contraseña son requeridos" }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Intentar iniciar sesión
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          code: error.code,
        },
        { status: 401 },
      )
    }

    // Si llegamos aquí, las credenciales son válidas
    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    })
  } catch (error: any) {
    console.error("Error al verificar credenciales:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error interno al verificar credenciales",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
