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
    console.log("Iniciando actualización forzada de stock basada en pedidos")

    // Obtener datos de la solicitud
    const { orderId } = await request.json()

    // Si se proporciona un ID de pedido específico, procesar solo ese pedido
    if (orderId) {
      return await processSpecificOrder(orderId)
    }

    // Obtener todos los pedidos
    const { data: orders, error } = await supabaseAdmin
      .from("orders")
      .select("id, items, status")
      .order("id", { ascending: true })

    if (error) {
      console.error("Error al obtener pedidos:", error)
      return NextResponse.json({ success: false, error: "Error al obtener pedidos" }, { status: 500 })
    }

    console.log(`Se encontraron ${orders?.length || 0} pedidos para procesar`)

    if (!orders || orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hay pedidos para procesar",
        processed: 0,
      })
    }

    // Obtener todos los productos para actualizar su stock
    const { data: products, error: productsError } = await supabaseAdmin.from("products").select("id, name, stock")

    if (productsError || !products) {
      console.error("Error al obtener productos:", productsError)
      return NextResponse.json({ success: false, error: "Error al obtener productos" }, { status: 500 })
    }

    console.log(`Se encontraron ${products.length} productos para actualizar stock`)

    // Crear un mapa de productos para acceso rápido
    const productMap = new Map()
    products.forEach((product) => {
      // Inicializar todos los productos con su stock actual
      productMap.set(product.id, {
        name: product.name,
        initialStock: product.stock,
        currentStock: product.stock,
        sold: 0,
      })
    })

    // Procesar cada pedido para calcular cuánto stock se ha vendido
    for (const order of orders) {
      // Solo procesar pedidos completados o pendientes (no cancelados)
      if (order.status === "cancelado") {
        console.log(`Omitiendo pedido #${order.id} porque está cancelado`)
        continue
      }

      try {
        console.log(`Procesando pedido #${order.id}`)

        // Verificar si el pedido tiene items
        if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
          console.warn(`Pedido #${order.id} no tiene items válidos, omitiendo`)
          continue
        }

        // Procesar cada item del pedido
        for (const item of order.items) {
          const productId = typeof item.id === "string" ? Number.parseInt(item.id) : item.id
          const quantity = typeof item.quantity === "string" ? Number.parseInt(item.quantity) : item.quantity

          if (productMap.has(productId)) {
            const productInfo = productMap.get(productId)
            productInfo.sold += quantity
            productMap.set(productId, productInfo)
            console.log(
              `Producto #${productId} (${productInfo.name}): vendido ${quantity}, total vendido: ${productInfo.sold}`,
            )
          } else {
            console.warn(`Producto #${productId} no encontrado en la base de datos, omitiendo`)
          }
        }
      } catch (orderError) {
        console.error(`Error al procesar pedido #${order.id}:`, orderError)
      }
    }

    // Actualizar el stock de cada producto basado en las ventas
    const updateResults = []
    for (const [productId, productInfo] of productMap.entries()) {
      try {
        // Calcular el nuevo stock basado en el stock inicial y las ventas
        const newStock = Math.max(0, productInfo.initialStock - productInfo.sold)

        console.log(
          `Actualizando producto #${productId} (${productInfo.name}): stock inicial ${productInfo.initialStock}, vendido ${productInfo.sold}, nuevo stock ${newStock}`,
        )

        // Actualizar el stock en la base de datos
        const { error: updateError } = await supabaseAdmin
          .from("products")
          .update({ stock: newStock })
          .eq("id", productId)

        if (updateError) {
          console.error(`Error al actualizar stock del producto #${productId}:`, updateError)
          updateResults.push({
            productId,
            name: productInfo.name,
            status: "error",
            error: updateError.message,
          })
        } else {
          updateResults.push({
            productId,
            name: productInfo.name,
            initialStock: productInfo.initialStock,
            sold: productInfo.sold,
            newStock,
            status: "success",
          })
        }
      } catch (error) {
        console.error(`Error al procesar producto #${productId}:`, error)
        updateResults.push({
          productId,
          name: productInfo.name,
          status: "error",
          error: error instanceof Error ? error.message : "Error desconocido",
        })
      }
    }

    // Marcar todos los pedidos como procesados para stock
    const { error: markError } = await supabaseAdmin
      .from("orders")
      .update({ stock_processed: true })
      .is("stock_processed", null)

    if (markError) {
      console.error("Error al marcar pedidos como procesados:", markError)
    }

    return NextResponse.json({
      success: true,
      message: "Stock actualizado correctamente basado en todos los pedidos",
      productsUpdated: updateResults.filter((r) => r.status === "success").length,
      productsFailed: updateResults.filter((r) => r.status === "error").length,
      results: updateResults,
    })
  } catch (error) {
    console.error("Error al actualizar stock:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}

async function processSpecificOrder(orderId: number) {
  try {
    // Obtener el pedido específico
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select("id, items, status")
      .eq("id", orderId)
      .single()

    if (error || !order) {
      console.error(`Error al obtener pedido #${orderId}:`, error)
      return NextResponse.json({ success: false, error: `Pedido #${orderId} no encontrado` }, { status: 404 })
    }

    // Verificar si el pedido está cancelado
    if (order.status === "cancelado") {
      return NextResponse.json(
        {
          success: false,
          error: `El pedido #${orderId} está cancelado, no se actualizará el stock`,
        },
        { status: 400 },
      )
    }

    // Verificar si el pedido tiene items
    if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `El pedido #${orderId} no tiene items válidos`,
        },
        { status: 400 },
      )
    }

    const results = []

    // Procesar cada item del pedido
    for (const item of order.items) {
      const productId = typeof item.id === "string" ? Number.parseInt(item.id) : item.id
      const quantity = typeof item.quantity === "string" ? Number.parseInt(item.quantity) : item.quantity

      // Obtener el producto
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("id, name, stock")
        .eq("id", productId)
        .single()

      if (productError || !product) {
        console.error(`Producto #${productId} no encontrado:`, productError)
        results.push({
          productId,
          status: "error",
          error: `Producto no encontrado`,
        })
        continue
      }

      // Actualizar el stock
      const newStock = Math.max(0, product.stock - quantity)

      console.log(
        `Actualizando producto #${productId} (${product.name}): stock actual ${product.stock}, cantidad ${quantity}, nuevo stock ${newStock}`,
      )

      const { error: updateError } = await supabaseAdmin
        .from("products")
        .update({ stock: newStock })
        .eq("id", productId)

      if (updateError) {
        console.error(`Error al actualizar stock del producto #${productId}:`, updateError)
        results.push({
          productId,
          name: product.name,
          status: "error",
          error: updateError.message,
        })
      } else {
        results.push({
          productId,
          name: product.name,
          initialStock: product.stock,
          quantity,
          newStock,
          status: "success",
        })
      }
    }

    // Marcar el pedido como procesado para stock
    const { error: markError } = await supabaseAdmin.from("orders").update({ stock_processed: true }).eq("id", orderId)

    if (markError) {
      console.error(`Error al marcar pedido #${orderId} como procesado:`, markError)
    }

    return NextResponse.json({
      success: true,
      message: `Stock actualizado correctamente para el pedido #${orderId}`,
      productsUpdated: results.filter((r) => r.status === "success").length,
      productsFailed: results.filter((r) => r.status === "error").length,
      results,
    })
  } catch (error) {
    console.error(`Error al procesar pedido #${orderId}:`, error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
