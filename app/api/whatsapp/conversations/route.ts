import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function DELETE() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verificar si el usuario es administrador
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", session.user.id).single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Eliminar todas las conversaciones
    // Nota: Las mensajes se eliminarán automáticamente debido a la restricción ON DELETE CASCADE
    const { error } = await supabase
      .from("chat_conversations")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000") // Evitar eliminar registros con ID específico si es necesario

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar conversaciones:", error)
    return NextResponse.json({ error: "Error al eliminar conversaciones" }, { status: 500 })
  }
}
