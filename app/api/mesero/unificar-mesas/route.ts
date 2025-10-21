import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { executeQuery } from "@/lib/db-retry"
import { verifyAccessToken, getSessionByToken } from "@/lib/auth-mysql"

// POST - Unificar mesas
export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = verifyAccessToken(authToken) || await getSessionByToken(authToken)
    if (!user || !user.is_waiter) {
      return NextResponse.json({ error: "Solo meseros pueden unificar mesas" }, { status: 403 })
    }

    const body = await request.json()
    const { mesas, nombreUnificado } = body

    if (!mesas || !Array.isArray(mesas) || mesas.length < 2) {
      return NextResponse.json({ error: "Se requieren al menos 2 mesas para unificar" }, { status: 400 })
    }

    if (!nombreUnificado) {
      return NextResponse.json({ error: "Nombre unificado requerido" }, { status: 400 })
    }

    // Verificar que todas las mesas tengan órdenes activas
    const ordenes = await executeQuery(`
      SELECT DISTINCT \`table\` as mesa FROM orders 
      WHERE \`table\` IN (${mesas.map(() => '?').join(',')}) 
      AND status = 'open_table'
    `, mesas) as any[]

    if (ordenes.length !== mesas.length) {
      return NextResponse.json({ 
        error: "Todas las mesas deben tener órdenes activas para poder unificarlas" 
      }, { status: 400 })
    }

    // Verificar que no haya unificaciones existentes
    const existingUnification = await executeQuery(`
      SELECT unified_name FROM unified_tables 
      WHERE JSON_CONTAINS(original_tables, JSON_QUOTE(?))
    `, [mesas[0]]) as any[]

    if (existingUnification.length > 0) {
      return NextResponse.json({ 
        error: "Una o más mesas ya están unificadas" 
      }, { status: 400 })
    }

    // Crear unificación
    const result = await executeQuery(`
      INSERT INTO unified_tables (unified_name, main_table, original_tables, created_at)
      VALUES (?, ?, ?, NOW())
    `, [nombreUnificado, mesas[0], JSON.stringify(mesas)]) as any

    const unifiedTableId = result.insertId

    // Actualizar todas las órdenes para referenciar la mesa unificada
    await executeQuery(`
      UPDATE orders 
      SET unified_table_id = ? 
      WHERE \`table\` IN (${mesas.map(() => '?').join(',')}) 
      AND status = 'open_table'
    `, [unifiedTableId, ...mesas])

    return NextResponse.json({
      success: true,
      message: `Mesas ${mesas.join(', ')} unificadas como "${nombreUnificado}"`,
      unified_table_id: unifiedTableId,
      unified_name: nombreUnificado
    })

  } catch (error: any) {
    console.error("Error al unificar mesas:", error)
    return NextResponse.json(
      { error: "Error al unificar mesas" },
      { status: 500 }
    )
  }
}

// GET - Obtener mesas unificadas
export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = verifyAccessToken(authToken) || await getSessionByToken(authToken)
    if (!user || !user.is_waiter) {
      return NextResponse.json({ error: "Solo meseros pueden ver mesas unificadas" }, { status: 403 })
    }

    const mesasUnificadas = await executeQuery(`
      SELECT 
        ut.id,
        ut.unified_name,
        ut.main_table,
        ut.original_tables,
        ut.created_at,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total) as total_amount
      FROM unified_tables ut
      LEFT JOIN orders o ON o.unified_table_id = ut.id AND o.status = 'open_table'
      GROUP BY ut.id, ut.unified_name, ut.main_table, ut.original_tables, ut.created_at
      ORDER BY ut.created_at DESC
    `) as any[]

    const processedTables = mesasUnificadas.map(tabla => ({
      id: tabla.id,
      nombre: tabla.unified_name,
      mesaPrincipal: tabla.main_table,
      mesasOriginales: JSON.parse(tabla.original_tables || '[]'),
      totalOrdenes: parseInt(tabla.total_orders) || 0,
      montoTotal: parseFloat(tabla.total_amount) || 0,
      fechaCreacion: tabla.created_at
    }))

    return NextResponse.json({
      success: true,
      mesasUnificadas: processedTables
    })

  } catch (error: any) {
    console.error("Error al obtener mesas unificadas:", error)
    return NextResponse.json(
      { error: "Error al obtener mesas unificadas" },
      { status: 500 }
    )
  }
}

// DELETE - Separar mesas unificadas
export async function DELETE(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = verifyAccessToken(authToken) || await getSessionByToken(authToken)
    if (!user || !user.is_waiter) {
      return NextResponse.json({ error: "Solo meseros pueden separar mesas" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const unifiedTableId = searchParams.get('id')

    if (!unifiedTableId) {
      return NextResponse.json({ error: "ID de mesa unificada requerido" }, { status: 400 })
    }

    // Obtener información de la mesa unificada
    const unifiedTable = await executeQuery(`
      SELECT unified_name, original_tables FROM unified_tables WHERE id = ?
    `, [unifiedTableId]) as any[]

    if (unifiedTable.length === 0) {
      return NextResponse.json({ error: "Mesa unificada no encontrada" }, { status: 404 })
    }

    const originalTables = JSON.parse(unifiedTable[0].original_tables || '[]')

    // Eliminar referencia de unificación en las órdenes
    await executeQuery(`
      UPDATE orders SET unified_table_id = NULL 
      WHERE unified_table_id = ?
    `, [unifiedTableId])

    // Eliminar asignaciones de productos que dependían de la unificación
    await executeQuery(`
      DELETE pa FROM product_assignments pa
      JOIN orders o ON pa.order_id = o.id
      WHERE o.\`table\` IN (${originalTables.map(() => '?').join(',')})
    `, originalTables)

    // Eliminar la mesa unificada
    await executeQuery(`
      DELETE FROM unified_tables WHERE id = ?
    `, [unifiedTableId])

    return NextResponse.json({
      success: true,
      message: `Mesa "${unifiedTable[0].unified_name}" separada. Mesas ${originalTables.join(', ')} ahora independientes`,
      separated_tables: originalTables
    })

  } catch (error: any) {
    console.error("Error al separar mesas:", error)
    return NextResponse.json(
      { error: "Error al separar mesas" },
      { status: 500 }
    )
  }
}