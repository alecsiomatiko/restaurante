import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { executeQuery } from "@/lib/mysql-db"
import { verifyAccessToken, getSessionByToken } from "@/lib/auth-mysql"

// GET - Obtener pedido específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = verifyAccessToken(authToken) || await getSessionByToken(authToken)
    if (!user) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    }

    let query = `
      SELECT o.*, u.username, u.email as user_email,
             da.status as delivery_status, da.driver_id,
             dd.name as driver_name, dd.phone as driver_phone
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id
      LEFT JOIN delivery_assignments da ON o.id = da.order_id
      LEFT JOIN delivery_drivers dd ON da.driver_id = dd.id
      WHERE o.id = ?
    `
  const queryParams: any[] = [id]

    // Si no es admin, solo puede ver sus propios pedidos
    if (!user.is_admin) {
      query += ' AND o.user_id = ?'
  queryParams.push(user.id)
    }

    const orders = await executeQuery(query, queryParams) as any[]

    if (orders.length === 0) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      )
    }

    const order = orders[0]
    
    // Parsear campos JSON
    if (order.items) {
      try {
        order.items = JSON.parse(order.items)
      } catch (e) {
        order.items = []
      }
    }
    if (order.customer_info) {
      try {
        order.customer_info = JSON.parse(order.customer_info)
      } catch (e) {
        order.customer_info = null
      }
    }
    if (order.delivery_address) {
      try {
        order.delivery_address = JSON.parse(order.delivery_address)
      } catch (e) {
        order.delivery_address = null
      }
    }

    return NextResponse.json({
      success: true,
      order
    })
  } catch (error: any) {
    console.error("Error al obtener pedido:", error)
    return NextResponse.json(
      { error: "Error al obtener pedido" },
      { status: 500 }
    )
  }
}

// PUT - Actualizar estado del pedido
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = verifyAccessToken(authToken) || await getSessionByToken(authToken)
    if (!user) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 })
    }

    const { status, payment_status, notes, estimated_delivery_time } = await request.json()

    // Verificar permisos
    const orders = await executeQuery(
      'SELECT user_id, status as current_status FROM orders WHERE id = ?',
      [id]
    ) as any[]

    if (orders.length === 0) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      )
    }

    const order = orders[0]

    // Los usuarios solo pueden cancelar sus propios pedidos
    if (!user.is_admin && order.user_id !== user.id) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar este pedido" },
        { status: 403 }
      )
    }

    if (!user.is_admin && status && status !== 'cancelado') {
      return NextResponse.json(
        { error: "Solo puedes cancelar tu pedido" },
        { status: 403 }
      )
    }

    // Construir query de actualización
    const updates: string[] = []
    const params_update: any[] = []

    if (status) {
      updates.push('status = ?')
      params_update.push(status)
      
      if (status === 'entregado') {
        updates.push('delivered_at = NOW()')
      }
    }

    if (payment_status && user.is_admin) {
      updates.push('payment_status = ?')
      params_update.push(payment_status)
    }

    if (notes !== undefined) {
      updates.push('notes = ?')
      params_update.push(notes)
    }

    if (estimated_delivery_time && user.is_admin) {
      updates.push('estimated_delivery_time = ?')
      params_update.push(estimated_delivery_time)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No hay campos para actualizar" },
        { status: 400 }
      )
    }

    updates.push('updated_at = NOW()')
  params_update.push(id)

    const result = await executeQuery(
      `UPDATE orders SET ${updates.join(', ')} WHERE id = ?`,
      params_update
    ) as any

    // Si se cancela, devolver stock
    if (status === 'cancelado' && order.current_status !== 'cancelado') {
      const orderData = await executeQuery(
        'SELECT items FROM orders WHERE id = ?',
        [id]
      ) as any[]

      if (orderData.length > 0) {
        try {
          const items = JSON.parse(orderData[0].items)
          for (const item of items) {
            await executeQuery(
              'UPDATE products SET stock = stock + ? WHERE id = ?',
              [item.quantity, item.id]
            )
            
            await executeQuery(
              'UPDATE inventory SET quantity = quantity + ? WHERE product_id = ?',
              [item.quantity, item.id]
            )
          }
        } catch (e) {
          console.error('Error devolviendo stock:', e)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Pedido eliminado exitosamente"
    })
  } catch (error: any) {
    console.error("Error al eliminar pedido:", error)
    return NextResponse.json(
      { error: "Error al eliminar pedido" },
      { status: 500 }
    )
  }
}

// PATCH - Actualizar estado del pedido
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authToken = request.cookies.get('auth-token')?.value
    
    if (!authToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = verifyAccessToken(authToken) || await getSessionByToken(authToken)
    
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: "No autorizado - Solo admins" }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status es requerido' },
        { status: 400 }
      )
    }

    // Validar estados permitidos
    const validStatuses = [
      'pending', 'confirmed', 'preparing', 'ready',
      'assigned_to_driver', 'accepted_by_driver', 'in_delivery',
      'delivered', 'cancelled'
    ]

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Estado inválido' },
        { status: 400 }
      )
    }

    // Actualizar el estado
    await executeQuery(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    )

    return NextResponse.json({
      success: true,
      message: 'Estado actualizado correctamente',
      status: status
    })

  } catch (error: any) {
    console.error('Error al actualizar estado:', error)
    return NextResponse.json(
      { error: 'Error al actualizar el estado del pedido' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar pedido (solo admin, solo si está cancelado)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = verifyAccessToken(authToken)
    if (!user?.is_admin) {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 })
    }

    // Verificar que el pedido esté cancelado
    const orders = await executeQuery(
      'SELECT status FROM orders WHERE id = ?',
      [id]
    ) as any[]

    if (orders.length === 0) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      )
    }

    if (orders[0].status !== 'cancelado') {
      return NextResponse.json(
        { error: "Solo se pueden eliminar pedidos cancelados" },
        { status: 400 }
      )
    }

    // Eliminar asignaciones de delivery primero
    await executeQuery(
      'DELETE FROM delivery_assignments WHERE order_id = ?',
      [id]
    )

    // Eliminar pedido
    const result = await executeQuery(
      'DELETE FROM orders WHERE id = ?',
      [id]
    ) as any

    return NextResponse.json({
      success: true,
      message: "Pedido eliminado exitosamente"
    })
  } catch (error: any) {
    console.error("Error al eliminar pedido:", error)
    return NextResponse.json(
      { error: "Error al eliminar pedido" },
      { status: 500 }
    )
  }
}