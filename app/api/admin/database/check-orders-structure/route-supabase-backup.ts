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

export async function GET() {
  try {
    // Obtener los primeros 10 pedidos para analizar su estructura
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)

    if (error) {
      console.error("Error al obtener pedidos:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: true, message: "No hay pedidos en el sistema", orders: [] })
    }

    // Analizar la estructura de los pedidos
    const ordersAnalysis = orders.map((order) => {
      let itemsStructure = "No hay items"
      let itemsValid = false
      let sampleItem = null

      try {
        // Verificar si items es un string JSON
        if (typeof order.items === "string") {
          const parsedItems = JSON.parse(order.items)
          itemsStructure = "String JSON"

          // Verificar si es un array
          if (Array.isArray(parsedItems)) {
            itemsStructure = "Array en String JSON"
            itemsValid =
              parsedItems.length > 0 &&
              parsedItems.every((item) => item.id !== undefined && item.quantity !== undefined)

            if (parsedItems.length > 0) {
              sampleItem = parsedItems[0]
            }
          }
        }
        // Verificar si items es un objeto JSON
        else if (typeof order.items === "object") {
          itemsStructure = "Objeto JSON"

          // Verificar si es un array
          if (Array.isArray(order.items)) {
            itemsStructure = "Array en Objeto JSON"
            itemsValid =
              order.items.length > 0 &&
              order.items.every((item) => item.id !== undefined && item.quantity !== undefined)

            if (order.items.length > 0) {
              sampleItem = order.items[0]
            }
          }
        }
      } catch (e) {
        itemsStructure = `Error al analizar: ${e.message}`
      }

      return {
        id: order.id,
        status: order.status,
        created_at: order.created_at,
        items_structure: itemsStructure,
        items_valid: itemsValid,
        sample_item: sampleItem,
        stock_processed: order.stock_processed,
      }
    })

    return NextResponse.json({
      success: true,
      message: "Análisis de estructura de pedidos completado",
      orders_count: orders.length,
      orders_analysis: ordersAnalysis,
    })
  } catch (error) {
    console.error("Error en el análisis de pedidos:", error)
    return NextResponse.json({ success: false, error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
