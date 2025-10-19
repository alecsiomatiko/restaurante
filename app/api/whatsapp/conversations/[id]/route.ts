import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
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

    const conversationId = params.id

    // Eliminar primero los mensajes (por la restricción de clave foránea)
    const { error: messagesError } = await supabase.from("chat_messages").delete().eq("conversation_id", conversationId)

    if (messagesError) {
      console.error("Error al eliminar mensajes:", messagesError)
      throw messagesError
    }

    // Luego eliminar la conversación
    const { error: conversationError } = await supabase.from("chat_conversations").delete().eq("id", conversationId)

    if (conversationError) {
      console.error("Error al eliminar conversación:", conversationError)
      throw conversationError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar conversación:", error)
    return NextResponse.json({ error: "Error al eliminar conversación" }, { status: 500 })
  }
}
