import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-simple'
import { executeQuery } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(request)

    if (!user || !user.is_driver) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const assignmentId = parseInt(params.id)

    // Verificar que la asignación pertenece a este driver
    const assignments = await executeQuery<any>(
      `SELECT da.*, dd.user_id 
       FROM delivery_assignments da
       JOIN delivery_drivers dd ON da.driver_id = dd.id
       WHERE da.id = ? AND dd.user_id = ?`,
      [assignmentId, user.id]
    )

    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const assignment = assignments[0]

    // Verificar que está pendiente
    if (assignment.status !== 'pending') {
      return NextResponse.json({ error: 'Assignment already processed' }, { status: 400 })
    }

    // Aceptar la asignación
    await executeQuery(
      `UPDATE delivery_assignments 
       SET status = 'accepted', accepted_at = NOW()
       WHERE id = ?`,
      [assignmentId]
    )

    // Actualizar estado de la orden a "en_camino"
    await executeQuery(
      `UPDATE orders 
       SET status = 'en_camino'
       WHERE id = ?`,
      [assignment.order_id]
    )

    // Marcar driver como no disponible
    await executeQuery(
      `UPDATE delivery_drivers 
       SET is_available = FALSE
       WHERE id = ?`,
      [assignment.driver_id]
    )

    // Obtener información del driver para la notificación
    const drivers = await executeQuery(
      'SELECT name, phone FROM delivery_drivers WHERE id = ?',
      [assignment.driver_id]
    ) as any[]
    const driver = drivers[0]

    // Notificar al cliente (no bloquear si falla)
    if (driver) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/driver/notify-customer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: assignment.order_id,
            driverName: driver.name,
            driverPhone: driver.phone,
            estimatedTime: '30-45 minutos'
          })
        })
      } catch (notifyError) {
        console.error('Error notificando al cliente:', notifyError)
        // No falla la aceptación si la notificación falla
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error accepting assignment:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
