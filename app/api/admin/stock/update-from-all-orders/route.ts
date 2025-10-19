import { NextResponse } from "next/server"
import { updateStockFromAllOrders } from "@/lib/db-functions"

export async function POST() {
  try {
    const result = await updateStockFromAllOrders()
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }
}
