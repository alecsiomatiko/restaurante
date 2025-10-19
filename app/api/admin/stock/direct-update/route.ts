import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Crear un cliente de Supabase con las credenciales de servicio
const supabaseAdmin = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "", {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { productId, newStock, notes } = body

    if (!productId || newStock === undefined || newStock < 0) {
      return NextResponse.json({ success: false, message: "Datos inválidos" }, { status: 400 })
    }

    console.log(`Actualizando stock del producto ${productId} a ${newStock}`)

    // Obtener stock actual
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, stock, name")
      .eq("id", productId)
      .single()

    if (productError) {
      console.error("Error al obtener producto:", productError)
      return NextResponse.json({ success: false, message: "Producto no encontrado" }, { status: 404 })
    }

    const previousStock = product.stock || 0
    const changeAmount = newStock - previousStock

    // Actualizar stock directamente con el cliente admin
    const { error: updateError } = await supabaseAdmin.from("products").update({ stock: newStock }).eq("id", productId)

    if (updateError) {
      console.error("Error al actualizar stock:", updateError)
      return NextResponse.json({ success: false, message: "Error al actualizar el stock" }, { status: 500 })
    }

    // Intentar registrar el cambio de stock
    try {
      await supabaseAdmin.from("stock_changes").insert([
        {
          product_id: productId,
          previous_stock: previousStock,
          new_stock: newStock,
          change_amount: changeAmount,
          change_type: "manual",
          notes: notes || "Actualización manual de stock",
          timestamp: new Date().toISOString(),
        },
      ])
    } catch (logError) {
      console.warn("Error al registrar cambio de stock:", logError)
      // No fallamos la operación si solo falla el registro
    }

    return NextResponse.json({
      success: true,
      message: `Stock actualizado correctamente de ${previousStock} a ${newStock}`,
      previousStock,
      newStock,
      changeAmount,
    })
  } catch (error: any) {
    console.error("Error en actualización directa de stock:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Error interno del servidor" },
      { status: 500 },
    )
  }
}
