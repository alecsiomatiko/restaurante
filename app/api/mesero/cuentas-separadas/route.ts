import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { executeQuery } from "@/lib/db-retry"
import { verifyAccessToken, getSessionByToken } from "@/lib/auth-mysql"

// POST - Generar cuentas separadas
export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = verifyAccessToken(authToken) || await getSessionByToken(authToken)
    if (!user || !user.is_waiter) {
      return NextResponse.json({ error: "Solo meseros pueden generar cuentas" }, { status: 403 })
    }

    const body = await request.json()
    const { mesa, clientes } = body

    if (!mesa || !clientes || !Array.isArray(clientes) || clientes.length === 0) {
      return NextResponse.json({ error: "Mesa y clientes requeridos" }, { status: 400 })
    }

    // Obtener órdenes de la mesa
    const ordenes = await executeQuery(`
      SELECT o.id, o.items, o.table, o.unified_table_id, o.total,
             ut.unified_name, ut.original_tables
      FROM orders o
      LEFT JOIN unified_tables ut ON o.unified_table_id = ut.id
      WHERE (o.table = ? OR o.unified_table_id IN (
        SELECT id FROM unified_tables WHERE unified_name = ? OR main_table = ?
      )) AND o.status = 'open_table'
    `, [mesa, mesa, mesa]) as any[]

    if (ordenes.length === 0) {
      return NextResponse.json({ error: "No hay órdenes activas en esta mesa" }, { status: 404 })
    }

    const cuentasSeparadas = []

    // Generar cuenta para cada cliente
    for (const cliente of clientes) {
      if (!cliente.productos || cliente.productos.length === 0) {
        continue
      }

      // Obtener asignaciones del cliente
      const asignacionesCliente = await executeQuery(`
        SELECT pa.*, o.table
        FROM product_assignments pa
        JOIN orders o ON pa.order_id = o.id
        WHERE pa.cliente_nombre = ? AND (o.table = ? OR o.unified_table_id IN (
          SELECT id FROM unified_tables WHERE unified_name = ? OR main_table = ?
        ))
      `, [cliente.nombre, mesa, mesa, mesa]) as any[]

      let totalCliente = 0
      const productosCliente = []

      // Procesar productos asignados
      for (const asignacion of asignacionesCliente) {
        const orden = ordenes.find(o => o.id === asignacion.order_id)
        if (orden) {
          const items = JSON.parse(orden.items || '[]')
          const producto = items.find((item: any) => item.id === asignacion.producto_id)
          
          if (producto) {
            const precioUnitario = parseFloat(asignacion.precio_unitario) || 0
            const cantidad = parseInt(asignacion.cantidad) || 1
            const subtotal = cantidad * precioUnitario
            totalCliente += subtotal

            productosCliente.push({
              id: asignacion.producto_id,
              nombre: producto.name,
              cantidad: cantidad,
              precio_unitario: precioUnitario,
              subtotal: subtotal,
              order_id: asignacion.order_id
            })
          }
        }
      }

      if (productosCliente.length > 0) {
        cuentasSeparadas.push({
          cliente: cliente.nombre,
          mesa: mesa,
          productos: productosCliente,
          total: totalCliente,
          fecha: new Date().toISOString(),
          isUnified: ordenes.some(o => o.unified_table_id),
          unifiedInfo: ordenes.find(o => o.unified_table_id) ? {
            unified_name: ordenes.find(o => o.unified_table_id)?.unified_name,
            original_tables: JSON.parse(ordenes.find(o => o.unified_table_id)?.original_tables || '[]')
          } : null
        })
      }
    }

    // Calcular total general y productos sin asignar
    const totalAsignado = cuentasSeparadas.reduce((sum, cuenta) => sum + cuenta.total, 0)
    const totalMesa = ordenes.reduce((sum, orden) => sum + orden.total, 0)
    const diferencia = totalMesa - totalAsignado

    return NextResponse.json({
      success: true,
      cuentasSeparadas: cuentasSeparadas,
      resumen: {
        totalMesa: totalMesa,
        totalAsignado: totalAsignado,
        diferencia: diferencia,
        cantidadClientes: cuentasSeparadas.length,
        mesa: mesa,
        fecha: new Date().toISOString()
      }
    })

  } catch (error: any) {
    console.error("Error al generar cuentas separadas:", error)
    return NextResponse.json(
      { error: "Error al generar cuentas separadas" },
      { status: 500 }
    )
  }
}

// GET - Obtener historial de cuentas separadas
export async function GET(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value
    if (!authToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = verifyAccessToken(authToken) || await getSessionByToken(authToken)
    if (!user || !user.is_waiter) {
      return NextResponse.json({ error: "Solo meseros pueden ver historial" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const mesa = searchParams.get('mesa')
    const limite = parseInt(searchParams.get('limite') || '10')

    let whereClause = ''
    let params: any[] = []

    if (mesa) {
      whereClause = `WHERE (o.table = ? OR o.unified_table_id IN (
        SELECT id FROM unified_tables WHERE unified_name = ? OR main_table = ?
      ))`
      params = [mesa, mesa, mesa]
    }

    // Obtener asignaciones recientes
    const historial = await executeQuery(`
      SELECT 
        pa.cliente_nombre,
        pa.created_at,
        o.table as mesa,
        ut.unified_name,
        COUNT(pa.id) as productos_asignados,
        SUM(pa.cantidad * pa.precio_unitario) as total_cliente
      FROM product_assignments pa
      JOIN orders o ON pa.order_id = o.id
      LEFT JOIN unified_tables ut ON o.unified_table_id = ut.id
      ${whereClause}
      GROUP BY pa.cliente_nombre, DATE(pa.created_at), o.table, ut.unified_name
      ORDER BY pa.created_at DESC
      LIMIT ?
    `, [...params, limite]) as any[]

    const historialProcesado = historial.map(registro => ({
      cliente: registro.cliente_nombre,
      mesa: registro.mesa,
      mesaUnificada: registro.unified_name,
      productosAsignados: registro.productos_asignados,
      total: registro.total_cliente,
      fecha: registro.created_at
    }))

    return NextResponse.json({
      success: true,
      historial: historialProcesado
    })

  } catch (error: any) {
    console.error("Error al obtener historial:", error)
    return NextResponse.json(
      { error: "Error al obtener historial" },
      { status: 500 }
    )
  }
}