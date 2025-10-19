import { NextRequest, NextResponse } from "next/server"
import { executeQuery } from "@/lib/db"
import { getCurrentUser } from "@/lib/auth-simple"

// GET - Obtener asignaciones del repartidor
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar que el usuario sea repartidor
    const [userDetails] = await executeQuery<any>(
      'SELECT is_driver FROM users WHERE id = ?',
      [user.id]
    )

    if (!userDetails?.is_driver) {
      return NextResponse.json({ error: "Usuario no es repartidor" }, { status: 403 })
    }

    // Obtener datos del repartidor
    const [driver] = await executeQuery<any>(
      'SELECT * FROM delivery_drivers WHERE user_id = ?',
      [user.id]
    )

    if (!driver) {
      return NextResponse.json({ error: "Repartidor no encontrado" }, { status: 404 })
    }

    // Obtener asignaciones pendientes y aceptadas
    const assignments = await executeQuery<any>(
      `SELECT 
        da.*,
        o.id as order_id,
        o.total,
        o.delivery_address,
        o.delivery_notes,
        o.status as order_status,
        o.created_at as order_created_at,
        u.full_name as customer_name,
        u.phone as customer_phone
      FROM delivery_assignments da
      INNER JOIN orders o ON da.order_id = o.id
      LEFT JOIN users u ON o.user_id = u.id
      WHERE da.driver_id = ? 
        AND da.status IN ('pending', 'accepted')
      ORDER BY 
        CASE da.status 
          WHEN 'accepted' THEN 1 
          WHEN 'pending' THEN 2 
        END,
        da.assigned_at DESC`,
      [driver.id]
    )

    return NextResponse.json({
      success: true,
      driver,
      assignments: assignments || []
    })

  } catch (error: any) {
    console.error("Error en GET /api/driver/assignments:", error)
    return NextResponse.json({ 
      error: "Error al obtener asignaciones",
      details: error.message 
    }, { status: 500 })
  }
}
