import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAdmin } from "@/lib/auth-simple"

// Cliente de Supabase con rol de servicio
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

export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    console.log("Iniciando corrección de la tabla de productos...")

    // 1. Verificar si la columna stock existe
    const { data: columns, error: columnsError } = await supabaseAdmin.rpc("get_table_columns", {
      table_name: "products",
    })

    if (columnsError) {
      console.error("Error al obtener columnas:", columnsError)
      return NextResponse.json({ success: false, error: columnsError.message }, { status: 500 })
    }

    const hasStockColumn = columns.some((col: any) => col.column_name === "stock")

    if (!hasStockColumn) {
      console.log("La columna stock no existe. Añadiendo columna...")

      // Añadir columna stock
      await supabaseAdmin.rpc("execute_sql", {
        sql_query: "ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 10",
      })

      console.log("Columna stock añadida correctamente.")
    } else {
      console.log("La columna stock ya existe.")
    }

    // 2. Verificar y actualizar valores de stock
    const { data: products, error: productsError } = await supabaseAdmin.from("products").select("id, stock, name")

    if (productsError) {
      console.error("Error al obtener productos:", productsError)
      return NextResponse.json({ success: false, error: productsError.message }, { status: 500 })
    }

    console.log(`Encontrados ${products.length} productos.`)

    // Actualizar productos sin stock o con stock null
    const productsToUpdate = products.filter((p: any) => p.stock === null || p.stock === undefined)
    let updatedCount = 0

    if (productsToUpdate.length > 0) {
      console.log(`Actualizando ${productsToUpdate.length} productos sin valor de stock...`)

      for (const product of productsToUpdate) {
        const { error: updateError } = await supabaseAdmin
          .from("products")
          .update({ stock: 10 }) // Valor predeterminado
          .eq("id", product.id)

        if (updateError) {
          console.error(`Error al actualizar producto ${product.id}:`, updateError)
        } else {
          updatedCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Corrección de productos completada",
      totalProducts: products.length,
      productsUpdated: updatedCount,
    })
  } catch (error: any) {
    console.error("Error al corregir la tabla de productos:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
})
