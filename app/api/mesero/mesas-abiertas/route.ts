import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { executeQuery } from "@/lib/db-retry"
import { verifyAccessToken, getSessionByToken } from "@/lib/auth-mysql"

// GET - Obtener mesas con órdenes activas
export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = verifyAccessToken(authToken) || await getSessionByToken(authToken)
    if (!user || !user.is_waiter) {
      return NextResponse.json({ error: "Solo meseros pueden acceder" }, { status: 403 })
    }

    // Obtener todas las órdenes con status 'open_table' agrupadas por mesa
    const orders = await executeQuery(`
      SELECT 
        id,
        \`table\` as table_name,
        total,
        status,
        created_at,
        items,
        notes,
        unified_table_id
      FROM orders 
      WHERE status = 'open_table'
      ORDER BY \`table\`, created_at DESC
    `) as any[]

    // Agrupar órdenes por mesa
    const tablesMap = new Map()

    orders.forEach(order => {
      const tableName = order.table_name
      if (!tablesMap.has(tableName)) {
        tablesMap.set(tableName, {
          tableName: tableName,
          orders: [],
          totalMesa: 0,
          allItems: [],
          firstOrderDate: order.created_at,
          lastOrderDate: order.created_at,
          orderCount: 0
        })
      }

      const table = tablesMap.get(tableName)
      table.orders.push({
        id: order.id,
        table: order.table_name, // Usar table_name aquí
        status: order.status,
        created_at: order.created_at,
        items: JSON.parse(order.items || '[]'),
        total: order.total,
        notes: order.notes,
        unified_table_id: order.unified_table_id
      })

      table.totalMesa += order.total
      table.orderCount += 1

      // Agregar items a la lista consolidada
      const orderItems = JSON.parse(order.items || '[]')
      table.allItems.push(...orderItems)

      // Actualizar fechas
      if (new Date(order.created_at) < new Date(table.firstOrderDate)) {
        table.firstOrderDate = order.created_at
      }
      if (new Date(order.created_at) > new Date(table.lastOrderDate)) {
        table.lastOrderDate = order.created_at
      }
    })

    const tables = Array.from(tablesMap.values())

    // Crear estructura simplificada para TableUnification
    const simplifiedOrders = orders.map(order => ({
      id: order.id,
      table: order.table_name, // Asegurar que sea table_name
      total: order.total,
      status: order.status,
      created_at: order.created_at,
      items: order.items,
      notes: order.notes,
      unified_table_id: order.unified_table_id
    }))

    return NextResponse.json({
      success: true,
      orders: simplifiedOrders, // Para compatibilidad con el componente TableUnification
      tables: tables  // Para el componente principal
    })

  } catch (error: any) {
    console.error("Error al obtener mesas abiertas:", error)
    return NextResponse.json(
      { error: "Error al obtener mesas abiertas" },
      { status: 500 }
    )
  }
}