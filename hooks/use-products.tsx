'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { useToast } from './use-notifications'

interface Product {
  id: number
  name: string
  description: string
  price: number
  stock?: number
  image_url?: string
  category_id: number
  category_name?: string
  available: boolean
  created_at: string
  updated_at: string
}

interface Category {
  id: number
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFailedAt, setLastFailedAt] = useState<number | null>(null)
  const [inFlightProducts, setInFlightProducts] = useState(false)
  const [inFlightCategories, setInFlightCategories] = useState(false)
  const { user } = useAuth()
  const toast = useToast()

  async function fetchWithRetry(url: string, attempts = 2) {
    let attempt = 0
    while (true) {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return await response.json()
      } catch (err: any) {
        attempt++
        if (attempt >= attempts) throw err
        const delay = 500 * Math.pow(2, attempt - 1)
        await new Promise((res) => setTimeout(res, delay))
      }
    }
  }

  const fetchProducts = async (categoryId?: number) => {
    try {
      // avoid tight loops when recent failure
      if (lastFailedAt && Date.now() - lastFailedAt < 30000) {
        console.warn('Last fetch failed recently, backing off for 30s')
        return
      }

      // prevent concurrent fetches
      if (inFlightProducts) {
        console.warn('Products fetch already in flight, skipping')
        return
      }

      setInFlightProducts(true)
      setLoading(true)
      setError(null)

      const url = categoryId ? `/api/products-mysql?category=${categoryId}` : '/api/products-mysql'
      const data = await fetchWithRetry(url, 2)

      if (data.success) {
        setProducts(data.products)
        setLastFailedAt(null) // reset on success
        setError(null)
      } else {
        setError(data.error || 'Error cargando productos')
        setLastFailedAt(Date.now())
      }
    } catch (error: any) {
      console.error('Error fetching products:', error)
      setError('Error de conexión')
      setLastFailedAt(Date.now())
    } finally {
      setLoading(false)
      setInFlightProducts(false)
    }
  }

  // Cargar categorías
  const fetchCategories = async () => {
    try {
      if (lastFailedAt && Date.now() - lastFailedAt < 30000) {
        console.warn('Last fetch failed recently, backing off categories for 30s')
        return
      }

      if (inFlightCategories) {
        console.warn('Categories fetch already in flight, skipping')
        return
      }

      setInFlightCategories(true)

      const data = await fetchWithRetry('/api/categories', 2)
      if (data.success) {
        setCategories(data.categories)
        setLastFailedAt(null)
        setError(null)
      } else {
        setError(data.error || 'Error cargando categorías')
        setLastFailedAt(Date.now())
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
      setError('Error de conexión')
      setLastFailedAt(Date.now())
    } finally {
      setInFlightCategories(false)
    }
  }

  // Crear producto (admin only)
  const createProduct = async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user?.is_admin) {
      console.warn('Create product attempted without admin permission')
      return { success: false, error: 'Sin permisos' }
    }

    try {
      const response = await fetch('/api/products-mysql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(productData),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Producto creado', 'El producto se ha creado exitosamente')
        await fetchProducts() // Recargar lista
        return { success: true, product: data.product }
      } else {
        console.error('Error creating product:', data.error)
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Error creating product:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  // Actualizar producto (admin only)
  const updateProduct = async (id: number, productData: Partial<Product>) => {
    if (!user?.is_admin) {
      console.warn('Update product attempted without admin permission')
      return { success: false, error: 'Sin permisos' }
    }

    try {
      const response = await fetch('/api/products-mysql', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id, ...productData }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Producto actualizado', 'Los cambios se han guardado')
        await fetchProducts() // Recargar lista
        return { success: true, product: data.product }
      } else {
        console.error('Error updating product:', data.error)
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Error updating product:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  // Eliminar producto (admin only)
  const deleteProduct = async (id: number) => {
    if (!user?.is_admin) {
      console.warn('Delete product attempted without admin permission')
      return { success: false, error: 'Sin permisos' }
    }

    try {
      const response = await fetch(`/api/products-mysql?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Producto eliminado', 'El producto se ha eliminado')
        await fetchProducts() // Recargar lista
        return { success: true }
      } else {
        console.error('Error deleting product:', data.error)
        return { success: false, error: data.error }
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      return { success: false, error: 'Error de conexión' }
    }
  }

  // Alternar disponibilidad del producto
  const toggleAvailability = async (id: number, available: boolean) => {
    return await updateProduct(id, { available })
  }

  return {
    products,
    categories,
    loading,
    error,
    fetchProducts,
    fetchCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    toggleAvailability,
    refetch: fetchProducts
  }
}