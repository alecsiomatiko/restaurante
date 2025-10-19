import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Crear cliente de Supabase con la clave de servicio para tener acceso completo
const supabaseAdmin = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "")

export async function POST(request: NextRequest) {
  try {
    // Verificar que el usuario está autenticado y es administrador
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
      {
        global: { headers: { Authorization: request.headers.get("Authorization") || "" } },
      },
    )

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar si el usuario es administrador
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (userError || !userData || userData.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 })
    }

    // Obtener datos del cuerpo de la solicitud
    const body = await request.json()
    const { to, templateName, languageCode = "es_MX", components = [] } = body

    // Validar datos
    if (!to || !templateName) {
      return NextResponse.json({ error: "Se requieren los campos 'to' y 'templateName'" }, { status: 400 })
    }

    // Validar número de teléfono
    if (!to.match(/^\+\d{10,15}$/)) {
      return NextResponse.json(
        { error: "Formato de número de teléfono inválido. Debe incluir código de país con '+'" },
        { status: 400 },
      )
    }

    // Enviar plantilla a WhatsApp
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json({ error: "Configuración de WhatsApp incompleta en el servidor" }, { status: 500 })
    }

    const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`

    // Construir el mensaje de plantilla
    const message = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
      },
    }

    // Añadir componentes si existen
    if (components && components.length > 0) {
      message.template.components = components
    }

    // Enviar solicitud a la API de WhatsApp
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(message),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error("Error de WhatsApp API:", responseData)
      return NextResponse.json(
        { error: `Error de WhatsApp API: ${responseData.error?.message || JSON.stringify(responseData)}` },
        { status: response.status },
      )
    }

    // Registrar el envío en la base de datos
    try {
      // Buscar o crear conversación
      const { data: conversationData, error: conversationError } = await supabaseAdmin
        .from("chat_conversations")
        .select("id")
        .eq("phone_number", to)
        .maybeSingle()

      let conversationId

      if (conversationError) {
        console.error("Error al buscar conversación:", conversationError)
      }

      // Si no existe una conversación, crearla
      if (!conversationData) {
        const { data: newConversation, error: createError } = await supabaseAdmin
          .from("chat_conversations")
          .insert([{ phone_number: to, platform: "whatsapp", status: "active" }])
          .select("id")
          .single()

        if (createError) {
          console.error("Error al crear conversación:", createError)
        } else {
          conversationId = newConversation.id
        }
      } else {
        conversationId = conversationData.id
      }

      // Guardar el mensaje si tenemos un ID de conversación
      if (conversationId) {
        const { error: messageError } = await supabaseAdmin.from("chat_messages").insert([
          {
            conversation_id: conversationId,
            content: `[Plantilla: ${templateName}]`,
            role: "assistant",
            metadata: { template: templateName, language: languageCode, components },
          },
        ])

        if (messageError) {
          console.error("Error al guardar mensaje:", messageError)
        }
      }
    } catch (dbError) {
      console.error("Error al registrar mensaje en la base de datos:", dbError)
    }

    return NextResponse.json({
      success: true,
      message: "Plantilla enviada correctamente",
      data: responseData,
    })
  } catch (error) {
    console.error("Error al enviar plantilla:", error)
    return NextResponse.json(
      { error: `Error al enviar plantilla: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}
