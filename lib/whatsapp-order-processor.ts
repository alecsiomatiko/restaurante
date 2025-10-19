import { createClient } from "@supabase/supabase-js"
import type { Product } from "../types/chat"

// Importar la función centralizada
import { processOrder } from "@/lib/order-processor"

// Cliente de Supabase con rol de servicio para omitir RLS
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

export type OrderInfo = {
  products: Product[]
  customerInfo: {
    name: string
    phone: string
    deliveryType: "delivery" | "pickup"
    address?: string
    notes?: string
    source: string
  }
}

/**
 * Procesa y guarda un pedido en la base de datos
 */
export async function processAndSaveOrder(
  orderInfo: OrderInfo,
): Promise<{ success: boolean; orderId?: number; error?: string }> {
  try {
    console.log("Procesando pedido de WhatsApp:", JSON.stringify(orderInfo))

    // Validar datos mínimos requeridos
    if (!orderInfo.products || orderInfo.products.length === 0) {
      return { success: false, error: "No hay productos en el pedido" }
    }

    if (!orderInfo.customerInfo.name || !orderInfo.customerInfo.phone) {
      return { success: false, error: "Falta información del cliente" }
    }

    // Calcular el total del pedido
    const total = orderInfo.products.reduce((sum, product) => sum + product.price * product.quantity, 0)

    console.log("Total calculado:", total)

    // Asegurarse de que la fuente sea WhatsApp
    const customerInfo = {
      ...orderInfo.customerInfo,
      source: "whatsapp",
    }

    // Procesar el pedido usando la función centralizada
    const result = await processOrder({
      products: orderInfo.products,
      customerInfo,
      total,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true, orderId: result.order.id }
  } catch (error: any) {
    console.error("Error en procesamiento de pedido:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Actualiza el estado de un pedido
 */
export async function updateOrderStatus(
  orderId: number,
  status: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.from("orders").update({ status }).eq("id", orderId)

    if (error) {
      console.error("Error al actualizar estado del pedido:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error: any) {
    console.error("Error al actualizar estado del pedido:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Obtiene un pedido por su ID
 */
export async function getOrderById(orderId: number): Promise<{ success: boolean; order?: any; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin.from("orders").select("*").eq("id", orderId).single()

    if (error) {
      console.error("Error al obtener pedido:", error)
      return { success: false, error: error.message }
    }

    return { success: true, order: data }
  } catch (error: any) {
    console.error("Error al obtener pedido:", error)
    return { success: false, error: error.message }
  }
}
