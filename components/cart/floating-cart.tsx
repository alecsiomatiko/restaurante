"use client"

import { ShoppingCart, X, Plus, Minus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCart } from "@/hooks/use-cart"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function FloatingCart() {
  const { items, total, updateQuantity, removeItem } = useCart()
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0)

  if (itemCount === 0) return null

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-floating-cart
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform neon-glow"
      >
        <ShoppingCart className="w-6 h-6" />
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
            {itemCount}
          </span>
        )}
      </button>

      {/* Panel del carrito */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          <div className="relative bg-gradient-to-b from-purple-900 to-black border-2 border-purple-500 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-purple-500/30 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Tu Carrito ({itemCount})
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white/5 rounded-lg p-3 flex items-center space-x-3"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-sm truncate">
                      {item.name}
                    </h4>
                    <p className="text-purple-300 text-xs">
                      ${Number(item.price).toFixed(2)} c/u
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="h-7 w-7 p-0 border-purple-400"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    
                    <span className="text-white font-bold w-8 text-center">
                      {item.quantity}
                    </span>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="h-7 w-7 p-0 border-purple-400"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(item.id)}
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="text-white font-bold text-sm">
                    ${(Number(item.price) * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between text-lg">
                <span className="text-gray-300">Total:</span>
                <span className="text-white font-bold text-2xl">
                  ${total.toFixed(2)}
                </span>
              </div>

              <Button
                onClick={() => {
                  setIsOpen(false)
                  router.push('/checkout')
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3"
              >
                Ir al Checkout
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
