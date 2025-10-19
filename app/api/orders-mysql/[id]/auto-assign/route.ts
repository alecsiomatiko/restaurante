import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'

const dbConfig = {
  host: 'srv440.hstgr.io',
  user: 'u191251575_manu',
  password: 'Cerounocero.com20182417',
  database: 'u191251575_manu'
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orderId = params.id

    const connection = await mysql.createConnection(dbConfig)

    // 1. Verificar que la orden existe y está en estado "ready"
    const [orders] = await connection.execute(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    )

    const order = (orders as any[])[0]
    
    if (!order) {
      await connection.end()
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      )
    }

    if (order.status !== 'ready') {
      await connection.end()
      return NextResponse.json(
        { error: 'La orden debe estar en estado "ready" para ser asignada' },
        { status: 400 }
      )
    }

    // 2. Buscar repartidores disponibles (sin entregas activas)
    const [drivers] = await connection.execute(`
      SELECT u.id, u.name, u.email, u.phone
      FROM users u
      WHERE u.is_driver = 1
      AND u.id NOT IN (
        SELECT DISTINCT da.driver_id
        FROM delivery_assignments da
        JOIN orders o ON da.order_id = o.id
        WHERE o.status IN ('assigned_to_driver', 'accepted_by_driver', 'in_delivery')
        AND da.driver_id IS NOT NULL
      )
      LIMIT 1
    `)

    const availableDriver = (drivers as any[])[0]

    if (!availableDriver) {
      await connection.end()
      return NextResponse.json(
        { error: 'No hay repartidores disponibles en este momento' },
        { status: 404 }
      )
    }

    // 3. Crear la asignación
    await connection.execute(
      `INSERT INTO delivery_assignments (order_id, driver_id, assigned_at, status)
       VALUES (?, ?, NOW(), 'pending')`,
      [orderId, availableDriver.id]
    )

    // 4. Actualizar el estado de la orden
    await connection.execute(
      `UPDATE orders SET status = 'assigned_to_driver', updated_at = NOW() WHERE id = ?`,
      [orderId]
    )

    await connection.end()

    return NextResponse.json({
      success: true,
      message: 'Orden asignada automáticamente',
      driver: {
        id: availableDriver.id,
        name: availableDriver.name,
        phone: availableDriver.phone
      }
    })

  } catch (error) {
    console.error('Error en auto-asignación:', error)
    return NextResponse.json(
      { error: 'Error al asignar repartidor automáticamente' },
      { status: 500 }
    )
  }
}
