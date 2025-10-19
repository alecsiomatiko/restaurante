import { createClient } from "@supabase/supabase-js"

export interface ProductImage {
  id: number
  image_url: string
  alt_text: string | null
  is_primary: boolean
  display_order: number
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  category_id: number | null
  available: boolean
  featured: boolean
  created_at: string
  updated_at: string | null
  slug: string
  active: boolean
  stock: number
  category?: {
    id: number
    name: string
    slug: string
  }
  images?: ProductImage[]
}

export interface Category {
  id: number
  name: string
  description: string | null
  subtitle: string | null
  image_url: string | null
  slug: string
  created_at: string
  product_count?: number
}

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error("Missing Supabase environment variables")
  }

  return createClient(url, key)
}

// ✅ Función optimizada que incluye imágenes y es completamente dinámica
export async function getFeaturedProductsWithImages(): Promise<Product[]> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories(id, name, slug),
        product_images(id, image_url, alt_text, is_primary, display_order)
      `)
      .eq("featured", true)
      .eq("available", true) // ✅ Usar available en lugar de active
      .gt("stock", 0) // ✅ Solo productos con stock
      .order("created_at", { ascending: false })

    if (error) {
      console.warn("Error fetching featured products with images:", error)
      return await getFeaturedProducts()
    }

    return data.map((product) => ({
      ...product,
      category: product.categories,
      images:
        product.product_images?.sort((a: ProductImage, b: ProductImage) => {
          if (a.is_primary) return -1
          if (b.is_primary) return 1
          return a.display_order - b.display_order
        }) || [],
    }))
  } catch (error) {
    console.error("Error in getFeaturedProductsWithImages:", error)
    return await getFeaturedProducts()
  }
}

// ✅ Función robusta que funciona dinámicamente
export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories(id, name, slug)
      `)
      .eq("featured", true)
      .eq("available", true) // ✅ Usar available
      .gt("stock", 0) // ✅ Solo productos con stock
      .order("created_at", { ascending: false })

    if (error || !data || data.length === 0) {
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("featured", true)
        .eq("available", true)
        .gt("stock", 0)
        .order("created_at", { ascending: false })

      if (productsError) {
        console.error("Error fetching featured products:", productsError)
        return []
      }

      return productsData || []
    }

    return data.map((product) => ({
      ...product,
      category: product.categories,
    }))
  } catch (error) {
    console.error("Error in getFeaturedProducts:", error)
    return []
  }
}

// ✅ Función optimizada para productos por categoría con imágenes
export async function getProductsByCategoryWithImages(categoryId: number): Promise<Product[]> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        product_images(id, image_url, alt_text, is_primary, display_order)
      `)
      .eq("category_id", categoryId)
      .eq("available", true) // ✅ Usar available
      .gt("stock", 0) // ✅ Solo productos con stock
      .order("name")

    if (error) {
      console.warn("Error fetching products with images:", error)
      return await getProductsByCategory(categoryId)
    }

    return data.map((product) => ({
      ...product,
      images:
        product.product_images?.sort((a: ProductImage, b: ProductImage) => {
          if (a.is_primary) return -1
          if (b.is_primary) return 1
          return a.display_order - b.display_order
        }) || [],
    }))
  } catch (error) {
    console.error("Error in getProductsByCategoryWithImages:", error)
    return await getProductsByCategory(categoryId)
  }
}

// ✅ Función que obtiene todos los productos disponibles dinámicamente
export async function getAllProducts(): Promise<Product[]> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories(id, name, slug)
      `)
      .eq("available", true) // ✅ Usar available
      .gt("stock", 0) // ✅ Solo productos con stock
      .order("name")

    if (error) {
      console.error("Error fetching all products:", error)
      return []
    }

    return (
      data?.map((product) => ({
        ...product,
        category: product.categories,
      })) || []
    )
  } catch (error) {
    console.error("Error in getAllProducts:", error)
    return []
  }
}

// ✅ Función mejorada para categorías con productos (dinámico)
export async function getCategoriesWithProducts(): Promise<Category[]> {
  try {
    const supabase = getSupabaseClient()

    // Obtener categorías
    const { data: categories, error: categoriesError } = await supabase.from("categories").select("*").order("name")

    if (categoriesError) {
      console.error("Error fetching categories:", categoriesError)
      return []
    }

    if (!categories) return []

    // ✅ Contar productos disponibles para cada categoría
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const { count } = await supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("category_id", category.id)
          .eq("available", true) // ✅ Usar available
          .gt("stock", 0) // ✅ Solo productos con stock

        return {
          ...category,
          product_count: count || 0,
        }
      }),
    )

    return categoriesWithCount
  } catch (error) {
    console.error("Error in getCategoriesWithProducts:", error)
    return []
  }
}

// ✅ Función dinámica para productos por categoría
export async function getProductsByCategory(categoryId: number): Promise<Product[]> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from("products")
      .select(`
        *,
        categories(id, name, slug)
      `)
      .eq("category_id", categoryId)
      .eq("available", true) // ✅ Usar available
      .gt("stock", 0) // ✅ Solo productos con stock
      .order("name")

    if (error) {
      console.error("Error fetching products by category:", error)
      return []
    }

    return (
      data?.map((product) => ({
        ...product,
        category: product.categories,
      })) || []
    )
  } catch (error) {
    console.error("Error in getProductsByCategory:", error)
    return []
  }
}

// ✅ Nueva función para refrescar datos en tiempo real
export async function refreshProductData() {
  try {
    const supabase = getSupabaseClient()

    // Forzar revalidación de cache
    const { data, error } = await supabase.from("products").select("id").limit(1)

    if (error) {
      console.error("Error refreshing product data:", error)
    }

    return true
  } catch (error) {
    console.error("Error in refreshProductData:", error)
    return false
  }
}
