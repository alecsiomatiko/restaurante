import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("categories").select("*").order("name")

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Error al obtener categorías:", error)
    return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: "El nombre de la categoría es requerido" }, { status: 400 })
    }

    const supabase = createClient()
    const { data, error } = await supabase.from("categories").insert([{ name }]).select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error("Error al crear categoría:", error)
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 })
  }
}
