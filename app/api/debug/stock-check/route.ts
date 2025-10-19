import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente de Supabase con rol de servicio para omitir RLS
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

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const productId = url.searchParams.get("productId")

    if (productId) {
      // Obtener información de un producto específico
      const { data: product, error: productError } = await supabaseAdmin
        .from("products")
        .select("id, name, price, stock")
        .eq("id", productId)
        .single()

      if (productError) {
        return NextResponse.json({ error: productError.message }, { status: 500 })
      }

      // Obtener historial de cambios de stock para este producto
      const { data: stockChanges, error: changesError } = await supabaseAdmin
        .from("stock_changes")
        .select("*")
        .eq("product_id", productId)
        .order("timestamp", { ascending: false })
        .limit(10)

      if (changesError) {
        return NextResponse.json({
          product,
          stockChanges: [],
          error: "Error al obtener historial de cambios",
        })
      }

      return NextResponse.json({ product, stockChanges })
    } else {
      // Obtener productos con stock bajo
      const { data: lowStockProducts, error: lowStockError } = await supabaseAdmin
        .from("products")
        .select("id, name, price, stock")
        .lt("stock", 10)
        .order("stock", { ascending: true })

      if (lowStockError) {
        return NextResponse.json({ error: lowStockError.message }, { status: 500 })
      }

      // Obtener últimos cambios de stock
      const { data: recentChanges, error: changesError } = await supabaseAdmin
        .from("stock_changes")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(20)

      if (changesError) {
        return NextResponse.json({
          lowStockProducts,
          recentChanges: [],
          error: "Error al obtener cambios recientes",
        })
      }

      return NextResponse.json({ lowStockProducts, recentChanges })
    }
  } catch (error: any) {
    console.error("Error en verificación de stock:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
