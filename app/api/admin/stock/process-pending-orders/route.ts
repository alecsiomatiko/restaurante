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

export async function POST() {
  try {
    console.log("Procesando pedidos pendientes...")

    // 1. Obtener todos los pedidos pendientes
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("stock_processed", false)
      .neq("status", "cancelado")
      .order("id")

    if (ordersError) {
      console.error("Error al obtener pedidos pendientes:", ordersError)
      return NextResponse.json(
        {
          success: false,
          message: `Error al obtener pedidos: ${ordersError.message}`,
        },
        { status: 500 },
      )
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay pedidos pendientes para procesar",
        processedOrders: 0,
      })
    }

    console.log(`Se encontraron ${orders.length} pedidos pendientes`)

    // 2. Obtener todos los productos para mapeo
    const { data: products, error: productsError } = await supabaseAdmin.from("products").select("id, name, stock")

    if (productsError || !products) {
      console.error("Error al obtener productos:", productsError)
      return NextResponse.json(
        {
          success: false,
          message: `Error al obtener productos: ${productsError?.message}`,
        },
        { status: 500 },
      )
    }

    // Crear mapeo de nombres a IDs
    const productNameMap = new Map()
    products.forEach((product) => {
      // Mapear por nombre (normalizado)
      productNameMap.set(product.name.toLowerCase(), {
        id: product.id,
        name: product.name,
        stock: product.stock,
      })

      // Mapear por ID como string
      productNameMap.set(product.id.toString(), {
        id: product.id,
        name: product.name,
        stock: product.stock,
      })

      // Mapear versiones simplificadas del nombre
      const simplifiedName = product.name.toLowerCase().replace(/\s+/g, "")
      productNameMap.set(simplifiedName, {
        id: product.id,
        name: product.name,
        stock: product.stock,
      })
    })

    // 3. Procesar cada pedido
    const results = []
    let processedCount = 0
    let errorCount = 0

    for (const order of orders) {
      try {
        console.log(`Procesando pedido #${order.id}`)

        // Asegurarse de que items sea un array
        let items = order.items
        if (typeof items === "string") {
          try {
            items = JSON.parse(items)
          } catch (e) {
            console.error(`Error al parsear items del pedido #${order.id}:`, e)
            results.push({
              orderId: order.id,
              success: false,
              message: `Error al parsear items: ${e.message}`,
            })
            errorCount++
            continue
          }
        }

        if (!Array.isArray(items) || items.length === 0) {
          console.log(`El pedido #${order.id} no tiene items válidos`)
          results.push({
            orderId: order.id,
            success: false,
            message: "El pedido no tiene items válidos",
          })
          errorCount++
          continue
        }

        // Procesar cada item y actualizar stock
        const stockChanges = []
        const updatedProducts = []

        for (const item of items) {
          try {
            // Intentar encontrar el producto
            let productInfo = null

            // Buscar por ID
            if (item.id) {
              const idKey = item.id.toString().toLowerCase()
              if (productNameMap.has(idKey)) {
                productInfo = productNameMap.get(idKey)
              }
            }

            // Si no se encontró por ID, buscar por nombre
            if (!productInfo && item.name) {
              const nameKey = item.name.toLowerCase()
              if (productNameMap.has(nameKey)) {
                productInfo = productNameMap.get(nameKey)
              } else {
                // Intentar con versión simplificada
                const simplifiedName = item.name.toLowerCase().replace(/\s+/g, "")
                if (productNameMap.has(simplifiedName)) {
                  productInfo = productNameMap.get(simplifiedName)
                }
              }
            }

            if (!productInfo) {
              console.warn(`No se encontró producto para el item: ${JSON.stringify(item)}`)
              continue
            }

            // Determinar la cantidad
            let quantity = 1 // Valor predeterminado
            if (item.quantity) {
              if (typeof item.quantity === "string" && item.quantity.includes(".")) {
                // Manejar cantidades decimales
                quantity = Math.round(Number.parseFloat(item.quantity))
              } else {
                quantity = Number.parseInt(item.quantity.toString(), 10)
              }
              if (isNaN(quantity)) quantity = 1
            }

            // Calcular nuevo stock
            const previousStock = productInfo.stock
            const newStock = Math.max(0, previousStock - quantity)

            console.log(
              `Actualizando stock del producto ${productInfo.name} (ID: ${productInfo.id}): ${previousStock} -> ${newStock} (vendido: ${quantity})`,
            )

            // Actualizar el stock en la base de datos
            const { error: updateError } = await supabaseAdmin
              .from("products")
              .update({ stock: newStock })
              .eq("id", productInfo.id)

            if (updateError) {
              console.error(`Error al actualizar stock del producto ${productInfo.id}:`, updateError)
              continue
            }

            // Actualizar el stock en el mapa local
            productNameMap.get(productInfo.name.toLowerCase()).stock = newStock

            updatedProducts.push({
              id: productInfo.id,
              name: productInfo.name,
              previousStock,
              newStock,
              quantity,
            })

            // Registrar el cambio de stock
            stockChanges.push({
              product_id: productInfo.id,
              previous_stock: previousStock,
              new_stock: newStock,
              change_amount: quantity,
              change_type: "order",
              reference_id: order.id,
              notes: `Pedido #${order.id}`,
              timestamp: new Date().toISOString(),
            })
          } catch (itemError) {
            console.error(`Error al procesar item ${JSON.stringify(item)}:`, itemError)
          }
        }

        // Registrar los cambios de stock
        if (stockChanges.length > 0) {
          const { error: stockChangesError } = await supabaseAdmin.from("stock_changes").insert(stockChanges)

          if (stockChangesError) {
            console.warn("Error al registrar cambios de stock:", stockChangesError)
          }
        }

        // Marcar el pedido como procesado
        const { error: markError } = await supabaseAdmin
          .from("orders")
          .update({ stock_processed: true })
          .eq("id", order.id)

        if (markError) {
          console.warn(`Error al marcar el pedido #${order.id} como procesado:`, markError)
        }

        results.push({
          orderId: order.id,
          success: true,
          message: `Stock actualizado para ${updatedProducts.length} productos`,
          updatedProducts,
        })

        processedCount++
      } catch (orderError) {
        console.error(`Error al procesar pedido #${order.id}:`, orderError)
        results.push({
          orderId: order.id,
          success: false,
          message: `Error: ${orderError.message}`,
        })
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Procesados ${processedCount} pedidos, fallidos ${errorCount}`,
      processedOrders: processedCount,
      failedOrders: errorCount,
      results,
    })
  } catch (error) {
    console.error("Error al procesar pedidos pendientes:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Error: ${error.message}`,
      },
      { status: 500 },
    )
  }
}
