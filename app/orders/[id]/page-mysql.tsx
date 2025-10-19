'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  ArrowLeft, 
  Loader2,
  CheckCircle,
  Clock,
  Package,
  Truck,
  Store,
  MapPin,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  User,
  ShoppingCart,
  FileText,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useOrders } from '@/hooks/use-orders'
import { useToast } from '@/hooks/use-notifications'

export default function OrderDetailPage() {
  const { user } = useAuth()
  const { getOrderById } = useOrders()
  const toast = useToast()
  const router = useRouter()
  const params = useParams()
  const orderId = params.id as string

  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    loadOrderDetails()
  }, [user, orderId])

  const loadOrderDetails = async () => {
    try {
      setLoading(true)
      setError('')
      
      const orderData = await getOrderById(parseInt(orderId))
      
      if (orderData) {
        setOrder(orderData)
      } else {
        setError('Orden no encontrada')
      }
    } catch (err) {
      console.error('Error loading order:', err)
      setError('Error al cargar los detalles de la orden')
    } finally {
      setLoading(false)
    }
  }

  const getOrderStatusConfig = (status: string) => {
    const statusConfig = {
      pending: { 
        label: 'Pendiente', 
        color: 'bg-yellow-500', 
        icon: Clock,
        description: 'Tu pedido ha sido recibido y está siendo procesado'
      },
      confirmed: { 
        label: 'Confirmado', 
        color: 'bg-blue-500', 
        icon: CheckCircle,
        description: 'Tu pedido ha sido confirmado y será preparado pronto'
      },
      preparing: { 
        label: 'Preparando', 
        color: 'bg-purple-500', 
        icon: Package,
        description: 'Nuestros chefs están preparando tu orden galáctica'
      },
      ready: { 
        label: 'Listo', 
        color: 'bg-green-500', 
        icon: Package,
        description: 'Tu pedido está listo para ser entregado/recogido'
      },
      in_delivery: { 
        label: 'En Camino', 
        color: 'bg-orange-500', 
        icon: Truck,
        description: 'Tu pedido está en camino hacia tu ubicación'
      },
      delivered: { 
        label: 'Entregado', 
        color: 'bg-green-600', 
        icon: CheckCircle,
        description: '¡Tu pedido ha sido entregado! Esperamos que lo disfrutes'
      },
      cancelled: { 
        label: 'Cancelado', 
        color: 'bg-red-500', 
        icon: Package,
        description: 'Este pedido ha sido cancelado'
      }
    }

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const calculateTotal = () => {
    if (!order?.items) return 0
    
    const itemsTotal = order.items.reduce((sum: number, item: any) => 
      sum + (item.price * item.quantity), 0
    )
    const deliveryFee = order.delivery_type === 'delivery' ? 25 : 0
    return itemsTotal + deliveryFee
  }

  const getItemsCount = () => {
    if (!order?.items) return 0
    return order.items.reduce((sum: number, item: any) => sum + item.quantity, 0)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center">
        <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
          <CardContent className="p-8 flex items-center space-x-4">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            <span className="text-white">Verificando acceso...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center">
        <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
          <CardContent className="p-8 flex items-center space-x-4">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            <span className="text-white">Cargando detalles del pedido...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="mb-4 text-purple-400 hover:text-purple-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          
          <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
            <CardContent className="p-8 text-center">
              <Package className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Error</h3>
              <p className="text-purple-200 mb-6">{error || 'Orden no encontrada'}</p>
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={() => router.push('/orders')}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Ver Todos los Pedidos
                </Button>
                <Button 
                  onClick={loadOrderDetails}
                  variant="outline"
                  className="border-purple-400 text-purple-300 hover:bg-purple-600"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reintentar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const statusConfig = getOrderStatusConfig(order.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.back()} 
            className="mb-4 text-purple-400 hover:text-purple-300"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent mb-2">
              Pedido #{order.id}
            </h1>
            <p className="text-purple-200">Detalles de tu orden galáctica</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Order Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <StatusIcon className="h-5 w-5 mr-2" />
                  Estado del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <Badge className={`${statusConfig.color} text-white flex items-center gap-2 px-4 py-2 text-sm`}>
                    <StatusIcon className="h-4 w-4" />
                    {statusConfig.label}
                  </Badge>
                  <Button
                    onClick={loadOrderDetails}
                    variant="outline"
                    size="sm"
                    className="border-purple-400 text-purple-300 hover:bg-purple-600"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualizar
                  </Button>
                </div>
                <p className="text-purple-200 text-sm">{statusConfig.description}</p>
                <div className="mt-3 text-xs text-purple-300">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Pedido realizado: {formatDate(order.created_at)}
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Items del Pedido ({getItemsCount()})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-purple-300/20">
                      <div className="flex-1">
                        <h4 className="text-white font-medium">{item.name}</h4>
                        <p className="text-purple-300 text-sm">${item.price.toFixed(2)} c/u</p>
                      </div>
                      <div className="text-center">
                        <span className="text-white font-medium">x{item.quantity}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-orange-400 font-bold">
                          ${(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Information */}
            {order.customer_info && (
              <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Información del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-purple-300 text-sm">Nombre</Label>
                      <p className="text-white">{order.customer_info.name}</p>
                    </div>
                    <div>
                      <Label className="text-purple-300 text-sm">Teléfono</Label>
                      <p className="text-white">{order.customer_info.phone}</p>
                    </div>
                    {order.customer_info.email && (
                      <div>
                        <Label className="text-purple-300 text-sm">Email</Label>
                        <p className="text-white">{order.customer_info.email}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Information */}
            <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  {order.delivery_type === 'delivery' ? (
                    <Truck className="h-5 w-5 mr-2" />
                  ) : (
                    <Store className="h-5 w-5 mr-2" />
                  )}
                  {order.delivery_type === 'delivery' ? 'Información de Delivery' : 'Información de Pickup'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.delivery_type === 'delivery' ? (
                  <div>
                    {order.delivery_address && (
                      <div className="mb-3">
                        <Label className="text-purple-300 text-sm">Dirección de entrega</Label>
                        <p className="text-white flex items-start">
                          <MapPin className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                          {order.delivery_address}
                        </p>
                      </div>
                    )}
                    <div className="text-sm text-purple-200">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Tiempo estimado: 30-45 minutos
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-3">
                      <Label className="text-purple-300 text-sm">Dirección del local</Label>
                      <p className="text-white flex items-start">
                        <Store className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                        Av. Galáctica #2025, Sector Supernova
                      </p>
                    </div>
                    <div className="text-sm text-purple-200">
                      <Clock className="h-4 w-4 inline mr-1" />
                      Tiempo estimado: 15-20 minutos
                    </div>
                  </div>
                )}
                
                {order.notes && (
                  <div className="mt-4 p-3 bg-white/5 rounded border border-purple-300/10">
                    <Label className="text-purple-300 text-sm">Notas adicionales</Label>
                    <p className="text-white text-sm mt-1">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Resumen del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-purple-200">
                    <span>Subtotal:</span>
                    <span>${(calculateTotal() - (order.delivery_type === 'delivery' ? 25 : 0)).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-purple-200">
                    <span>Costo de envío:</span>
                    <span>${order.delivery_type === 'delivery' ? '25.00' : '0.00'}</span>
                  </div>
                  
                  <Separator className="bg-purple-500/20" />
                  
                  <div className="flex justify-between text-white text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-orange-400">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Método de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <span className="text-lg mr-2">💵</span>
                  <div>
                    <p className="text-white font-medium">
                      {order.payment_method === 'efectivo' ? 'Efectivo' : order.payment_method}
                    </p>
                    <p className="text-purple-300 text-sm">
                      {order.delivery_type === 'delivery' ? 'Pago al recibir' : 'Pago en el local'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  onClick={() => router.push('/orders')}
                  variant="outline"
                  className="w-full border-purple-400 text-purple-300 hover:bg-purple-600"
                >
                  Ver Todos los Pedidos
                </Button>
                
                <Button 
                  onClick={() => router.push('/menu')}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  Hacer Nuevo Pedido
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={className}>{children}</span>
}