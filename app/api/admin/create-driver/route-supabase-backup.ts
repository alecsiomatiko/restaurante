import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Obtener el usuario actual para verificar que es administrador
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar si el usuario es administrador
    const { data: adminCheck } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single()

    if (!adminCheck?.is_admin) {
      return NextResponse.json({ error: "Se requieren permisos de administrador" }, { status: 403 })
    }

    // Obtener los datos del cuerpo de la solicitud
    const { userId, name, phone, email } = await request.json()

    if (!userId || !name || !phone || !email) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Verificar si el usuario existe
    const { data: userExists } = await supabase.from("profiles").select("id").eq("id", userId).single()

    if (!userExists) {
      return NextResponse.json({ error: "El usuario seleccionado no existe" }, { status: 404 })
    }

    // Verificar si ya existe como repartidor
    const { data: existingDriver } = await supabase.from("delivery_drivers").select("*").eq("user_id", userId).single()

    if (existingDriver) {
      // Actualizar datos del repartidor
      await supabase
        .from("delivery_drivers")
        .update({
          name,
          phone,
          email,
          is_active: true,
        })
        .eq("user_id", userId)

      return NextResponse.json({
        success: true,
        message: "Datos del repartidor actualizados correctamente",
        driver: {
          id: existingDriver.id,
          user_id: userId,
          name,
          phone,
          email,
        },
      })
    } else {
      // Crear repartidor
      const { data: newDriver, error } = await supabase
        .from("delivery_drivers")
        .insert({
          user_id: userId,
          name,
          phone,
          email,
          is_active: true,
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: "Repartidor creado correctamente",
        driver: newDriver,
      })
    }
  } catch (error: any) {
    console.error("Error al crear repartidor:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Mantener el método GET para compatibilidad, pero marcarlo como obsoleto
export async function GET() {
  return NextResponse.json(
    {
      error: "Este método está obsoleto. Por favor, usa POST con los datos del usuario.",
    },
    { status: 400 },
  )
}
