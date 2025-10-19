import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// Credenciales predefinidas para el administrador de producción
const ADMIN_EMAIL = "admin@restaurante.com"
const ADMIN_PASSWORD = "Admin123!" // Cambiar después del primer inicio de sesión
const ADMIN_NAME = "Administrador"

export async function POST(request: Request) {
  try {
    // Verificar si la solicitud incluye una clave secreta para proteger este endpoint
    const { authorization } = await request.json()

    if (authorization !== process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 10)) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // 1. Verificar si el usuario ya existe
    const { data: existingUser, error: lookupError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", ADMIN_EMAIL)
      .single()

    if (lookupError && lookupError.code !== "PGRST116") {
      // Error diferente a "no se encontró el registro"
      throw lookupError
    }

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: "El usuario administrador ya existe",
        user: { email: ADMIN_EMAIL },
      })
    }

    // 2. Crear el usuario en Auth
    const { data: authUser, error: createUserError } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    })

    if (createUserError) {
      throw createUserError
    }

    // 3. Crear el perfil con permisos de administrador
    const { error: profileError } = await supabase.from("profiles").insert({
      id: authUser.user.id,
      username: ADMIN_NAME,
      email: ADMIN_EMAIL,
      is_admin: true,
    })

    if (profileError) {
      throw profileError
    }

    return NextResponse.json({
      success: true,
      message: "Usuario administrador creado exitosamente",
      user: { email: ADMIN_EMAIL, password: "Proporcionado en la configuración" },
    })
  } catch (error: any) {
    console.error("Error al configurar usuario de producción:", error)
    return NextResponse.json(
      {
        success: false,
        message: "Error al configurar usuario de producción",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
