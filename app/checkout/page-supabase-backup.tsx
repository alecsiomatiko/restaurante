"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useCart } from "@/components/cart/cart-provider"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CreditCard, Truck, Info, ShoppingBag, ArrowLeft, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Tipo de entrega
type DeliveryType = "delivery" | "pickup"

export default function CheckoutPage() {
  const { items, totalPrice, clearCart } = useCart()
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("delivery")
  const [pickupTime, setPickupTime] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  // Verificar si el usuario está autenticado
  useEffect(() => {
    async function checkAuth() {
      try {
        setIsCheckingAuth(true)

        // Verificar sesión
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          console.log("Usuario no autenticado, redirigiendo a login")
          router.push("/login?redirect=checkout")
          return
        }

        setIsLoggedIn(true)
      } catch (error) {
        console.error("Error al verificar autenticación:", error)
        router.push("/login?redirect=checkout")
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  // Redirigir si el carrito está vacío
  useEffect(() => {
    if (!isCheckingAuth && items.length === 0) {
      router.push("/menu")
    }
  }, [items, router, isCheckingAuth])

  // Generar opciones de horario para recoger
  const generatePickupTimeOptions = () => {
    const options = []
    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()

    // Restaurante abierto de 13:00 (1 PM) a 21:00 (9 PM)
    const openingHour = 13
    const closingHour = 21

    // Si estamos fuera del horario de servicio, mostrar horarios para mañana
    const isAfterHours = currentHour >= closingHour
    const isTooEarly = currentHour < openingHour - 1 // 1 hora antes de abrir

    // Determinar la fecha para las opciones
    const dateForOptions = new Date()
    if (isAfterHours) {
      // Si es después del cierre, mostrar opciones para mañana
      dateForOptions.setDate(dateForOptions.getDate() + 1)
    }

    // Formatear la fecha
    const dateStr = dateForOptions.toLocaleDateString("es-MX", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })

    // Hora de inicio para las opciones
    let startHour = openingHour
    let startMinute = 0

    // Si es hoy y estamos en horario de servicio, ajustar la hora de inicio
    if (!isAfterHours && !isTooEarly && currentHour >= openingHour - 1) {
      startHour = currentHour
      // Redondear al siguiente intervalo de 30 minutos y añadir 30 minutos para preparación
      startMinute = currentMinute <= 30 ? 30 : 0
      if (startMinute === 0) startHour += 1
      startHour += 1 // Añadir 1 hora para preparación

      // Si la hora de inicio calculada es después del cierre, no mostrar opciones para hoy
      if (startHour >= closingHour) {
        return [
          <option key="no-today" value="">
            No hay horarios disponibles hoy
          </option>,
        ]
      }
    }

    // Generar opciones cada 30 minutos
    for (let hour = startHour; hour < closingHour; hour++) {
      for (let minute = hour === startHour ? startMinute : 0; minute < 60; minute += 30) {
        if (hour === closingHour - 1 && minute > 0) continue // No mostrar opciones después de la hora de cierre

        const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        const displayTime = `${dateStr} a las ${timeStr}`
        options.push(
          <option key={timeStr} value={displayTime}>
            {displayTime}
          </option>,
        )
      }
    }

    return options
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Validar campos según el tipo de entrega
      if (!name || !phone) {
        throw new Error("Por favor completa todos los campos requeridos")
      }

      if (deliveryType === "delivery" && !address) {
        throw new Error("La dirección es requerida para entregas a domicilio")
      }

      if (deliveryType === "pickup" && !pickupTime) {
        throw new Error("Por favor selecciona un horario para recoger tu pedido")
      }

      // Verificar sesión actual
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login?redirect=checkout")
        return
      }

      // Crear objeto con información del cliente según el tipo de entrega
      const customerInfo = {
        name,
        phone,
        deliveryType,
        ...(deliveryType === "delivery" ? { address } : { pickupTime }),
        notes,
      }

      // Crear nuevo pedido
      const { data, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: session.user.id,
          items: items,
          total: totalPrice,
          customer_info: customerInfo,
        })
        .select()
        .single()

      if (orderError) {
        throw orderError
      }

      // Limpiar carrito y redirigir a página de confirmación
      clearCart()
      router.push(`/orders/${data.id}?success=true`)
    } catch (err: any) {
      console.error("Error al procesar pedido:", err)
      setError(err.message || "Error al procesar el pedido")
    } finally {
      setLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950/50 to-black/50 backdrop-blur flex items-center justify-center">
        <Card className="bg-black/50 border-purple-800 backdrop-blur">
          <CardContent className="p-8 flex items-center space-x-4">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            <span className="text-white">Verificando autenticación...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isLoggedIn || items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950/50 to-black/50 backdrop-blur flex items-center justify-center">
        <Card className="bg-black/50 border-purple-800 backdrop-blur">
          <CardContent className="p-8 text-center">
            <ShoppingBag className="h-16 w-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Carrito Vacío</h3>
            <p className="text-gray-400 mb-6">Agrega algunas hamburguesas espaciales a tu carrito</p>
            <Button
              onClick={() => router.push("/menu")}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              Explorar Menú
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-950/50 to-black/50 backdrop-blur py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4 text-purple-400 hover:text-purple-300">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
              Finalizar Pedido Espacial
            </h1>
            <p className="text-gray-400">Completa la información para recibir tus sabores galácticos</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario de envío */}
          <Card className="bg-black/50 border-purple-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-4 bg-red-500/20 border-red-500/30 text-red-300">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de entrega */}
                <div>
                  <Label className="text-white mb-3 block">Tipo de entrega</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setDeliveryType("delivery")}
                      className={`flex items-center justify-center p-4 rounded-lg border-2 transition-all ${
                        deliveryType === "delivery"
                          ? "border-purple-500 bg-purple-500/20 text-purple-300"
                          : "border-purple-800 bg-purple-900/20 text-gray-400 hover:bg-purple-800/30"
                      }`}
                    >
                      <Truck className="mr-2 h-5 w-5" />
                      <span className="font-medium">A domicilio</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType("pickup")}
                      className={`flex items-center justify-center p-4 rounded-lg border-2 transition-all ${
                        deliveryType === "pickup"
                          ? "border-purple-500 bg-purple-500/20 text-purple-300"
                          : "border-purple-800 bg-purple-900/20 text-gray-400 hover:bg-purple-800/30"
                      }`}
                    >
                      <ShoppingBag className="mr-2 h-5 w-5" />
                      <span className="font-medium">Recoger en local</span>
                    </button>
                  </div>
                </div>

                {/* Información de contacto */}
                <div>
                  <Label htmlFor="name" className="text-white">
                    Nombre completo <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-purple-900/20 border-purple-800 text-white placeholder:text-gray-400"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white">
                    Teléfono <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-purple-900/20 border-purple-800 text-white placeholder:text-gray-400"
                    required
                  />
                </div>

                {/* Campos específicos según el tipo de entrega */}
                {deliveryType === "delivery" ? (
                  <div>
                    <Label htmlFor="address" className="text-white">
                      Dirección de entrega <span className="text-red-400">*</span>
                    </Label>
                    <Textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="bg-purple-900/20 border-purple-800 text-white placeholder:text-gray-400"
                      rows={3}
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <Label htmlFor="pickupTime" className="text-white">
                      Horario para recoger <span className="text-red-400">*</span>
                    </Label>
                    <select
                      id="pickupTime"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full px-3 py-2 bg-purple-900/20 border border-purple-800 rounded-md text-white"
                      required
                    >
                      <option value="">Selecciona un horario</option>
                      {generatePickupTimeOptions()}
                    </select>
                    <p className="text-xs text-gray-400 mt-1">Horario de atención: 1:00 PM a 9:00 PM</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="notes" className="text-white">
                    Notas adicionales (opcional)
                  </Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="bg-purple-900/20 border-purple-800 text-white placeholder:text-gray-400"
                    rows={2}
                    placeholder="Instrucciones especiales, referencias para llegar, etc."
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    "Confirmar Pedido Espacial"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Resumen del pedido */}
          <Card className="bg-black/50 border-purple-800 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-white">Resumen del Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-b border-purple-800 pb-4 mb-4">
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li key={item.id} className="flex justify-between">
                      <div>
                        <span className="text-purple-300">{item.quantity}x </span>
                        <span className="text-white">{item.name}</span>
                      </div>
                      <span className="text-orange-400 font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-between font-bold text-lg text-white mb-6">
                <span>Total:</span>
                <span className="text-orange-400">${totalPrice.toFixed(2)}</span>
              </div>

              {/* Información de pago */}
              <div className="bg-purple-900/20 p-4 rounded-md space-y-4">
                <div className="flex items-start">
                  <CreditCard className="text-purple-400 mr-2 mt-1 flex-shrink-0" size={18} />
                  <div>
                    <h3 className="font-medium text-white">Método de pago:</h3>
                    <p className="text-gray-400 text-sm">
                      <strong>Efectivo al momento de la entrega</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  {deliveryType === "delivery" ? (
                    <>
                      <Truck className="text-purple-400 mr-2 mt-1 flex-shrink-0" size={18} />
                      <div>
                        <h3 className="font-medium text-white">Tiempo de entrega:</h3>
                        <p className="text-gray-400 text-sm">30-45 minutos dependiendo de tu ubicación</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="text-purple-400 mr-2 mt-1 flex-shrink-0" size={18} />
                      <div>
                        <h3 className="font-medium text-white">Recoger en local:</h3>
                        <p className="text-gray-400 text-sm">Av. Galáctica #2025, Sector Supernova</p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-start">
                  <Info className="text-purple-400 mr-2 mt-1 flex-shrink-0" size={18} />
                  <div>
                    <h3 className="font-medium text-white">Importante:</h3>
                    {deliveryType === "delivery" ? (
                      <p className="text-gray-400 text-sm">
                        Por favor ten el pago exacto listo para facilitar la entrega.
                      </p>
                    ) : (
                      <p className="text-gray-400 text-sm">
                        Tu pedido estará listo para recoger en el horario seleccionado.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <Link href="/menu" className="text-purple-400 hover:text-purple-300 underline">
                  Volver al menú
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
