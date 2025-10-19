'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle,
  Loader2,
  UserCheck,
  Clock,
  DollarSign
} from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-notifications'

interface GroupedTable {
  tableName: string;
  orders: any[];
  totalMesa: number;
  allItems: any[];
  firstOrderDate: string;
  lastOrderDate: string;
  orderCount: number;
}

export default function CheckoutMeseroPage() {
  const router = useRouter()
  const { items, updateQuantity, removeItem, total, itemCount, createOrder, clearCart } = useCart()
  const { user } = useAuth()
  const toast = useToast()

  // States
  const [mesasAbiertas, setMesasAbiertas] = useState<GroupedTable[]>([])
  const [mesaSeleccionada, setMesaSeleccionada] = useState<string>('')
  const [nuevaMesa, setNuevaMesa] = useState('')
  const [notas, setNotas] = useState('')
  const [loadingMesas, setLoadingMesas] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  // Redirect if cart is empty
  useEffect(() => {
    if (itemCount === 0) {
      router.push('/menu')
    }
  }, [itemCount, router])

  // Redirect if not mesero
  useEffect(() => {
    if (user && (!user.is_waiter || user.is_admin || user.is_driver)) {
      router.push('/checkout')
    }
  }, [user, router])

  // Fetch mesas abiertas
  useEffect(() => {
    if (user?.is_waiter) {
      setLoadingMesas(true)
      fetch('/api/mesero/open-tables', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMesasAbiertas(data.tables || [])
          }
        })
        .catch(err => console.error('Error fetching tables:', err))
        .finally(() => setLoadingMesas(false))
    }
  }, [user])

  const handleSubmit = async () => {
    const mesaFinal = mesaSeleccionada || nuevaMesa
    
    if (!mesaFinal.trim()) {
      toast.error('Error', 'Debes seleccionar una mesa existente o crear una nueva')
      return
    }

    setIsProcessing(true)
    
    try {
      const orderData = {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        total,
        // Datos específicos del mesero
        waiter_order: true,
        table: mesaFinal,
        notes: notas,
        payment_method: 'efectivo', // Meseros siempre efectivo
        delivery_type: 'mesa' // Tipo especial para mesas
      }

      const result = await createOrder(orderData)
      
      if (result.success) {
        toast.success('¡Pedido creado!', `Productos agregados a ${mesaFinal}`)
        clearCart()
        router.push('/mesero/mesas-abiertas')
      } else {
        toast.error('Error', result.message || 'No se pudo crear el pedido')
      }
    } catch (error) {
      toast.error('Error', 'Error al procesar el pedido')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!user?.is_waiter) {
    return <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-white to-yellow-200 py-4 sm:py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-800 mb-2">Checkout - Mesero</h1>
          <p className="text-yellow-700">Agrega productos a una mesa existente o crea una nueva mesa</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Mesa Selection */}
          <div className="space-y-6">
            {/* Mesas Abiertas */}
            <Card className="backdrop-blur-md bg-white/80 border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center">
                  <UserCheck className="h-5 w-5 mr-2" />
                  Seleccionar Mesa
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingMesas ? (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <Loader2 className="animate-spin h-5 w-5" />
                    <span>Cargando mesas...</span>
                  </div>
                ) : (
                  <>
                    {mesasAbiertas.length > 0 && (
                      <div>
                        <Label className="text-yellow-800 mb-3 block font-semibold">
                          Mesas Abiertas ({mesasAbiertas.length}):
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {mesasAbiertas.map((mesa) => (
                            <button
                              key={mesa.tableName}
                              type="button"
                              className={`p-4 rounded-lg border transition-all text-left ${
                                mesaSeleccionada === mesa.tableName 
                                  ? 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-md' 
                                  : 'bg-white text-yellow-800 border-yellow-200 hover:bg-yellow-50 hover:border-yellow-300'
                              }`}
                              onClick={() => {
                                setMesaSeleccionada(mesa.tableName)
                                setNuevaMesa('') // Clear nueva mesa if selecting existing
                              }}
                            >
                              <div className="font-bold text-lg">{mesa.tableName}</div>
                              <div className="flex items-center gap-4 text-sm opacity-75 mt-1">
                                <div className="flex items-center gap-1">
                                  <span>{mesa.orderCount} pedidos</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  <span>${Number(mesa.totalMesa).toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-xs opacity-60 mt-1">
                                <Clock className="h-3 w-3" />
                                <span>{new Date(mesa.firstOrderDate).toLocaleTimeString()}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                          💡 Selecciona una mesa existente para agregar productos a esa mesa
                        </div>
                      </div>
                    )}

                    {/* Nueva Mesa */}
                    <div className="mt-6">
                      <Label htmlFor="nueva-mesa" className="text-yellow-800 font-semibold">
                        O crear nueva mesa:
                      </Label>
                      <Input
                        id="nueva-mesa"
                        value={nuevaMesa}
                        onChange={(e) => {
                          setNuevaMesa(e.target.value)
                          if (e.target.value) setMesaSeleccionada('') // Clear selected if typing new
                        }}
                        className="mt-2 bg-white border-yellow-300 focus:border-yellow-500"
                        placeholder="Ej: Mesa 8, Terraza 2, VIP 1..."
                      />
                    </div>

                    {/* Notas */}
                    <div>
                      <Label htmlFor="notas" className="text-yellow-800 font-semibold">
                        Notas adicionales (opcional):
                      </Label>
                      <Textarea
                        id="notas"
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        className="mt-2 bg-white border-yellow-300 focus:border-yellow-500"
                        placeholder="Instrucciones especiales, alergias, preferencias..."
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <Card className="backdrop-blur-md bg-white/80 border-none shadow-lg">
              <CardHeader>
                <CardTitle className="text-yellow-800 flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Resumen del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{item.name}</h4>
                      <p className="text-sm text-gray-600">${Number(item.price).toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, Math.max(0, item.quantity - 1))}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Badge variant="secondary" className="min-w-[2rem] text-center">
                        {item.quantity}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center text-xl font-bold text-yellow-800">
                    <span>Total:</span>
                    <span>${Number(total).toFixed(2)}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={isProcessing || (!mesaSeleccionada && !nuevaMesa.trim())}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 text-white text-lg py-6"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Agregar a {mesaSeleccionada || nuevaMesa || 'Mesa'}
                    </>
                  )}
                </Button>

                {/* Info */}
                <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded">
                  <p className="font-semibold mb-1">Información:</p>
                  <p>• Los productos se agregarán a la mesa seleccionada</p>
                  <p>• Pago siempre en efectivo (mesero)</p>
                  <p>• Sin opciones de delivery</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}