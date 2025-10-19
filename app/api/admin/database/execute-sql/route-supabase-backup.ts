import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Función para verificar si el usuario es administrador
async function isAdmin(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

    // Crear cliente de Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })

    // Obtener token de la cookie
    const token = cookieStore.get("sb-access-token")?.value

    if (!token) {
      console.log("No se encontró token de autenticación")
      return false
    }

    // Configurar el token en el cliente
    supabase.auth.setSession({
      access_token: token,
      refresh_token: cookieStore.get("sb-refresh-token")?.value || "",
    })

    // Obtener usuario actual
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log("Error al obtener usuario:", userError)
      return false
    }

    // Verificar si el usuario es administrador
    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (dbError || !userData) {
      console.log("Error al verificar permisos de administrador:", dbError)
      return false
    }

    return userData.is_admin === true
  } catch (error) {
    console.error("Error al verificar permisos:", error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar si el usuario es administrador
    const admin = await isAdmin(request)

    if (!admin) {
      return NextResponse.json({ success: false, message: "No tienes permisos para ejecutar SQL" }, { status: 403 })
    }

    const body = await request.json()
    const { sql } = body

    if (!sql) {
      return NextResponse.json({ success: false, message: "Se requiere una consulta SQL" }, { status: 400 })
    }

    // Crear cliente de Supabase con rol de servicio
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // Ejecutar SQL
    const { data, error } = await supabaseAdmin.rpc("execute_sql", { sql_query: sql })

    if (error) {
      console.error("Error al ejecutar SQL:", error)
      return NextResponse.json({ success: false, message: `Error al ejecutar SQL: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "SQL ejecutado correctamente",
      result: data,
    })
  } catch (error: any) {
    console.error("Error al ejecutar SQL:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Error interno del servidor" },
      { status: 500 },
    )
  }
}
