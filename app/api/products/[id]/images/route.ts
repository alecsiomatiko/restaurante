import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { put, del } from "@vercel/blob"

// Crear cliente de Supabase para API routes
function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(url, key)
}

// GET - Obtener todas las imágenes de un producto
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseClient()
    const productId = Number.parseInt(params.id)

    const { data, error } = await supabase
      .from("product_images")
      .select("*")
      .eq("product_id", productId)
      .order("display_order", { ascending: true })

    if (error) throw error

    return NextResponse.json({ images: data || [] })
  } catch (error) {
    console.error("Error fetching product images:", error)
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 })
  }
}

// POST - Subir nueva imagen
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseClient()
    const productId = Number.parseInt(params.id)
    const formData = await request.formData()
    const file = formData.get("file") as File
    const altText = formData.get("altText") as string
    const isPrimary = formData.get("isPrimary") === "true"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Validar archivo
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File must be an image" }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 })
    }

    // Subir a Vercel Blob
    const timestamp = Date.now()
    const extension = file.name.split(".").pop()
    const filename = `products/${productId}/${timestamp}.${extension}`

    const blob = await put(filename, file, { access: "public" })

    // Obtener el siguiente display_order
    const { data: lastImage } = await supabase
      .from("product_images")
      .select("display_order")
      .eq("product_id", productId)
      .order("display_order", { ascending: false })
      .limit(1)

    const nextOrder = lastImage && lastImage.length > 0 ? lastImage[0].display_order + 1 : 0

    // Si es imagen principal, desmarcar las demás
    if (isPrimary) {
      await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId)
    }

    // Insertar nueva imagen
    const { data: newImage, error } = await supabase
      .from("product_images")
      .insert({
        product_id: productId,
        image_url: blob.url,
        alt_text: altText || "",
        display_order: nextOrder,
        is_primary: isPrimary,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ image: newImage })
  } catch (error) {
    console.error("Error uploading image:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}

// DELETE - Eliminar imagen
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getSupabaseClient()
    const { searchParams } = new URL(request.url)
    const imageId = searchParams.get("imageId")

    if (!imageId) {
      return NextResponse.json({ error: "Image ID required" }, { status: 400 })
    }

    // Obtener la imagen antes de eliminar
    const { data: image, error: fetchError } = await supabase
      .from("product_images")
      .select("*")
      .eq("id", Number.parseInt(imageId))
      .single()

    if (fetchError || !image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 })
    }

    // Eliminar de Vercel Blob
    try {
      await del(image.image_url)
    } catch (blobError) {
      console.warn("Failed to delete from blob storage:", blobError)
    }

    // Eliminar de la base de datos
    const { error: deleteError } = await supabase.from("product_images").delete().eq("id", Number.parseInt(imageId))

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting image:", error)
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 })
  }
}
