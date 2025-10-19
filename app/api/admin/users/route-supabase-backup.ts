import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
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

    // Obtener todos los usuarios con sus perfiles
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, username, is_admin, created_at")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Obtener los repartidores existentes para marcar cuáles ya son repartidores
    const { data: drivers } = await supabase.from("delivery_drivers").select("user_id")

    const driverUserIds = drivers?.map((driver) => driver.user_id) || []

    // Añadir una propiedad para indicar si el usuario ya es repartidor
    const usersWithDriverStatus = users?.map((user) => ({
      ...user,
      is_driver: driverUserIds.includes(user.id),
    }))

    return NextResponse.json({ users: usersWithDriverStatus })
  } catch (error: any) {
    console.error("Error al obtener usuarios:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
