import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente de Supabase con rol de servicio para operaciones críticas
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
    const { resetStock = false } = body

    console.log("Iniciando actualización directa de stock desde pedidos")
    console.log("Resetear stock a valores iniciales:", resetStock)

    // Paso 1: Obtener todos los productos
    const { data: products, error: productsError } = await supabaseAdmin.from("products").select("id, name, stock")

    if (productsError) {
      console.error("Error al obtener productos:", productsError)
      return NextResponse.json({ success: false, error: productsError.message }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ success: false, error: "No se encontraron productos" }, { status: 404 })
    }

    console.log(`Se encontraron ${products.length} productos`)

    // Paso 2: Obtener todos los pedidos (excepto cancelados)
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, items, status")
      .neq("status", "cancelado")

    if (ordersError) {
      console.error("Error al obtener pedidos:", ordersError)
      return NextResponse.json({ success: false, error: ordersError.message }, { status: 500 })
    }

    console.log(`Se encontraron ${orders?.length || 0} pedidos activos`)

    // Paso 3: Calcular las ventas totales por producto
    const salesByProduct = new Map()

    // Inicializar el mapa con todos los productos
    products.forEach((product) => {
      salesByProduct.set(product.id, {
        id: product.id,
        name: product.name,
        currentStock: product.stock,
        totalSold: 0,
        initialStock: resetStock ? 20 : product.stock, // Usar 20 como stock inicial si se solicita reset
      })
    })

    // Procesar cada pedido
    let processedOrders = 0
    let skippedOrders = 0
    let invalidOrders = 0

    orders?.forEach((order) => {
      try {
        let items = order.items

        // Si items es un string, intentar parsearlo
        if (typeof items === "string") {
          try {
            items = JSON.parse(items)
          } catch (e) {
            console.warn(`Pedido ${order.id}: Error al parsear items - ${e.message}`)
            invalidOrders++
            return
          }
        }

        // Verificar si items es un array
        if (!Array.isArray(items)) {
          console.warn(`Pedido ${order.id}: items no es un array`)
          invalidOrders++
          return
        }

        // Procesar cada item del pedido
        let validItems = 0
        items.forEach((item) => {
          try {
            // Verificar si el item tiene la estructura correcta
            if (!item || typeof item !== "object" || item.id === undefined || item.quantity === undefined) {
              console.warn(`Pedido ${order.id}: Item con estructura inválida - ${JSON.stringify(item)}`)
              return
            }

            // Normalizar id y quantity a números
            const productId = typeof item.id === "string" ? Number.parseInt(item.id) : item.id
            const quantity = typeof item.quantity === "string" ? Number.parseInt(item.quantity) : item.quantity

            if (isNaN(productId) || isNaN(quantity)) {
              console.warn(`Pedido ${order.id}: ID o cantidad inválidos - ${JSON.stringify(item)}`)
              return
            }

            // Actualizar las ventas totales para este producto
            if (salesByProduct.has(productId)) {
              const productData = salesByProduct.get(productId)
              productData.totalSold += quantity
              salesByProduct.set(productId, productData)
              validItems++
            } else {
              console.warn(`Pedido ${order.id}: Producto con ID ${productId} no encontrado`)
            }
          } catch (itemError) {
            console.warn(`Error al procesar item en pedido ${order.id}:`, itemError)
          }
        })

        if (validItems > 0) {
          processedOrders++
        } else {
          skippedOrders++
        }
      } catch (orderError) {
        console.warn(`Error al procesar pedido ${order.id}:`, orderError)
        invalidOrders++
      }
    })

    console.log(`Pedidos procesados: ${processedOrders}, omitidos: ${skippedOrders}, inválidos: ${invalidOrders}`)

    // Paso 4: Actualizar el stock de cada producto
    const updateResults = []
    let successCount = 0
    let errorCount = 0

    for (const [productId, data] of salesByProduct.entries()) {
      try {
        // Calcular el nuevo stock
        const newStock = Math.max(0, data.initialStock - data.totalSold)
        console.log(
          `Producto ${data.name} (ID: ${productId}): Stock inicial ${data.initialStock}, vendido ${data.totalSold}, nuevo stock ${newStock}`,
        )

        // Actualizar el stock en la base de datos
        const { error: updateError } = await supabaseAdmin
          .from("products")
          .update({ stock: newStock })
          .eq("id", productId)

        if (updateError) {
          console.error(`Error al actualizar stock del producto ${productId}:`, updateError)
          errorCount++
          updateResults.push({
            id: productId,
            name: data.name,
            initialStock: data.initialStock,
            totalSold: data.totalSold,
            newStock: data.currentStock, // No cambió
            success: false,
            error: updateError.message,
          })
        } else {
          successCount++
          updateResults.push({
            id: productId,
            name: data.name,
            initialStock: data.initialStock,
            totalSold: data.totalSold,
            newStock,
            success: true,
          })
        }
      } catch (updateError) {
        console.error(`Error al procesar actualización del producto ${productId}:`, updateError)
        errorCount++
        updateResults.push({
          id: productId,
          name: data.name,
          initialStock: data.initialStock,
          totalSold: data.totalSold,
          newStock: data.currentStock, // No cambió
          success: false,
          error: updateError.message,
        })
      }
    }

    // Paso 5: Marcar todos los pedidos como procesados para stock
    try {
      await supabaseAdmin.from("orders").update({ stock_processed: true }).is("stock_processed", null)
      await supabaseAdmin.from("orders").update({ stock_processed: true }).eq("stock_processed", false)
      console.log("Todos los pedidos marcados como procesados para stock")
    } catch (markError) {
      console.warn("Error al marcar pedidos como procesados:", markError)
    }

    return NextResponse.json({
      success: true,
      message: `Stock actualizado correctamente. ${successCount} productos actualizados, ${errorCount} errores.`,
      orders_processed: processedOrders,
      orders_skipped: skippedOrders,
      orders_invalid: invalidOrders,
      products_updated: successCount,
      products_failed: errorCount,
      results: updateResults,
    })
  } catch (error) {
    console.error("Error en actualización directa de stock:", error)
    return NextResponse.json({ success: false, error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}
