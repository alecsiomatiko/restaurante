import { NextResponse } from "next/server"
import { updateStockFromAllOrders } from "@/lib/db-functions"

export async function POST(request: Request) {
  try {
    console.log("Iniciando re-procesamiento de stock desde pedidos en MySQL")

    const result = await updateStockFromAllOrders()

    return NextResponse.json({
      success: result.success,
      processed: result.processedOrders,
      failed: result.failedOrders,
      total: result.processedOrders + result.failedOrders,
      message: result.message,
      details: result.details,
    })
  } catch (error) {
    console.error("Error al procesar pedidos existentes:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    )
  }
}
