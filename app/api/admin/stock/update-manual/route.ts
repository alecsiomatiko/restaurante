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
    const { productId, newStock } = body

    if (!productId || newStock === undefined || isNaN(Number(newStock)) || Number(newStock) < 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Datos inválidos. Se requiere un ID de producto y un valor de stock válido.",
        },
        { status: 400 },
      )
    }

    // Obtener el stock actual
    const { data: product, error: getError } = await supabaseAdmin
      .from("products")
      .select("id, name, stock")
      .eq("id", productId)
      .single()

    if (getError || !product) {
      console.error("Error al obtener producto:", getError)
      return NextResponse.json(
        {
          success: false,
          message: `Error al obtener producto: ${getError?.message || "Producto no encontrado"}`,
        },
        { status: 404 },
      )
    }

    const previousStock = product.stock
    const stockValue = Number(newStock)

    // Actualizar el stock
    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({ stock: stockValue })
      .eq("id", productId)

    if (updateError) {
      console.error("Error al actualizar stock:", updateError)
      return NextResponse.json(
        {
          success: false,
          message: `Error al actualizar stock: ${updateError.message}`,
        },
        { status: 500 },
      )
    }

    // Registrar el cambio de stock
    const changeAmount = previousStock - stockValue
    const { error: logError } = await supabaseAdmin.from("stock_changes").insert({
      product_id: productId,
      previous_stock: previousStock,
      new_stock: stockValue,
      change_amount: Math.abs(changeAmount),
      change_type: changeAmount > 0 ? "manual_decrease" : "manual_increase",
      notes: `Actualización manual: ${previousStock} → ${stockValue}`,
      timestamp: new Date().toISOString(),
    })

    if (logError) {
      console.warn("Error al registrar cambio de stock:", logError)
    }

    // Registrar en debug_logs
    await supabaseAdmin.from("debug_logs").insert({
      message: "Actualización manual de stock",
      data: {
        product_id: productId,
        product_name: product.name,
        previous_stock: previousStock,
        new_stock: stockValue,
        change_amount: Math.abs(changeAmount),
        change_type: changeAmount > 0 ? "manual_decrease" : "manual_increase",
      },
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: `Stock de ${product.name} actualizado de ${previousStock} a ${stockValue}`,
      product: {
        id: product.id,
        name: product.name,
        previousStock,
        newStock: stockValue,
      },
    })
  } catch (error) {
    console.error("Error al actualizar stock manualmente:", error)
    return NextResponse.json(
      {
        success: false,
        message: `Error: ${error.message}`,
      },
      { status: 500 },
    )
  }
}
