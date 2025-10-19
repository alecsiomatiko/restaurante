import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/mysql-db"
import { getCurrentUser } from "@/lib/auth-simple"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user || !user.is_admin) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      )
    }

    const orderId = parseInt(params.id)
    const body = await request.json()
    const { driverId } = body

    if (!driverId) {
      return NextResponse.json(
        { error: "Se requiere un repartidor" },
        { status: 400 }
      )
    }

    // Verificar que el pedido existe y está en estado "ready"
    const orderResult: any = await executeQuery(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    )
    const order = orderResult[0]

    if (!order) {
      return NextResponse.json(
        { error: "Pedido no encontrado" },
        { status: 404 }
      )
    }


    // Verificar que el repartidor existe (sin checar is_available, para permitir asignaciones ilimitadas)
    const driverResult: any = await executeQuery(
      'SELECT * FROM delivery_drivers WHERE id = ?',
      [driverId]
    )
    const driver = driverResult[0]

    if (!driver) {
      return NextResponse.json(
        { error: "Repartidor no encontrado" },
        { status: 404 }
      )
    }


    // Crear asignación de delivery
    await executeQuery(
      `INSERT INTO delivery_assignments 
        (order_id, driver_id, status, assigned_at) 
       VALUES (?, ?, 'pending', NOW())`,
      [orderId, driverId]
    )

    // Actualizar estado del pedido
    await executeQuery(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      ['assigned_to_driver', orderId]
    )


    // No modificar is_available, permitimos asignaciones ilimitadas

    return NextResponse.json({
      success: true,
      message: "Repartidor asignado correctamente",
      driver: {
        id: driver.id,
        name: driver.name,
        phone: driver.phone
      }
    })

  } catch (error) {
    console.error('Error assigning driver:', error)
    return NextResponse.json(
      { error: "Error al asignar repartidor" },
      { status: 500 }
    )
  }
}
