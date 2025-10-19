import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/auth-simple"

export const GET = requireAdmin(async (request: NextRequest) => {
  try {
    const supabase = createClient()
    const url = new URL(request.url)

    // Parámetros de filtrado
    const productId = url.searchParams.get("productId")
    const changeType = url.searchParams.get("changeType")
    const fromDate = url.searchParams.get("fromDate")
    const toDate = url.searchParams.get("toDate")

    // Construir consulta
    let query = supabase.from("stock_changes").select("*").order("timestamp", { ascending: false })

    // Aplicar filtros
    if (productId) {
      query = query.eq("product_id", productId)
    }

    if (changeType) {
      query = query.eq("change_type", changeType)
    }

    if (fromDate) {
      query = query.gte("timestamp", fromDate)
    }

    if (toDate) {
      query = query.lte("timestamp", toDate)
    }

    // Ejecutar consulta
    const { data, error } = await query

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 })
    }

    // Obtener nombres de productos
    const productIds = [...new Set(data?.map((change) => change.product_id) || [])]
    let productNames: Record<number, string> = {}

    if (productIds.length > 0) {
      const { data: productsData } = await supabase.from("products").select("id, name").in("id", productIds)

      if (productsData) {
        productNames = productsData.reduce(
          (acc, product) => {
            acc[product.id] = product.name
            return acc
          },
          {} as Record<number, string>,
        )
      }
    }

    // Enriquecer datos con nombres de productos
    const enrichedData = data?.map((change) => ({
      ...change,
      product_name: productNames[change.product_id] || `Producto #${change.product_id}`,
    }))

    return NextResponse.json({
      success: true,
      data: enrichedData || [],
    })
  } catch (error: any) {
    console.error("Error al obtener historial de stock:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Error interno del servidor" },
      { status: 500 },
    )
  }
})
