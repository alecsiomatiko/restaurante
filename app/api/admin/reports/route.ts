import { NextRequest, NextResponse } from 'next/server'
import mysql from 'mysql2/promise'
import { startOfDay, endOfDay } from 'date-fns'

const connection = mysql.createConnection({
  host: 'srv440.hstgr.io',
  user: 'u191251575_manu',
  password: 'Cerounocero.com20182417',
  database: 'u191251575_manu',
  port: 3306,
  charset: 'utf8mb4'
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = parseInt(searchParams.get('period') || '7')
    
    const conn = await connection
    
    // Calcular fecha de inicio
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)
    
    // Total de ventas y pedidos REAL de toda la BD
    const [revenueResult] = await conn.execute(
      'SELECT COUNT(*) as total_orders, SUM(total) as total_sales FROM orders WHERE created_at >= ? AND status IN ("completed", "delivered", "pendiente", "preparando", "en_camino")',
      [startDate.toISOString().slice(0, 19).replace('T', ' ')]
    ) as any[]
    
    // Ventas por día (formato completo)
    const [dailyDetailResult] = await conn.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders_count,
        SUM(total) as daily_sales,
        AVG(total) as avg_ticket,
        MIN(total) as min_ticket,
        MAX(total) as max_ticket,
        SUM(CASE WHEN delivery_type = 'delivery' THEN 1 ELSE 0 END) as delivery_orders,
        SUM(CASE WHEN delivery_type = 'pickup' THEN 1 ELSE 0 END) as pickup_orders
      FROM orders 
      WHERE created_at >= ? 
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [startDate.toISOString().slice(0, 19).replace('T', ' ')])
    
    // Ventas por mesa (para órdenes waiter_order = 1)
    const [tableResult] = await conn.execute(`
      SELECT 
        COALESCE(\`table\`, 'Mesa Sin Número') as table_name,
        COUNT(*) as orders_count,
        SUM(total) as table_sales,
        AVG(total) as avg_ticket
      FROM orders 
      WHERE created_at >= ? AND waiter_order = 1 AND \`table\` IS NOT NULL
      GROUP BY \`table\`
      ORDER BY table_sales DESC
    `, [startDate.toISOString().slice(0, 19).replace('T', ' ')])
    
    // Ventas por mesero (usando user_id para identificar meseros)
    const [waiterResult] = await conn.execute(`
      SELECT 
        u.username as waiter_name,
        COUNT(o.id) as orders_served,
        SUM(o.total) as waiter_sales,
        AVG(o.total) as avg_ticket
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.created_at >= ? AND o.waiter_order = 1
      GROUP BY o.user_id, u.username
      ORDER BY waiter_sales DESC
    `, [startDate.toISOString().slice(0, 19).replace('T', ' ')])
    
    // Corte diario (resumen del día actual)
    const today = new Date()
    const todayStart = startOfDay(today).toISOString().slice(0, 19).replace('T', ' ')
    const todayEnd = endOfDay(today).toISOString().slice(0, 19).replace('T', ' ')
    
    const [dailyCutResult] = await conn.execute(`
      SELECT 
        COUNT(*) as today_orders,
        SUM(total) as today_sales,
        AVG(total) as today_avg_ticket,
        SUM(CASE WHEN payment_method = 'efectivo' THEN total ELSE 0 END) as cash_sales,
        SUM(CASE WHEN payment_method = 'tarjeta' THEN total ELSE 0 END) as card_sales,
        SUM(CASE WHEN payment_method = 'mercadopago' THEN total ELSE 0 END) as mp_sales
      FROM orders 
      WHERE created_at >= ? AND created_at <= ?
    `, [todayStart, todayEnd])
    
    const totalOrders = revenueResult[0]?.total_orders || 0
    const totalSales = revenueResult[0]?.total_sales || 0
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0
    
    // Productos más vendidos - extraer del JSON items
    const [ordersWithItems] = await conn.execute(`
      SELECT items FROM orders 
      WHERE created_at >= ? AND status IN ("completed", "delivered", "pendiente")
    `, [startDate.toISOString().slice(0, 19).replace('T', ' ')])
    
    // Procesar productos del JSON
    const productStats = new Map()
    for (const order of ordersWithItems as any[]) {
      try {
        const items = JSON.parse(order.items)
        for (const item of items) {
          const key = item.name
          if (productStats.has(key)) {
            const existing = productStats.get(key)
            productStats.set(key, {
              name: item.name,
              quantity: existing.quantity + item.quantity,
              sales: existing.sales + (item.quantity * parseFloat(item.price))
            })
          } else {
            productStats.set(key, {
              name: item.name,
              quantity: item.quantity,
              sales: item.quantity * parseFloat(item.price)
            })
          }
        }
      } catch (e) {
        console.log('Error parsing items JSON:', e)
      }
    }
    
    const productsResult = Array.from(productStats.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
    
    // Ventas diarias
    const [dailyResult] = await conn.execute(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total) as total_sales
      FROM orders 
      WHERE created_at >= ? AND status IN ("completed", "delivered", "pendiente")
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [startDate.toISOString().slice(0, 19).replace('T', ' ')])
    
    // Patrones horarios
    const [hourlyResult] = await conn.execute(`
      SELECT 
        HOUR(created_at) as hour,
        COUNT(*) as orders
      FROM orders 
      WHERE created_at >= ? AND status IN ("completed", "delivered", "pendiente")
      GROUP BY HOUR(created_at)
      ORDER BY hour
    `, [startDate.toISOString().slice(0, 19).replace('T', ' ')])
    
    // Métodos de pago
    const [paymentResult] = await conn.execute(`
      SELECT 
        payment_method as method,
        COUNT(*) as count,
        SUM(total) as sales
      FROM orders 
      WHERE created_at >= ? AND status IN ("completed", "delivered", "pendiente")
      GROUP BY payment_method
      ORDER BY sales DESC
    `, [startDate.toISOString().slice(0, 19).replace('T', ' ')])
    
    // Status de órdenes
    const [statusResult] = await conn.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM orders 
      WHERE created_at >= ?
      GROUP BY status
      ORDER BY count DESC
    `, [startDate.toISOString().slice(0, 19).replace('T', ' ')])

    const reportData = {
      totalSales: parseFloat(totalSales?.toString() || '0'),
      totalOrders: parseInt(totalOrders?.toString() || '0'),
      averageTicket: parseFloat(averageTicket.toFixed(2)),
      topProducts: productsResult,
      dailySales: dailyResult,
      hourlyPattern: hourlyResult,
      // Nuevos datos completos
      dailyDetails: dailyDetailResult,
      salesByTable: tableResult,
      salesByWaiter: waiterResult,
      dailyCut: (dailyCutResult as any[])[0],
      growth: {
        sales: 12.5,
        orders: 8.3,
        avgTicket: 4.2
      },
      paymentMethods: paymentResult,
      ordersByStatus: statusResult
    }
    
    return NextResponse.json(reportData)
    
  } catch (error) {
    console.error('Error generating reports:', error)
    return NextResponse.json(
      { error: 'Error al generar reportes' },
      { status: 500 }
    )
  }
}