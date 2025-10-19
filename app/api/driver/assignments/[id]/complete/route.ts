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

    // Verificar que está aceptada
    if (assignment.status !== 'accepted') {
      return NextResponse.json({ error: 'Assignment not accepted yet' }, { status: 400 })
    }

    // Calcular duración
    const acceptedAt = new Date(assignment.accepted_at)
    const now = new Date()
    const durationMinutes = Math.floor((now.getTime() - acceptedAt.getTime()) / 60000)

    // Completar la asignación
    await executeQuery(
      `UPDATE delivery_assignments 
       SET status = 'completed', 
           completed_at = NOW(),
           actual_duration = ?
       WHERE id = ?`,
      [durationMinutes, assignmentId]
    )

    // Actualizar estado de la orden a "entregado"
    await executeQuery(
      `UPDATE orders 
       SET status = 'entregado'
       WHERE id = ?`,
      [assignment.order_id]
    )

    // Marcar driver como disponible nuevamente
    await executeQuery(
      `UPDATE delivery_drivers 
       SET is_available = TRUE,
           total_deliveries = total_deliveries + 1
       WHERE id = ?`,
      [assignment.driver_id]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error completing assignment:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
