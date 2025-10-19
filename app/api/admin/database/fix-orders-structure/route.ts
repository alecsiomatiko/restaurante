import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente de Supabase con las credenciales de servicio
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fixAll = false, orderId } = body

    if (!fixAll && !orderId) {
      return NextResponse.json(
        { success: false, error: "Debe especificar fixAll=true o un orderId específico" },
        { status: 400 },
      )
    }

    let query = supabaseAdmin.from("orders").select("*")

    if (!fixAll && orderId) {
      query = query.eq("id", orderId)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error("Error al obtener pedidos:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: true, message: "No hay pedidos para corregir", fixed: 0 })
    }

    let fixedCount = 0
    let failedCount = 0
    const results = []

    for (const order of orders) {
      try {
        let items = order.items
        let needsFix = false
        let fixDescription = ""

        // Verificar si items es un string y necesita ser parseado
        if (typeof items === "string") {
          try {
            items = JSON.parse(items)
            needsFix = true
            fixDescription = "Convertido de string a objeto JSON"
          } catch (e) {
            failedCount++
            results.push({
              id: order.id,
              success: false,
              error: `Error al parsear items: ${e.message}`,
            })
            continue
          }
        }

        // Verificar si los items tienen la estructura correcta
        if (Array.isArray(items)) {
          const validItems = items.every(
            (item) => item && typeof item === "object" && item.id !== undefined && item.quantity !== undefined,
          )

          if (!validItems) {
            failedCount++
            results.push({
              id: order.id,
              success: false,
              error: "Los items no tienen la estructura correcta (id y quantity)",
            })
            continue
          }

          // Asegurarse de que id y quantity sean números
          const fixedItems = items.map((item) => ({
            ...item,
            id: typeof item.id === "string" ? Number.parseInt(item.id) : item.id,
            quantity: typeof item.quantity === "string" ? Number.parseInt(item.quantity) : item.quantity,
          }))

          if (JSON.stringify(fixedItems) !== JSON.stringify(items)) {
            items = fixedItems
            needsFix = true
            fixDescription += " Convertidos id y quantity a números."
          }
        } else {
          failedCount++
          results.push({
            id: order.id,
            success: false,
            error: "Items no es un array",
          })
          continue
        }

        // Actualizar el pedido si es necesario
        if (needsFix) {
          const { error: updateError } = await supabaseAdmin.from("orders").update({ items }).eq("id", order.id)

          if (updateError) {
            failedCount++
            results.push({
              id: order.id,
              success: false,
              error: `Error al actualizar: ${updateError.message}`,
            })
          } else {
            fixedCount++
            results.push({
              id: order.id,
              success: true,
              description: fixDescription,
            })
          }
        } else {
          results.push({
            id: order.id,
            success: true,
            description: "No requiere corrección",
          })
        }
      } catch (e) {
        failedCount++
        results.push({
          id: order.id,
          success: false,
          error: `Error inesperado: ${e.message}`,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Proceso completado. ${fixedCount} pedidos corregidos, ${failedCount} fallidos.`,
      fixed_count: fixedCount,
      failed_count: failedCount,
      results,
    })
  } catch (error) {
    console.error("Error en la corrección de pedidos:", error)
    return NextResponse.json({ success: false, error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
