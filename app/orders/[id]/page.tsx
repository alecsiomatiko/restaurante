"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CheckCircle, Truck, ShoppingBag, MapPin } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

type Order = {
  id: number
  items: any
  total: number
  status: string
  created_at: string
  customer_info: any
  delivery_coordinates?: any
}

type OrderItem = {
  id: string
  name: string
  price: number
  quantity: number
  category?: string
}

export default function OrderDetailPage() {
  const [order, setOrder] = useState<Order | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [customerInfo, setCustomerInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const showSuccess = searchParams.get("success") === "true"
  const { user, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) {
      const redirect = encodeURIComponent(`/orders/${params.id}`)
      router.push(`/login?redirect=${redirect}`)
    }
  }, [authLoading, user, params.id, router])

  useEffect(() => {
    async function fetchOrder() {
      if (!user) {
        return
      }

      try {
        const orderId = params.id

        const response = await fetch(`/api/orders-mysql/${orderId}`, {
          credentials: "include",
        })

        if (!response.ok) {
          throw new Error("Error al cargar el pedido")
        }

        const payload = await response.json()

        if (!payload?.success || !payload?.order) {
          throw new Error("Pedido no encontrado")
        }

        const fetchedOrder = payload.order as Order

        let parsedItems: OrderItem[] = []
        const rawItems = fetchedOrder.items as any

        if (Array.isArray(rawItems)) {
          parsedItems = rawItems as OrderItem[]
        } else if (typeof rawItems === "string") {
          try {
            const data = JSON.parse(rawItems)
            if (Array.isArray(data)) {
              parsedItems = data
            }
          } catch (parseError) {
            console.error("No se pudieron parsear los items del pedido", parseError)
          }
        }

        setOrder(fetchedOrder)
        setItems(parsedItems)
        setCustomerInfo(fetchedOrder.customer_info || null)
      } catch (err: any) {
        setError(err.message || "Error al cargar el pedido")
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchOrder()
    }
  }, [authLoading, params.id, router, user])

  // Verificar si el pedido es rastreable (está en camino o asignado a un repartidor)
  const isTrackable = () => {
    if (!order) return false
    return (
      order.status === "en_camino" ||
      order.status === "asignado_repartidor" ||
      (order.customer_info?.deliveryType === "delivery" &&
        (order.status === "preparando" || order.status === "listo_para_recoger"))
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente":
        return (
          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">Pendiente</span>
        )
      case "preparando":
        return <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">Preparando</span>
      case "listo_para_recoger":
        return (
          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
            Listo para recoger
          </span>
        )
      case "asignado_repartidor":
        return (
          <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
            Repartidor asignado
          </span>
        )
      case "en_camino":
        return (
          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">En camino</span>
        )
      case "entregado":
        return <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">Entregado</span>
      case "cancelado":
        return <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium">Cancelado</span>
      default:
        return <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">{status}</span>
    }
  }

  const getDeliveryTypeBadge = (customerInfo: any) => {
    if (!customerInfo || !customerInfo.deliveryType) return null

    if (customerInfo.deliveryType === "delivery") {
      return (
        <div className="flex items-center text-amber-800">
          <Truck className="mr-2 h-5 w-5" />
          <span>Entrega a domicilio</span>
        </div>
      )
    } else if (customerInfo.deliveryType === "pickup") {
      return (
        <div className="flex items-center text-amber-800">
          <ShoppingBag className="mr-2 h-5 w-5" />
          <span>Recoger en local</span>
        </div>
      )
    }

    return null
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
    } catch (error) {
      return dateString
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-amber-900">Cargando detalles del pedido...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <p className="text-red-600">{error || "No se pudo cargar el pedido"}</p>
          <button
            onClick={() => router.push("/orders")}
            className="mt-4 bg-amber-700 hover:bg-amber-800 text-white py-2 px-4 rounded-md"
          >
            Volver a mis pedidos
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {showSuccess && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded flex items-center">
            <CheckCircle className="mr-2" size={20} />
            <span>¡Tu pedido ha sido realizado con éxito!</span>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Pedido #{order.id}</h1>
              <div className="mt-2 sm:mt-0 flex flex-col sm:flex-row gap-2 sm:items-center">
                {getStatusBadge(order.status)}
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                <span className="font-medium">Fecha:</span> {formatDate(order.created_at)}
              </p>
              {customerInfo && customerInfo.deliveryType && (
                <div className="mt-2">{getDeliveryTypeBadge(customerInfo)}</div>
              )}
            </div>

            {/* Botón de seguimiento */}
            {isTrackable() && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex flex-col sm:flex-row justify-between items-center">
                  <div className="flex items-center mb-3 sm:mb-0">
                    <MapPin className="text-gold-DEFAULT mr-2" size={20} />
                    <span className="text-gray-900 font-medium">¡Sigue tu pedido en tiempo real!</span>
                  </div>
                  <Link
                    href={`/orders/${order.id}/tracking`}
                    className="bg-black hover:bg-gray-800 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    Ver seguimiento
                  </Link>
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Productos</h2>
              <ul className="space-y-3">
                {items.map((item, index) => (
                  <li key={index} className="flex justify-between">
                    <div>
                      <span className="text-gray-900">{item.quantity}x </span>
                      <span className="text-gray-700">{item.name}</span>
                    </div>
                    <span className="text-gray-900 font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between font-bold text-lg text-gray-900">
                <span>Total:</span>
                <span>${Number(order.total).toFixed(2)}</span>
              </div>
            </div>

            {customerInfo && (
              <div className="border-t border-gray-200 pt-4 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Información de entrega</h2>
                <p className="text-gray-700">
                  <span className="font-medium">Nombre:</span> {customerInfo.name}
                </p>
                <p className="text-gray-700">
                  <span className="font-medium">Teléfono:</span> {customerInfo.phone}
                </p>

                {customerInfo.deliveryType === "delivery" && customerInfo.address && (
                  <p className="text-gray-700">
                    <span className="font-medium">Dirección:</span> {customerInfo.address}
                  </p>
                )}

                {customerInfo.deliveryType === "pickup" && customerInfo.pickupTime && (
                  <p className="text-gray-700">
                    <span className="font-medium">Horario de recogida:</span> {customerInfo.pickupTime}
                  </p>
                )}

                {customerInfo.notes && (
                  <p className="text-gray-700">
                    <span className="font-medium">Notas:</span> {customerInfo.notes}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-center mt-6">
              <Link
                href="/orders"
                className="bg-black hover:bg-gray-800 text-white py-2 px-6 rounded-md transition-colors"
              >
                Volver a mis pedidos
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
