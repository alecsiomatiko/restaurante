import mysql from 'mysql2/promise'
import bcrypt from 'bcryptjs'

// Configuración de la base de datos MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'srv440.hstgr.io',
  user: process.env.DB_USER || 'u191251575_manu',
  password: process.env.DB_PASSWORD || 'Cerounocero.com20182417',
  database: process.env.DB_NAME || 'u191251575_manu',
  port: parseInt(process.env.DB_PORT || '3306'),
  charset: 'utf8mb4',
  timezone: '+00:00',
  // Configuraciones válidas para mysql2
  connectionLimit: 10
}

// Pool de conexiones para mejor rendimiento
let pool: mysql.Pool | null = null

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig)
  }
  return pool
}

// Función para obtener una conexión
export async function getConnection() {
  const pool = getPool()
  return await pool.getConnection()
}

// Función para ejecutar consultas
export async function executeQuery(query: string, params: any[] = []) {
  const connection = await getConnection()
  try {
    const [results] = await connection.execute(query, params)
    return results
  } finally {
    connection.release()
  }
}

// Función para ejecutar transacciones
export async function executeTransaction(queries: { query: string; params: any[] }[]) {
  const connection = await getConnection()
  try {
    await connection.beginTransaction()
    
    const results = []
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params)
      results.push(result)
    }
    
    await connection.commit()
    return results
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// Funciones específicas para autenticación
export async function createUser(email: string, password: string, username?: string) {
  const hashedPassword = await bcrypt.hash(password, 12)
  const finalUsername = username || generateUsername()
  
  const query = `
    INSERT INTO users (email, password, username, is_admin, created_at) 
    VALUES (?, ?, ?, ?, NOW())
  `
  
  try {
    const result = await executeQuery(query, [email, hashedPassword, finalUsername, false])
    return { success: true, userId: (result as any).insertId, username: finalUsername }
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return { success: false, message: 'El email ya está registrado' }
    }
    throw error
  }
}

export async function authenticateUser(email: string, password: string) {
  console.log('🔍 authenticateUser llamada con email:', email)
  
  const query = `SELECT id, email, password, username, is_admin, is_driver, is_waiter FROM users WHERE email = ?`
  const users = await executeQuery(query, [email]) as any[]
  
  console.log('📊 Usuarios encontrados:', users.length)
  
  if (users.length === 0) {
    console.log('❌ Usuario no encontrado en BD')
    return { success: false, message: 'Usuario no encontrado' }
  }
  
  const user = users[0]
  console.log('👤 Usuario encontrado:', { 
    id: user.id, 
    email: user.email, 
    username: user.username, 
    is_admin: user.is_admin,
    is_driver: user.is_driver,
    is_waiter: user.is_waiter
  })
  
  const isValidPassword = await bcrypt.compare(password, user.password)
  console.log('🔐 Contraseña válida:', isValidPassword)
  
  if (!isValidPassword) {
    console.log('❌ Contraseña incorrecta')
    return { success: false, message: 'Contraseña incorrecta' }
  }
  
  console.log('✅ Autenticación exitosa')
  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      is_admin: Boolean(user.is_admin),
      is_driver: Boolean(user.is_driver), // ✅ Ahora retorna el valor real
      is_waiter: Boolean(user.is_waiter)
    }
  }
}

export async function getUserById(id: number) {
  const query = `SELECT id, email, username, is_admin, is_driver, is_waiter, created_at FROM users WHERE id = ?`
  const users = await executeQuery(query, [id]) as any[]
  return users.length > 0 ? users[0] : null
}

export async function getUserByEmail(email: string) {
  const query = `SELECT id, email, username, is_admin, is_driver, is_waiter, created_at FROM users WHERE email = ?`
  const users = await executeQuery(query, [email]) as any[]
  return users.length > 0 ? users[0] : null
}

// Función para generar username único
function generateUsername(): string {
  const adjectives = ['cool', 'fast', 'smart', 'happy', 'bright', 'kind', 'brave', 'calm']
  const nouns = ['user', 'ninja', 'hero', 'star', 'pro', 'ace', 'chef', 'master']
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
  const randomNum = Math.floor(Math.random() * 1000)
  return `${randomAdj}_${randomNoun}_${randomNum}`
}

// Función para cerrar el pool de conexiones
export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

// Funciones para manejo de pedidos
export async function saveOrder(userId: number, items: string, total: number, customerInfo: string) {
  try {
    const query = `INSERT INTO orders (user_id, items, total, customer_info, status, created_at) VALUES (?, ?, ?, ?, 'pendiente', NOW())`
    const result = await executeQuery(query, [userId, items, total, customerInfo]) as any
    return { success: true, orderId: result.insertId }
  } catch (error) {
    console.error('Error saving order:', error)
    return { success: false, message: 'Error al guardar el pedido' }
  }
}

export async function getUserOrders(userId: number) {
  try {
    const query = `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`
    const orders = await executeQuery(query, [userId])
    return orders
  } catch (error) {
    console.error('Error getting user orders:', error)
    return []
  }
}

export async function getOrder(orderId: number) {
  try {
    const query = `
      SELECT 
        o.*,
        u.username,
        u.email as customer_email,
        o.customer_name,
        o.customer_phone,
        o.delivery_address,
        o.total,
        o.payment_method,
        o.status,
        o.created_at
      FROM orders o 
      LEFT JOIN users u ON o.user_id = u.id 
      WHERE o.id = ?
    `
    const orders = await executeQuery(query, [orderId]) as any[]
    
    if (orders.length === 0) {
      return null
    }
    
    const order = orders[0]
    
    // Parsear items si existen
    if (order.items && typeof order.items === 'string') {
      try {
        order.items = JSON.parse(order.items)
      } catch (e) {
        console.error('Error parsing order items:', e)
        order.items = []
      }
    }
    
    return order
  } catch (error) {
    console.error('Error getting order:', error)
    return null
  }
}

export async function getAllOrders(status?: string | null, after?: string | null) {
  try {
    let query = `SELECT o.*, u.username FROM orders o LEFT JOIN users u ON o.user_id = u.id`
    const params: any[] = []
    const conditions: string[] = []

    if (status) {
      conditions.push('o.status = ?')
      params.push(status)
    }

    if (after) {
      conditions.push('o.created_at > ?')
      params.push(after)
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }

    query += ' ORDER BY o.created_at DESC'

    const orders = await executeQuery(query, params)
    return orders
  } catch (error) {
    console.error('Error getting all orders:', error)
    return []
  }
}

export async function updateOrderStatus(orderId: number, status: string) {
  try {
    const query = `UPDATE orders SET status = ? WHERE id = ?`
    await executeQuery(query, [status, orderId])
    return { success: true }
  } catch (error) {
    console.error('Error updating order status:', error)
    return { success: false, message: 'Error al actualizar estado del pedido' }
  }
}