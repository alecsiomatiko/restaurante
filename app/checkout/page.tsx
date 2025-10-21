'use client'

import { useState, useEffect, useRef } from 'react'
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

// Declarar Google como variable global
declare global {
  interface Window {
    google?: any
    initMap?: () => void
  }
}

export default function CheckoutPage() {
  const router = useRouter()
  const { items, updateQuantity, removeItem, total, itemCount, createOrder, clearCart } = useCart()
  const { user } = useAuth()
  const toast = useToast()

  // Helper function to determine if user should use mesero checkout
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
  
  const [tableInfo, setTableInfo] = useState({
    table: '',
    notes: '',
  })
  const [mesasAbiertas, setMesasAbiertas] = useState<any[]>([]);
  const [mesaSeleccionada, setMesaSeleccionada] = useState<string>('');
  const [loadingMesas, setLoadingMesas] = useState(false);
  
  const [deliveryInfo, setDeliveryInfo] = useState({
    address: '',
    notes: '',
  })
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('pickup')
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  
  // Google Maps y direcciones
  const addressInputRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [marker, setMarker] = useState<any>(null)
  const [autocomplete, setAutocomplete] = useState<any>(null)
  const [showMap, setShowMap] = useState(false)
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null)
  const [validatedAddress, setValidatedAddress] = useState<string | null>(null)
  const [addressValidated, setAddressValidated] = useState(false)

  // Cargar Google Maps API
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.google) {
      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAAEDbSXamj1l-ThrvFqyrBWOo9rMdKQLU&libraries=places&callback=initMap`
      script.async = true
      script.defer = true
      
      window.initMap = () => {
        if (addressInputRef.current && window.google) {
          initializeAutocomplete()
        }
      }
      
      document.head.appendChild(script)
    } else if (window.google && addressInputRef.current) {
      initializeAutocomplete()
    }
  }, [orderType])

  // Inicializar Google Places Autocomplete
  const initializeAutocomplete = () => {
    if (!window.google || !addressInputRef.current) return
    
    const autocompleteInstance = new window.google.maps.places.Autocomplete(
      addressInputRef.current,
      {
        types: ['address'],
        componentRestrictions: { country: 'ar' },
        fields: ['formatted_address', 'geometry', 'name']
      }
    )
    
    setAutocomplete(autocompleteInstance)
    
    autocompleteInstance.addListener('place_changed', () => {
      const place = autocompleteInstance.getPlace()
      
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        const address = place.formatted_address || place.name
        
        setDeliveryInfo(prev => ({ ...prev, address }))
        setCoordinates({ lat, lng })
        setValidatedAddress(address)
        setAddressValidated(true)
        setShowMap(true)
        
        // Inicializar mapa
        initializeMap(lat, lng, address)
      }
    })
  }

  // Inicializar el mapa
  const initializeMap = (lat: number, lng: number, address: string) => {
    if (!mapRef.current || !window.google) return
    
    const mapInstance = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: 16,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    })
    
    const markerInstance = new window.google.maps.Marker({
      position: { lat, lng },
      map: mapInstance,
      title: address,
      animation: window.google.maps.Animation.DROP,
    })
    
    setMap(mapInstance)
    setMarker(markerInstance)
  }
  
  // Limpiar validación cuando cambia la dirección manualmente
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setDeliveryInfo(prev => ({ ...prev, address: value }))
    
    if (value !== validatedAddress) {
      setAddressValidated(false)
      setValidatedAddress(null)
      setShowMap(false)
      setCoordinates(null)
    }
  }

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

  // Redirect if cart is empty (but not if checkout was successful)
  useEffect(() => {
    if (itemCount === 0 && !checkoutSuccess && !isProcessing) {
      console.log('🔄 Carrito vacío, redirigiendo al menú...')
      router.push('/menu')
    }
  }, [itemCount, router, checkoutSuccess, isProcessing])

  // Pre-fill user email if logged in
  useEffect(() => {
    if (user?.email) {
      setCustomerInfo(prev => ({ ...prev, email: user.email }))
    }
  }, [user])

  // Limpiar carrito después de redirección exitosa
  useEffect(() => {
    if (checkoutSuccess) {
      // Dar tiempo para que la redirección se procese
      const timer = setTimeout(() => {
        clearCart()
      }, 100)
      
      return () => clearTimeout(timer)
    }
  }, [checkoutSuccess, clearCart])

  const validateForm = () => {
    let newErrors: { [key: string]: string } = {}
    
    if (shouldUseMeseroCheckout(user)) {
      if (!mesaSeleccionada && !tableInfo.table.trim()) {
        newErrors.table = 'Selecciona una mesa o crea una nueva'
      }
    } else {
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
      
      if (orderType === 'delivery') {
        if (!deliveryInfo.address.trim()) {
          newErrors.address = 'La dirección es requerida'
        }
        // La validación en Maps es opcional - se removió la validación obligatoria
      }
    }
    
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
      let orderData: any
      if (shouldUseMeseroCheckout(user)) {
        orderData = {
          customer_info: customerInfo,
          table: mesaSeleccionada ? mesaSeleccionada : tableInfo.table,
          notes: tableInfo.notes,
          delivery_type: 'dine_in'
        }
      } else {
        orderData = {
          customer_info: customerInfo,
          delivery_address: orderType === 'delivery' ? deliveryInfo.address : null,
          delivery_coordinates: orderType === 'delivery' && coordinates ? 
            `${coordinates.lat},${coordinates.lng}` : null,
          payment_method: paymentMethod,
          notes: deliveryInfo.notes,
          delivery_type: orderType
        }
      }
      
      const result = await createOrder(orderData)
      console.log('🔍 Resultado de createOrder:', result)
      
      if (result.success) {
        console.log('✅ Pedido creado exitosamente, orderId:', result.orderId)
        
        if (shouldUseMeseroCheckout(user)) {
          clearCart()
          router.push('/mesero/mesas-abiertas')
          return
        }
        
        if (paymentMethod === 'mercadopago') {
          console.log('💳 Procesando pago con MercadoPago...')
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
                price: Number(item.price),
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

          const mpData = await mpResponse.json()
          if (mpData.success) {
            console.log('✅ Preferencia de MercadoPago creada, redirigiendo...')
            setCheckoutSuccess(true)
            window.location.href = mpData.initPoint
          } else {
            console.error('❌ Error en MercadoPago:', mpData)
            toast.error('Error', 'No se pudo procesar el pago')
          }
        } else {
          console.log('💰 Pago en efectivo, redirigiendo a thank you...')
          console.log('📋 OrderId recibido:', result.orderId)
          console.log('💳 Payment method:', paymentMethod)
          
          if (!result.orderId) {
            console.error('❌ Error: orderId es undefined o null')
            toast.error('Error', 'No se pudo obtener el ID del pedido')
            return
          }
          
          // Marcar checkout como exitoso ANTES de limpiar carrito
          setCheckoutSuccess(true)
          
          const thankYouUrl = `/orders/thank-you?orderId=${result.orderId}&payment=${paymentMethod}&status=success`
          console.log('🔗 Redirigiendo a:', thankYouUrl)
          
          // Usar window.location.href para navegación forzada
          window.location.href = thankYouUrl
        }
      } else {
        toast.error('Error', result.message || 'No se pudo crear el pedido')
      }
    } catch (error) {
      console.error('Error creating order:', error)
      toast.error('Error', 'No se pudo procesar el pedido')
    } finally {
      setIsProcessing(false)
    }
  }

  const deliveryTotal = orderType === 'delivery' ? total + 25 : total

  if (itemCount === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20 p-8">
          <div className="text-center">
            <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-purple-400" />
            <h2 className="text-2xl font-bold text-white mb-2">Carrito vacío</h2>
            <p className="text-purple-300 mb-4">No tienes productos en tu carrito</p>
            <Button 
              onClick={() => router.push('/menu')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              Ver Menú
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Finalizar Pedido</h1>
          <p className="text-purple-300">Completa tu información para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Customer Info */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Mesa selection for mesero */}
            {shouldUseMeseroCheckout(user) ? (
              <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-white flex items-center">
                    <UserCheck className="h-5 w-5 mr-2" />
                    Selección de Mesa
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {loadingMesas ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                      <span className="ml-2 text-purple-300">Cargando mesas...</span>
                    </div>
                  ) : (
                    <>
                      {mesasAbiertas.length > 0 && (
                        <div>
                          <Label className="text-white">Mesas Abiertas</Label>
                          <div className="grid grid-cols-2 gap-2 mt-2">
                            {mesasAbiertas.map((mesa) => (
                              <Button
                                key={mesa.table_name}
                                type="button"
                                variant={mesaSeleccionada === mesa.table_name ? "default" : "outline"}
                                onClick={() => setMesaSeleccionada(mesa.table_name)}
                                className="text-sm"
                              >
                                {mesa.table_name}
                              </Button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <Label htmlFor="table" className="text-white">Nueva Mesa</Label>
                        <Input
                          id="table"
                          value={tableInfo.table}
                          onChange={(e) => {
                            setTableInfo(prev => ({ ...prev, table: e.target.value }))
                            setMesaSeleccionada('')
                          }}
                          className="bg-white/10 border-purple-300/30 text-white placeholder:text-purple-300"
                          placeholder="Número o nombre de mesa"
                        />
                        {errors.table && (
                          <p className="text-red-400 text-sm mt-1">{errors.table}</p>
                        )}
                      </div>
                      
                      <div>
                        <Label htmlFor="table-notes" className="text-white">Notas (opcional)</Label>
                        <Textarea
                          id="table-notes"
                          value={tableInfo.notes}
                          onChange={(e) => setTableInfo(prev => ({ ...prev, notes: e.target.value }))}
                          className="bg-white/10 border-purple-300/30 text-white placeholder:text-purple-300"
                          placeholder="Notas sobre la mesa o pedido..."
                          rows={2}
                        />
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Customer info for regular users */
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

            {/* Delivery Options - Only for non-mesero users */}
            {!shouldUseMeseroCheckout(user) && (
              <>
                <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center">
                      <Truck className="h-5 w-5 mr-2" />
                      Opciones de Entrega
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup 
                      value={orderType} 
                      onValueChange={(value: 'delivery' | 'pickup') => setOrderType(value)}
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

                    {orderType === 'delivery' && (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="address" className="text-white flex items-center justify-between">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-2" />
                              Dirección de entrega *
                            </div>
                            <span className="text-purple-300 text-xs">Validación GPS opcional</span>
                          </Label>
                          <Input
                            id="address"
                            ref={addressInputRef}
                            value={deliveryInfo.address}
                            onChange={handleAddressChange}
                            className="bg-white/10 border-purple-300/30 text-white placeholder:text-purple-300"
                            placeholder="Escribe tu dirección completa..."
                            autoComplete="off"
                          />
                          {errors.address && (
                            <p className="text-red-400 text-sm mt-1">{errors.address}</p>
                          )}
                          
                          {/* Estado de validación opcional */}
                          {deliveryInfo.address && (
                            <div className="flex items-center justify-between mt-2">
                              {addressValidated ? (
                                <div className="flex items-center text-green-400 text-sm">
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Dirección validada con GPS
                                </div>
                              ) : (
                                <div className="flex items-center text-blue-400 text-sm">
                                  <AlertCircle className="h-4 w-4 mr-2" />
                                  Usa sugerencias para mejor precisión (opcional)
                                </div>
                              )}
                              
                              {!addressValidated && deliveryInfo.address.length > 10 && (
                                <div className="text-green-400 text-sm flex items-center">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Dirección lista
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Información sobre validación opcional */}
                          <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                            <p className="text-blue-300 text-sm">
                              💡 <strong>Tip:</strong> Puedes escribir tu dirección manualmente o usar las sugerencias de Google Maps para mayor precisión.
                            </p>
                          </div>
                        </div>
                        
                        {/* Mapa automático */}
                        {showMap && coordinates && (
                          <div className="space-y-2">
                            <Label className="text-white">Ubicación en el mapa</Label>
                            <div 
                              ref={mapRef}
                              className="w-full h-64 rounded-lg border border-purple-300/30 bg-white/5"
                            />
                            <p className="text-purple-300 text-sm">
                              📍 {validatedAddress}
                            </p>
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
                      </div>
                    )}
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
                      <h4 className="font-medium text-white">{item.name}</h4>
                      <p className="text-sm text-purple-300">${Number(item.price).toFixed(2)} c/u</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="h-8 w-8 p-0 border-purple-500/50 hover:bg-purple-500/20"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-white font-medium w-8 text-center">{item.quantity}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="h-8 w-8 p-0 border-purple-500/50 hover:bg-purple-500/20"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-medium">${(Number(item.price) * item.quantity).toFixed(2)}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Separator className="bg-purple-500/30" />

                <div className="space-y-2">
                  <div className="flex justify-between text-purple-300">
                    <span>Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  {orderType === 'delivery' && (
                    <div className="flex justify-between text-purple-300">
                      <span>Delivery</span>
                      <span>$25.00</span>
                    </div>
                  )}
                  <div className="flex justify-between text-white font-bold text-lg">
                    <span>Total</span>
                    <span>${deliveryTotal.toFixed(2)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Confirmar Pedido
                      <Clock className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  )
}