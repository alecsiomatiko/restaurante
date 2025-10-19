import mysql from 'mysql2/promise'

const db = mysql.createPool({
  host: 'srv440.hstgr.io',
  port: 3306,
  user: 'u574253054_demo',
  password: 'Smartway123*',
  database: 'u574253054_demo',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
})

export interface ProductImage {
  id: number
  image_url: string
  alt_text: string | null
  is_primary: boolean
  display_order: number
}

export interface Product {
  id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  category_id: number | null
  available: boolean
  featured: boolean
  created_at: string
  updated_at: string | null
  slug: string
  active: boolean
  stock: number
  category?: {
    id: number
    name: string
    slug: string
  }
  images?: ProductImage[]
}

export async function getFeaturedProductsWithImages(): Promise<Product[]> {
  try {
    const [rows] = await db.execute(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.image_url,
        p.category_id,
        p.available,
        p.stock,
        p.created_at,
        p.updated_at,
        c.name as category_name,
        c.id as category_id
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.available = 1 AND p.stock > 0
      ORDER BY p.created_at DESC
      LIMIT 6
    `) as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      image_url: row.image_url,
      category_id: row.category_id,
      available: Boolean(row.available),
      featured: true,
      created_at: row.created_at,
      updated_at: row.updated_at,
      slug: row.name.toLowerCase().replace(/\s+/g, '-'),
      active: Boolean(row.available),
      stock: row.stock,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_name.toLowerCase().replace(/\s+/g, '-')
      } : undefined,
      images: []
    }))
  } catch (error) {
    console.error('Error fetching featured products:', error)
    return []
  }
}

export async function getAllProducts(): Promise<Product[]> {
  try {
    const [rows] = await db.execute(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.image_url,
        p.category_id,
        p.available,
        p.stock,
        p.created_at,
        p.updated_at,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.available = 1
      ORDER BY p.name
    `) as any[]

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      image_url: row.image_url,
      category_id: row.category_id,
      available: Boolean(row.available),
      featured: false,
      created_at: row.created_at,
      updated_at: row.updated_at,
      slug: row.name.toLowerCase().replace(/\s+/g, '-'),
      active: Boolean(row.available),
      stock: row.stock,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_name.toLowerCase().replace(/\s+/g, '-')
      } : undefined,
      images: []
    }))
  } catch (error) {
    console.error('Error fetching all products:', error)
    return []
  }
}

export async function getProductById(id: number): Promise<Product | null> {
  try {
    const [rows] = await db.execute(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.image_url,
        p.category_id,
        p.available,
        p.stock,
        p.created_at,
        p.updated_at,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [id]) as any[]

    if (rows.length === 0) {
      return null
    }

    const row = rows[0]
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: parseFloat(row.price),
      image_url: row.image_url,
      category_id: row.category_id,
      available: Boolean(row.available),
      featured: false,
      created_at: row.created_at,
      updated_at: row.updated_at,
      slug: row.name.toLowerCase().replace(/\s+/g, '-'),
      active: Boolean(row.available),
      stock: row.stock,
      category: row.category_name ? {
        id: row.category_id,
        name: row.category_name,
        slug: row.category_name.toLowerCase().replace(/\s+/g, '-')
      } : undefined,
      images: []
    }
  } catch (error) {
    console.error('Error fetching product by id:', error)
    return null
  }
}