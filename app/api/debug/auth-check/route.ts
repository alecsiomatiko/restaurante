import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createClient()

    // Verificar sesión de Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    // Verificar token JWT personalizado
    const authToken = cookieStore.get("auth_token")

    // Obtener información del usuario actual
    const { data: userData, error: userError } = await supabase.auth.getUser()

    // Verificar si el usuario es administrador
    let isAdmin = false
    let adminCheckError = null

    if (userData?.user) {
      const { data: adminData, error: adminError } = await supabase
        .from("users")
        .select("is_admin")
        .eq("id", userData.user.id)
        .single()

      isAdmin = adminData?.is_admin || false
      adminCheckError = adminError
    }

    return NextResponse.json({
      authenticated: !!userData?.user,
      session: {
        exists: !!sessionData?.session,
        error: sessionError?.message,
      },
      jwt: {
        exists: !!authToken,
        value: authToken ? "[REDACTED]" : null,
      },
      user: userData?.user
        ? {
            id: userData.user.id,
            email: userData.user.email,
            role: userData.user.role,
          }
        : null,
      admin: {
        isAdmin,
        error: adminCheckError?.message,
      },
      cookies: {
        names: cookieStore.getAll().map((c) => c.name),
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack,
      },
      { status: 500 },
    )
  }
}
