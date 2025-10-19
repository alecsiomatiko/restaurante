import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { name } = body

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nombre de producto no válido" }, { status: 400 })
    }

    const supabase = createClient()

    // Buscar el producto por nombre (búsqueda parcial)
    const { data: products, error } = await supabase
      .from("products")
      .select("*")
      .ilike("name", `%${name}%`)
      .eq("active", true)
      .gt("stock", 0)
      .order("name")
      .limit(1)

    if (error) {
      console.error("Error al buscar producto:", error)
      return NextResponse.json({ error: "Error al buscar producto" }, { status: 500 })
    }

    if (!products || products.length === 0) {
      return NextResponse.json({ message: "Producto no encontrado" }, { status: 404 })
    }

    return NextResponse.json({ product: products[0] })
  } catch (error: any) {
    console.error("Error en la API de búsqueda de productos:", error)
    return NextResponse.json({ error: "Error al procesar la solicitud", details: error.message }, { status: 500 })
  }
}
