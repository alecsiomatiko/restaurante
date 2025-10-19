'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  Truck, 
  Store,
  User,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  UserCheck
} from 'lucide-react'
import { useCart } from '@/hooks/use-cart'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-notifications'
import { useAddressValidation } from '@/hooks/use-address-validation'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, updateQuantity, removeItem, total, itemCount, createOrder, clearCart } = useCart()
  const { user } = useAuth()
  const toast = useToast()

  // Helper function to determine if user should use mesero checkout
  // Only pure waiters (not admin or driver) use special mesero checkout
  const shouldUseMeseroCheckout = (user: any) => {
    return user?.is_waiter && !user?.is_admin && !user?.is_driver
  }

  // Redirect meseros to specialized checkout
  useEffect(() => {
    if (user && shouldUseMeseroCheckout(user)) {
      router.push('/checkout/mesero')
    }
  }, [user, router])

  // Form states
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: user?.email || '',
  })
  
  // For mesero: table name/number and mesa abierta
  const [tableInfo, setTableInfo] = useState({
    table: '',
    notes: '',
  })
  const [mesasAbiertas, setMesasAbiertas] = useState<any[]>([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<string>('');
  const [loadingMesas, setLoadingMesas] = useState(false);
  // Fetch mesas abiertas para mesero
  useEffect(() => {
    if (shouldUseMeseroCheckout(user)) {
      setLoadingMesas(true);
      fetch('/api/mesero/open-tables', { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
          if (data.success) setMesasAbiertas(data.tables || []);
        })
        .finally(() => setLoadingMesas(false));
    }
  }, [user]);

  const [deliveryInfo, setDeliveryInfo] = useState({
    type: 'delivery', // 'delivery' or 'pickup'
    address: '',
    notes: '',
  })
  
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [isProcessing, setIsProcessing] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [validatedAddress, setValidatedAddress] = useState<string | null>(null)
  const [addressValidated, setAddressValidated] = useState(false)
  
  // Address validation hook
  const { validateAddress, isValidating } = useAddressValidation()

  // Redirect if cart is empty
  useEffect(() => {
    if (itemCount === 0) {
      router.push('/menu')
    }
  }, [itemCount, router])

  // Pre-fill user email if logged in
  useEffect(() => {
    if (user?.email) {
      setCustomerInfo(prev => ({ ...prev, email: user.email }))
    }
  }, [user])

  const validateForm = () => {
    let newErrors: { [key: string]: string } = {}
    if (shouldUseMeseroCheckout(user)) {
      // Solo validar mesa para mesero
      if (!mesaSeleccionada && !tableInfo.table.trim()) {
        newErrors.table = 'Selecciona una mesa o crea una nueva'
      }
    }
    // Limpiar error de mesa si no es mesero
    if (!shouldUseMeseroCheckout(user) && newErrors.table) {
      delete newErrors.table;
    }
    // Validar datos de cliente siempre que NO sea mesero
    if (!shouldUseMeseroCheckout(user)) {
      if (!customerInfo.name.trim()) {
        newErrors.name = 'El nombre es requerido'
      }
      if (!customerInfo.phone.trim()) {
        newErrors.phone = 'El teléfono es requerido'
      } else if (!/^[\d\s\-\+\(\)]+$/.test(customerInfo.phone)) {
        newErrors.phone = 'Formato de teléfono inválido'
      }
      if (!customerInfo.email.trim()) {
        newErrors.email = 'El email es requerido'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
        newErrors.email = 'Formato de email inválido'
      }
      if (deliveryInfo.type === 'delivery' && !deliveryInfo.address.trim()) {
        newErrors.address = 'La dirección es requerida para delivery'
      }
    }
    // DEBUG: Mostrar errores y valores
    console.log('validateForm', {
      user,
      customerInfo,
      deliveryInfo,
      mesaSeleccionada,
      tableInfo,
      newErrors
    });
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      toast.error('Formulario incompleto', 'Por favor completa todos los campos requeridos')
      return
    }
    setIsProcessing(true)
    try {
      let orderData: any = {}
      if (shouldUseMeseroCheckout(user)) {
        // Mesero: mesa, notas, no pago, tipo especial
        orderData = {
          customer_info: customerInfo,
          table: mesaSeleccionada ? mesaSeleccionada : tableInfo.table,
          notes: tableInfo.notes,
          waiter_order: true
        }
      } else {
        orderData = {
          customer_info: customerInfo,
          delivery_address: deliveryInfo.type === 'delivery' ? deliveryInfo.address : null,
          payment_method: paymentMethod,
          notes: deliveryInfo.notes,
          delivery_type: deliveryInfo.type
        }
      }
      const result = await createOrder(orderData)
      if (result.success) {
        if (shouldUseMeseroCheckout(user)) {
          clearCart()
          // Redirigir a la página de mesas abiertas
          router.push('/mesero/mesas-abiertas')
          return
        }
        // Si el método de pago es Mercado Pago, crear preferencia y redirigir
        if (paymentMethod === 'mercadopago') {
          const mpResponse = await fetch('/api/mercadopago/create-preference', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              items: items.map(item => ({
                id: item.id,
                name: item.name,
                description: item.name,
                price: item.price,
                quantity: item.quantity
              })),
              orderId: result.orderId,
              customerInfo: {
                name: customerInfo.name,
                email: customerInfo.email,
                phone: customerInfo.phone,
                address: deliveryInfo.address
              }
            })
          })
          if (mpResponse.ok) {
            const mpData = await mpResponse.json()
            window.location.href = mpData.init_point
            return
          } else {
            const error = await mpResponse.json()
            toast.error('Error', error.error || 'Error al crear preferencia de pago')
            setIsProcessing(false)
            return
          }
        }
        clearCart()
        const thankYouUrl = `/orders/thank-you?orderId=${result.orderId}&payment=${paymentMethod}`
        window.location.href = thankYouUrl
      } else {
        toast.error('Error al crear pedido', result.message || 'Intenta de nuevo')
      }
    } catch (error) {
      console.error('Error en checkout:', error)
      toast.error('Error', 'Error de conexión. Intenta de nuevo.')
    } finally {
      setIsProcessing(false)
    }
  }

  const calculateDeliveryFee = () => {
    return deliveryInfo.type === 'delivery' ? 25 : 0
  }

  const finalTotal = total + calculateDeliveryFee()

  if (itemCount === 0) {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 py-12">
      {/* DEBUG: Mostrar errores en pantalla */}
      {Object.keys(errors).length > 0 && (
        <div style={{background:'#300',color:'#fff',padding:8,margin:8,borderRadius:8,fontSize:14}}>
          <b>Errores detectados:</b>
          <ul style={{margin:0,paddingLeft:16}}>
            {Object.entries(errors).map(([k,v]) => (
              <li key={k}>{k}: {v}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent mb-2">
            Finalizar Pedido
          </h1>
          <p className="text-purple-200">Confirma tu orden galáctica</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Order Form */}
          <div className="space-y-6">
            {/* SOLO para mesero: selección/creación de mesa y notas */}
            {shouldUseMeseroCheckout(user) ? (
              <Card className="backdrop-blur-sm bg-white/10 border-yellow-500/20">
                <CardHeader>
                  <CardTitle className="text-yellow-200 flex items-center">
                    <UserCheck className="h-5 w-5 mr-2" />
                    Selecciona una mesa abierta o crea una nueva
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingMesas ? (
                    <div className="flex items-center gap-2 text-yellow-300"><Loader2 className="animate-spin h-5 w-5" /> Cargando mesas...</div>
                  ) : (
                    <>
                      {mesasAbiertas.length > 0 && (
                        <div>
                          <Label className="text-yellow-100 mb-1 block">Mesas abiertas ({mesasAbiertas.length}):</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {mesasAbiertas.map((mesa) => (
                              <button
                                key={mesa.tableName}
                                type="button"
                                className={`p-3 rounded-lg font-semibold border transition-all text-left ${mesaSeleccionada === mesa.tableName ? 'bg-yellow-400 text-yellow-900 border-yellow-500' : 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200'}`}
                                onClick={() => setMesaSeleccionada(mesa.tableName)}
                              >
                                <div className="font-bold">{mesa.tableName}</div>
                                <div className="text-xs opacity-75">
                                  {mesa.orderCount} pedidos - ${mesa.totalMesa.toFixed(2)}
                                </div>
                              </button>
                            ))}
                          </div>
                          <div className="mt-2 text-xs text-yellow-300">
                            Selecciona una mesa existente para agregar productos a esa mesa
                          </div>
                        </div>
                      )}
                      <div className="mt-4">
                        <Label htmlFor="table" className="text-yellow-100">Nueva mesa (nombre o número):</Label>
                        <Input
                          id="table"
                          value={tableInfo.table}
                          onChange={e => setTableInfo(prev => ({ ...prev, table: e.target.value }))}
                          className="bg-white/10 border-yellow-300/30 text-yellow-100 placeholder:text-yellow-300"
                          placeholder="Ej: mesa 7, terraza, etc."
                        />
                        {errors.table && (
                          <p className="text-red-400 text-sm mt-1">{errors.table}</p>
                        )}
                      </div>
                      <div className="mt-4">
                        <Label htmlFor="notes" className="text-yellow-100">Notas adicionales (opcional)</Label>
                        <Textarea
                          id="notes"
                          value={tableInfo.notes}
                          onChange={e => setTableInfo(prev => ({ ...prev, notes: e.target.value }))}
                          className="bg-white/10 border-yellow-300/30 text-yellow-100 placeholder:text-yellow-300"
                          placeholder="Instrucciones especiales, preferencias..."
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : null}
            {/* Campos de cliente para usuarios normales */}
            {!shouldUseMeseroCheckout(user) && (
              <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Información del Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="text-white">Nombre completo *</Label>
                    <Input
                      id="name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-white/10 border-purple-300/30 text-white placeholder:text-purple-300"
                      placeholder="Tu nombre completo"
                    />
                    {errors.name && (
                      <p className="text-red-400 text-sm mt-1">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="phone" className="text-white">Teléfono *</Label>
                    <Input
                      id="phone"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-white/10 border-purple-300/30 text-white placeholder:text-purple-300"
                      placeholder="Tu número de teléfono"
                    />
                    {errors.phone && (
                      <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="email" className="text-white">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-white/10 border-purple-300/30 text-white placeholder:text-purple-300"
                      placeholder="tu@email.com"
                    />
                    {errors.email && (
                      <p className="text-red-400 text-sm mt-1">{errors.email}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
              <>
                {/* Delivery Options */}
                <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Truck className="h-5 w-5 mr-2" />
                      Opciones de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup 
                      value={deliveryInfo.type} 
                      onValueChange={(value) => setDeliveryInfo(prev => ({ ...prev, type: value }))}
                    >
                      <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/5 border border-purple-300/20">
                        <RadioGroupItem value="delivery" id="delivery" />
                        <Label htmlFor="delivery" className="text-white flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Truck className="h-4 w-4 mr-2" />
                              <span>Delivery a domicilio</span>
                            </div>
                            <Badge className="bg-orange-500">$25.00</Badge>
                          </div>
                          <p className="text-purple-300 text-sm mt-1">Entrega en 30-45 minutos</p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/5 border border-purple-300/20">
                        <RadioGroupItem value="pickup" id="pickup" />
                        <Label htmlFor="pickup" className="text-white flex-1 cursor-pointer">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Store className="h-4 w-4 mr-2" />
                              <span>Recoger en tienda</span>
                            </div>
                            <Badge className="bg-green-500">Gratis</Badge>
                          </div>
                          <p className="text-purple-300 text-sm mt-1">Listo en 15-20 minutos</p>
                        </Label>
                      </div>
                    </RadioGroup>
                    {deliveryInfo.type === 'delivery' && (
                      <div>
                        <Label htmlFor="address" className="text-white">Dirección de entrega *</Label>
                        <Textarea
                          id="address"
                          value={deliveryInfo.address}
                          onChange={(e) => setDeliveryInfo(prev => ({ ...prev, address: e.target.value }))}
                          className="bg-white/10 border-purple-300/30 text-white placeholder:text-purple-300"
                          placeholder="Calle, número, colonia, referencias..."
                          rows={3}
                        />
                        {errors.address && (
                          <p className="text-red-400 text-sm mt-1">{errors.address}</p>
                        )}
                      </div>
                    )}
                    <div>
                      <Label htmlFor="notes" className="text-white">Notas adicionales (opcional)</Label>
                      <Textarea
                        id="notes"
                        value={deliveryInfo.notes}
                        onChange={(e) => setDeliveryInfo(prev => ({ ...prev, notes: e.target.value }))}
                        className="bg-white/10 border-purple-300/30 text-white placeholder:text-purple-300"
                        placeholder="Instrucciones especiales, preferencias..."
                        rows={2}
                      />
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
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                      <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/5 border border-purple-300/20">
                        <RadioGroupItem value="efectivo" id="efectivo" />
                        <Label htmlFor="efectivo" className="text-white flex-1 cursor-pointer">
                          <div className="flex items-center">
                            <span className="text-lg mr-2">$</span>
                            <span>Efectivo</span>
                          </div>
                          <p className="text-purple-300 text-sm mt-1">Pago al recibir</p>
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 rounded-lg bg-white/5 border border-purple-300/20">
                        <RadioGroupItem value="mercadopago" id="mercadopago" />
                        <Label htmlFor="mercadopago" className="text-white flex-1 cursor-pointer">
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 mr-2" />
                            <span>Tarjeta de crédito/débito</span>
                          </div>
                          <p className="text-purple-300 text-sm mt-1">Paga con Mercado Pago</p>
                        </Label>
                      </div>
                    </RadioGroup>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          {/* Right Column - Order Summary */}
          <div className="space-y-6">
            <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Resumen del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center space-x-3 p-3 rounded-lg bg-white/5">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{item.name}</h4>
                      <p className="text-purple-300 text-sm">${Number(item.price).toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-8 w-8 p-0 border-purple-400 text-purple-300 hover:bg-purple-600"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-white font-medium w-8 text-center">
                        {item.quantity}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-8 w-8 p-0 border-purple-400 text-purple-300 hover:bg-purple-600"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeItem(item.id)}
                        className="h-8 w-8 p-0 border-red-400 text-red-300 hover:bg-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-white font-medium">
                      ${(Number(item.price) * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
                <Separator className="bg-purple-500/20" />
                <div className="space-y-2">
                  <div className="flex justify-between text-purple-200">
                    <span>Subtotal:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  {/* Mesero: no delivery fee, no payment at order */}
                  {!shouldUseMeseroCheckout(user) && (
                    <>
                      <div className="flex justify-between text-purple-200">
                        <span>Costo de envío:</span>
                        <span>${calculateDeliveryFee().toFixed(2)}</span>
                      </div>
                      <Separator className="bg-purple-500/20" />
                    </>
                  )}
                  <div className="flex justify-between text-white text-lg font-bold">
                    <span>Total:</span>
                    <span>${finalTotal.toFixed(2)}</span>
                  </div>
                </div>
                <Button
                  onClick={handleSubmit}
                  disabled={isProcessing || itemCount === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Procesando pedido...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Confirmar Pedido
                    </>
                  )}
                </Button>
                <div className="text-center text-purple-300 text-sm">
                  <Clock className="h-4 w-4 inline mr-1" />
                  {!shouldUseMeseroCheckout(user) ? (
                    <>Tiempo estimado: {deliveryInfo.type === 'delivery' ? '30-45' : '15-20'} minutos</>
                  ) : (
                    <>Orden de mesa abierta</>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}


