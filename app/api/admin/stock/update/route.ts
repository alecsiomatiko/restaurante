import { type NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/mysql-db"
import { requireAdmin } from "@/lib/auth-simple"

export const POST = requireAdmin(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { productId, newStock, notes } = body

    if (!productId || newStock === undefined || newStock < 0) {
      return NextResponse.json({ success: false, message: "Datos inválidos" }, { status: 400 })
    }

    await executeQuery("UPDATE products SET stock = ?, updated_at = NOW() WHERE id = ?", [newStock, productId])

    if (notes) {
      try {
        await executeQuery(
          `INSERT INTO stock_changes (product_id, previous_stock, new_stock, change_amount, change_type, reference_id, notes, created_by, created_at)
           VALUES (?, NULL, ?, NULL, 'manual', NULL, ?, ?, NOW())`,
          [productId, newStock, notes, user?.id ?? null],
        )
      } catch (logError: any) {
        if (logError?.code !== "ER_NO_SUCH_TABLE") {
          console.warn("No se pudo registrar nota de stock manual:", logError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Stock actualizado correctamente a ${newStock}`,
      newStock,
    })
  } catch (error: any) {
    console.error("Error en actualización de stock:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Error interno del servidor" },
      { status: 500 },
    )
  }
})
