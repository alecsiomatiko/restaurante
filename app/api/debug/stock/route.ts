import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Función para verificar si el usuario es administrador
async function isAdmin(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

    // Crear cliente de Supabase
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    })

    // Obtener token de la cookie
    const token = cookieStore.get("sb-access-token")?.value

    if (!token) {
      console.log("No se encontró token de autenticación")
      return false
    }

    // Configurar el token en el cliente
    supabase.auth.setSession({
      access_token: token,
      refresh_token: cookieStore.get("sb-refresh-token")?.value || "",
    })

    // Obtener usuario actual
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      console.log("Error al obtener usuario:", userError)
      return false
    }

    // Verificar si el usuario es administrador
    const { data: userData, error: dbError } = await supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single()

    if (dbError || !userData) {
      console.log("Error al verificar permisos de administrador:", dbError)
      return false
    }

    return userData.is_admin === true
  } catch (error) {
    console.error("Error al verificar permisos:", error)
    return false
  }
}

// Endpoint para obtener información de depuración
export async function GET(request: NextRequest) {
  try {
    // Verificar si el usuario es administrador
    const admin = await isAdmin(request)

    if (!admin) {
      console.log("Acceso denegado: El usuario no es administrador")
      return NextResponse.json({ error: "No tienes permisos para acceder a esta información" }, { status: 403 })
    }

    // Crear cliente de Supabase con rol de servicio para operaciones privilegiadas
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

    // Verificar si existe la tabla stock_changes
    let stockChangesExists = false
    let stockChangesError = null

    try {
      const { data, error } = await supabaseAdmin
        .from("information_schema.tables")
        .select("table_name")
        .eq("table_schema", "public")
        .eq("table_name", "stock_changes")
        .single()

      stockChangesExists = !!data
      if (error) stockChangesError = error.message
    } catch (error: any) {
      stockChangesError = error.message
    }

    // Verificar si la columna stock existe en la tabla products
    let stockColumnExists = false
    let stockColumnError = null

    try {
      const { data, error } = await supabaseAdmin
        .from("information_schema.columns")
        .select("column_name")
        .eq("table_schema", "public")
        .eq("table_name", "products")
        .eq("column_name", "stock")
        .single()

      stockColumnExists = !!data
      if (error) stockColumnError = error.message
    } catch (error: any) {
      stockColumnError = error.message
    }

    // Obtener información sobre los últimos pedidos
    const { data: recentOrders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, items, total, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5)

    // Obtener información sobre los productos
    const { data: products, error: productsError } = await supabaseAdmin
      .from("products")
      .select("id, name, price, stock, category")
      .limit(10)

    return NextResponse.json({
      database: {
        stockChangesTable: {
          exists: stockChangesExists,
          error: stockChangesError,
        },
        stockColumn: {
          exists: stockColumnExists,
          error: stockColumnError,
        },
      },
      recentOrders: recentOrders || [],
      products: products || [],
      errors: {
        orders: ordersError ? ordersError.message : null,
        products: productsError ? productsError.message : null,
      },
    })
  } catch (error: any) {
    console.error("Error en la depuración de stock:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}

// Endpoint para probar la actualización de stock manualmente
export async function POST(request: NextRequest) {
  try {
    // Verificar si el usuario es administrador
    const admin = await isAdmin(request)

    if (!admin) {
      return NextResponse.json(
        { success: false, message: "No tienes permisos para realizar esta acción" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const { productId, quantity, orderId } = body

    if (!productId || !quantity) {
      return NextResponse.json({ success: false, message: "Se requiere productId y quantity" }, { status: 400 })
    }

    // Crear cliente de Supabase con rol de servicio
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

    // Obtener stock actual
    const { data: product, error: productError } = await supabaseAdmin
      .from("products")
      .select("id, stock, name")
      .eq("id", productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({ success: false, message: "Producto no encontrado" }, { status: 404 })
    }

    const previousStock = product.stock || 0
    const newStock = Math.max(0, previousStock - quantity)

    console.log(`Actualizando stock del producto ${productId} de ${previousStock} a ${newStock}`)

    // Actualizar stock
    const { error: updateError } = await supabaseAdmin.from("products").update({ stock: newStock }).eq("id", productId)

    if (updateError) {
      return NextResponse.json(
        { success: false, message: `Error al actualizar stock: ${updateError.message}` },
        { status: 500 },
      )
    }

    // Registrar cambio en stock_changes si la tabla existe
    try {
      const stockChange = {
        product_id: productId,
        previous_stock: previousStock,
        new_stock: newStock,
        change_amount: quantity,
        change_type: "order",
        reference_id: orderId || null,
        notes: orderId ? `Pedido #${orderId} (prueba manual)` : "Prueba manual",
        timestamp: new Date().toISOString(),
      }

      const { error: insertError } = await supabaseAdmin.from("stock_changes").insert([stockChange])

      if (insertError) {
        console.warn("Error al registrar cambio de stock:", insertError.message)
      }
    } catch (error) {
      console.warn("Error al intentar registrar cambio de stock:", error)
    }

    return NextResponse.json({
      success: true,
      product: product.name,
      previousStock,
      newStock,
      change: quantity,
    })
  } catch (error: any) {
    console.error("Error en la actualización manual de stock:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Error interno del servidor" },
      { status: 500 },
    )
  }
}
