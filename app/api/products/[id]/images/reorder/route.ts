import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server-app"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { imageOrders } = await request.json()

    // Actualizar el orden de las imágenes
    const updates = imageOrders.map((item: { id: number; order: number }) =>
      supabase.from("product_images").update({ display_order: item.order }).eq("id", item.id),
    )

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error reordering images:", error)
    return NextResponse.json({ error: "Failed to reorder images" }, { status: 500 })
  }
}
