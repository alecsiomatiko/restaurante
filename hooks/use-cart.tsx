'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  image_url?: string
  category_name?: string
}

interface CartContextType {
  items: CartItem[]
  addItem: (product: any, quantity?: number) => void
  removeItem: (productId: number) => void
  updateQuantity: (productId: number, quantity: number) => void
  clearCart: () => void
  total: number
  itemCount: number
  createOrder: (orderData: any) => Promise<{ success: boolean; orderId?: number; message?: string }>
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // Cargar carrito del localStorage al iniciar
  useEffect(() => {
    const savedCart = localStorage.getItem('cart')
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart))
      } catch (error) {
        console.error('Error cargando carrito:', error)
      }
    }
  }, [])

  // Guardar carrito en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items))
  }, [items])

  const addItem = (product: any, quantity: number = 1) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(item => item.id === product.id)
      
      if (existingItem) {
        return currentItems.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      } else {
        return [...currentItems, {
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
          image_url: product.image_url,
          category_name: product.category_name
        }]
      }
    })
  }

  const removeItem = (productId: number) => {
    setItems(currentItems => currentItems.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }

    setItems(currentItems =>
      currentItems.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  const createOrder = async (orderData: any) => {
    try {
      const orderItems = items.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      }))

      const response = await fetch('/api/orders-mysql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          items: orderItems,
          customer_info: orderData.customer_info,
          delivery_address: orderData.delivery_address,
          payment_method: orderData.payment_method,
          notes: orderData.notes,
          delivery_type: orderData.delivery_type,
          waiter_order: orderData.waiter_order,
          table: orderData.table
        }),
      })

      const data = await response.json()

      if (data.success) {
        // NO limpiar el carrito aquí, dejar que el checkout lo haga después de redirigir
        return { 
          success: true, 
          orderId: data.orderId, 
          message: 'Pedido creado exitosamente' 
        }
      } else {
        return { 
          success: false, 
          message: data.error || 'Error al crear pedido' 
        }
      }
    } catch (error) {
      console.error('Error creando pedido:', error)
      return { 
        success: false, 
        message: 'Error de conexión' 
      }
    }
  }

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      total,
      itemCount,
      createOrder
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}