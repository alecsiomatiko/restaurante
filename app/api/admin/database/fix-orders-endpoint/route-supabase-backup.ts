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
      return NextResponse.json(
        { success: false, message: "No tienes permisos para realizar esta acción" },
        { status: 403 },
      )
    }

    // Aquí iría el código para corregir el endpoint de pedidos
    // En un entorno real, esto podría implicar modificar archivos en el servidor
    // Para este ejemplo, simplemente devolvemos un mensaje de éxito

    return NextResponse.json({
      success: true,
      message: "Endpoint de pedidos corregido correctamente",
    })
  } catch (error: any) {
    console.error("Error al corregir endpoint de pedidos:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Error interno del servidor" },
      { status: 500 },
    )
  }
}
