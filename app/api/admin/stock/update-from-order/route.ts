import { NextResponse } from "next/server"
import { updateStockFromOrder } from "@/lib/db-functions"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ success: false, message: "ID de pedido requerido" }, { status: 400 })
    }

    const result = await updateStockFromOrder(Number(orderId))
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
