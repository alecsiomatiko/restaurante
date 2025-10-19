import { type NextRequest, NextResponse } from "next/server"
import { processWhatsAppMessage } from "@/lib/whatsapp-message-processor"
import { sendWhatsAppTextMessage } from "@/lib/whatsapp-service"
import { executeQuery } from "@/lib/mysql-db"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  // Verificar que el token coincida con nuestro token de verificación
  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log("Webhook verificado correctamente")
    return new Response(challenge, { status: 200 })
  } else {
    console.error("Verificación de webhook fallida")
    return new Response("Verification failed", { status: 403 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log("Webhook recibido:", JSON.stringify(body))

    // Verificar si hay mensajes en el webhook
    if (!body.entry?.[0]?.changes?.[0]?.value?.messages) {
      console.log("No hay mensajes en el webhook")
      return NextResponse.json({ success: true })
    }

    const messages = body.entry[0].changes[0].value.messages
    const metadata = body.entry[0].changes[0].value.metadata

    for (const message of messages) {
      // Solo procesar mensajes de texto por ahora
      if (message.type !== "text" || !message.text?.body) {
        continue
      }

      const phoneNumber = message.from
      const messageText = message.text.body
      const messageId = message.id
      const timestamp = message.timestamp

      console.log(`Mensaje recibido de ${phoneNumber}: ${messageText} (ID: ${messageId})`)

      // Verificar si este mensaje ya fue procesado
      const existingMessage = (await executeQuery(
        `SELECT id
         FROM chat_messages
         WHERE message_id = ?
         LIMIT 1`,
        [messageId],
      )) as Array<{ id: number }>

      if (existingMessage && existingMessage.length > 0) {
        console.log(`Mensaje ${messageId} ya procesado anteriormente, ignorando.`)
        continue
      }

      // Buscar o crear una conversación para este número
      let conversationId: string | number
      const existingConversation = (await executeQuery(
        `SELECT id
         FROM chat_conversations
         WHERE phone_number = ?
         ORDER BY created_at DESC
         LIMIT 1`,
        [phoneNumber],
      )) as Array<{ id: number | string }>

      if (existingConversation && existingConversation.length > 0) {
        conversationId = existingConversation[0].id
      } else {
        try {
          const insertResult = (await executeQuery(
            `INSERT INTO chat_conversations (phone_number, platform, status, metadata, created_at, updated_at)
             VALUES (?, 'whatsapp', 'active', ?, NOW(), NOW())`,
            [phoneNumber, JSON.stringify({ whatsapp_business_id: metadata.phone_number_id })],
          )) as { insertId?: number }

          if (insertResult?.insertId) {
            conversationId = insertResult.insertId
          } else {
            const fetchedConversation = (await executeQuery(
              `SELECT id
               FROM chat_conversations
               WHERE phone_number = ?
               ORDER BY created_at DESC
               LIMIT 1`,
              [phoneNumber],
            )) as Array<{ id: number | string }>

            if (!fetchedConversation || fetchedConversation.length === 0) {
              throw new Error("No se pudo obtener la conversación recién creada")
            }

            conversationId = fetchedConversation[0].id
          }
        } catch (error) {
          console.error("Error al crear conversación:", error)
          return NextResponse.json({ success: false, error: "Error al crear conversación" }, { status: 500 })
        }
      }

      // Guardar el mensaje en la base de datos
      const conversationIdValue = typeof conversationId === "number" ? conversationId : Number(conversationId)
      const conversationReference = Number.isNaN(conversationIdValue) ? conversationId : conversationIdValue

      await executeQuery(
        `INSERT INTO chat_messages (conversation_id, message_id, role, content, metadata, created_at)
         VALUES (?, ?, 'user', ?, ?, NOW())`,
        [conversationReference, messageId, messageText, JSON.stringify({ timestamp, source: "whatsapp", phoneNumber })],
      )

      // Procesar el mensaje y generar respuesta
      const response = await processWhatsAppMessage(
        messageText,
        phoneNumber,
        String(conversationReference),
        messageId,
      )

      // Si hay respuesta, enviarla y guardarla
      if (response) {
        // Enviar respuesta al usuario
        await sendWhatsAppTextMessage(phoneNumber, response)

        // Guardar la respuesta en la base de datos
        await executeQuery(
          `INSERT INTO chat_messages (conversation_id, role, content, metadata, created_at)
           VALUES (?, 'assistant', ?, ?, NOW())`,
          [conversationReference, response, JSON.stringify({ source: "whatsapp", phoneNumber })],
        )
      }

      // Actualizar la conversación
      await executeQuery(
        `UPDATE chat_conversations
         SET updated_at = NOW()
         WHERE id = ?`,
        [conversationReference],
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error al procesar webhook:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
