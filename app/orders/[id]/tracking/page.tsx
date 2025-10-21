"use client"

import type { ReactElement } from "react"
import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Truck,
  User,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import dynamic from "next/dynamic"

const DeliveryMap = dynamic(() => import("@/components/maps/delivery-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-xl bg-amber-50">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        <span className="text-amber-700">Cargando mapa...</span>
      </div>
    </div>
  ),
})

interface OrderDetails {
  id: number
  status: string
  items: Array<{ id: number; name: string; quantity: number; price: number }>
  total: number
  customer_info?: Record<string, any> | null
  delivery_address?: Record<string, any> | null
  payment_method?: string | null
  created_at: string
}

interface AssignmentDetails {
  id: number
  status: string
  assigned_at: string
  estimated_duration?: number | null
  driver_name?: string | null
  driver_phone?: string | null
  delivery_location?: Record<string, any> | null
}

type IconComponent = (props: { className?: string }) => ReactElement

const STATUS_MAP: Record<string, { label: string; icon: IconComponent }> = {
  pendiente: { label: "Pedido recibido", icon: Clock },
  preparing: { label: "En preparación", icon: Package },
  preparando: { label: "En preparación", icon: Package },
  listo_para_recoger: { label: "Listo para recoger", icon: Package },
  ready: { label: "Listo para recoger", icon: Package },
  asignado_repartidor: { label: "Repartidor asignado", icon: User },
  in_delivery: { label: "En camino", icon: Truck },
  en_camino: { label: "En camino", icon: Truck },
  delivered: { label: "Entregado", icon: CheckCircle },
  entregado: { label: "Entregado", icon: CheckCircle },
  cancelled: { label: "Cancelado", icon: AlertCircle },
  cancelado: { label: "Cancelado", icon: AlertCircle },
}

const STATUS_ORDER: string[] = [
  "pendiente",
  "preparando",
  "listo_para_recoger",
  "asignado_repartidor",
  "en_camino",
  "entregado",
]

const normalizeStatus = (status: string | null | undefined) => {
  if (!status) return "pendiente"
  const lower = status.toLowerCase()
  switch (lower) {
    case "pending":
      return "pendiente"
    case "preparing":
      return "preparando"
    case "ready":
      return "listo_para_recoger"
    case "assigned":
      return "asignado_repartidor"
    case "in_delivery":
      return "en_camino"
    case "delivered":
      return "entregado"
    case "cancelled":
      return "cancelado"
    default:
      return lower
  }
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount)

export default function OrderTrackingPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>("")
  const [refreshing, setRefreshing] = useState(false)
  
  // Estados para tracking en tiempo real del driver
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null)
  const [driverInfo, setDriverInfo] = useState<{name: string, phone: string} | null>(null)
  const [lastLocationUpdate, setLastLocationUpdate] = useState<string | null>(null)
  const [trackingError, setTrackingError] = useState<string | null>(null)

  const orderId = useMemo(() => Number(params.id), [params.id])

  // Función para obtener ubicación del driver
  const fetchDriverLocation = async () => {
    if (!orderId) return

    try {
      const response = await fetch(`/api/driver/location?orderId=${orderId}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.location) {
          setDriverLocation(data.location)
          setDriverInfo({
            name: data.driverName || 'Repartidor',
            phone: data.driverPhone || ''
          })
          setLastLocationUpdate(data.lastUpdate)
          setTrackingError(null)
        } else {
          setDriverLocation(null)
          setDriverInfo(null)
        }
      }
    } catch (error) {
      console.error('Error obteniendo ubicación del driver:', error)
      setTrackingError('Error obteniendo ubicación')
    }
  }

  const fetchData = async () => {
    if (!orderId) {
      setError("Pedido inválido")
      setLoading(false)
      return
    }

    try {
      setError("")

      const [orderRes, assignmentRes] = await Promise.all([
        fetch(`/api/orders-mysql/${orderId}`, { credentials: "include" }),
        fetch(`/api/delivery/assignments?order_id=${orderId}`, { credentials: "include" }),
      ])

      if (orderRes.status === 401) {
        router.push(`/login?redirect=${encodeURIComponent(`/orders/${orderId}/tracking`)}`)
        return
      }

      if (!orderRes.ok) {
        throw new Error("No se pudo cargar el pedido")
      }

      const orderData = await orderRes.json()
      if (!orderData.success || !orderData.order) {
        throw new Error(orderData.error || "Pedido no encontrado")
      }

      setOrder({
        ...orderData.order,
        items: Array.isArray(orderData.order.items) ? orderData.order.items : [],
      })

      if (assignmentRes.ok) {
        const assignmentData = await assignmentRes.json()
        if (assignmentData.success) {
          const assignmentRecord = Array.isArray(assignmentData.assignments)
            ? assignmentData.assignments[0]
            : null
          if (assignmentRecord) {
            setAssignment({
              id: assignmentRecord.id,
              status: assignmentRecord.status,
              assigned_at: assignmentRecord.assigned_at,
              estimated_duration: assignmentRecord.estimated_duration,
              driver_name: assignmentRecord.driver_name,
              driver_phone: assignmentRecord.driver_phone,
              delivery_location: assignmentRecord.delivery_location,
            })
          } else {
            setAssignment(null)
          }
        } else {
          setAssignment(null)
        }
      } else {
        setAssignment(null)
      }
    } catch (err: any) {
      console.error("Error al cargar seguimiento de pedido:", err)
      setError(err.message || "No se pudo cargar la información del pedido")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(`/orders/${params.id}/tracking`)}`)
      return
    }

    setLoading(true)
    void fetchData()

    const interval = setInterval(() => {
      void fetchData()
      // Solo obtener ubicación si hay assignment activo
      if (assignment?.status === 'accepted') {
        void fetchDriverLocation()
      }
    }, 10000) // Actualizar cada 10 segundos

    return () => {
      clearInterval(interval)
    }
  }, [authLoading, user, params.id, assignment?.status])

  // Efecto separado para tracking cuando cambia el assignment
  useEffect(() => {
    if (assignment?.status === 'accepted') {
      void fetchDriverLocation()
      const locationInterval = setInterval(() => {
        void fetchDriverLocation()
      }, 5000) // Actualizar ubicación cada 5 segundos

      return () => clearInterval(locationInterval)
    }
  }, [assignment?.status, orderId])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50">
        <div className="flex items-center gap-3 rounded-xl bg-white px-6 py-4 shadow">
          <Loader2 className="h-5 w-5 animate-spin text-amber-700" />
          <span className="text-amber-800">Cargando seguimiento del pedido…</span>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-amber-50">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />
          <h2 className="mt-3 text-xl font-semibold text-amber-900">No pudimos cargar tu pedido</h2>
          <p className="mt-2 text-amber-700">{error || "Intenta nuevamente en unos minutos."}</p>
          <Link href="/orders" className="mt-4 inline-flex items-center gap-2 text-amber-700 underline">
            Volver a mis pedidos
          </Link>
        </div>
      </div>
    )
  }

  const normalizedStatus = normalizeStatus(order.status)
  const statusInfo = STATUS_MAP[normalizedStatus] || STATUS_MAP.pendiente
  const Icon = statusInfo.icon

  const statusSteps = STATUS_ORDER.map((key) => {
    const normalizedKey = normalizeStatus(key)
    const mapEntry = STATUS_MAP[normalizedKey] || STATUS_MAP.pendiente
    return {
      key: normalizedKey,
      label: mapEntry.label,
    }
  })

  const activeIndex = statusSteps.findIndex((step) => step.key === normalizedStatus)
  const customerInfo = order.customer_info ?? {}
  const deliveryAddress = order.delivery_address ?? {}
  const isDelivery = Boolean(customerInfo?.deliveryType === "delivery" || deliveryAddress)

  const estimatedDelivery = (() => {
    if (!assignment?.estimated_duration) return "Calculando…"
    const minutes = Math.max(1, Math.round(assignment.estimated_duration / 60))
    if (["pendiente", "preparando"].includes(normalizedStatus)) {
      return `${minutes + 15} minutos aprox.`
    }
    if (["listo_para_recoger", "asignado_repartidor", "en_camino"].includes(normalizedStatus)) {
      return `${minutes} minutos aprox.`
    }
    if (["entregado", "cancelado"].includes(normalizedStatus)) {
      return normalizedStatus === "entregado" ? "Pedido entregado" : "Pedido cancelado"
    }
    return `${minutes} minutos aprox.`
  })()

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 py-10">
      <div className="mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <Link href="/orders" className="hover:text-amber-900">
              Mis pedidos
            </Link>
            <span>/</span>
            <span className="font-semibold text-amber-900">Pedido #{order.id}</span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 shadow hover:bg-amber-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-amber-100 bg-white p-6 shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-amber-900">Seguimiento del pedido</h1>
            <p className="text-amber-700">Pedido #{order.id}</p>
            <p className="text-sm text-amber-600">
              Creado el {new Date(order.created_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Icon className="h-6 w-6 text-amber-700" />
            <div>
              <p className="text-xs uppercase text-amber-600">Estado actual</p>
              <p className="text-lg font-semibold text-amber-900">{statusInfo.label}</p>
            </div>
          </div>
        </div>

        <section className="mb-8 rounded-2xl border border-amber-100 bg-white p-6 shadow-lg">
          <h2 className="mb-6 text-lg font-semibold text-amber-900">Progreso del pedido</h2>
          <div className="grid gap-4 md:grid-cols-6">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= activeIndex
              const isCurrent = index === activeIndex
              return (
                <div key={step.key} className="flex flex-col items-center text-center md:items-start md:text-left">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-base font-semibold transition-colors ${
                      isCompleted ? "border-amber-500 bg-amber-500 text-white" : "border-amber-200 text-amber-400"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <p className={`mt-2 text-sm font-medium ${isCurrent ? "text-amber-900" : "text-amber-700"}`}>
                    {step.label}
                  </p>
                  {isCurrent && <p className="text-xs text-amber-600">Estado actual</p>}
                </div>
              )
            })}
          </div>
        </section>

        {isDelivery && ["asignado_repartidor", "en_camino"].includes(normalizedStatus) && (
          <section className="mb-8 rounded-2xl border border-amber-100 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-amber-900">Seguimiento en tiempo real</h2>
              {driverLocation && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600 font-medium">En vivo</span>
                </div>
              )}
            </div>
            
            {/* Información del repartidor */}
            {driverInfo && (
              <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-amber-900">{driverInfo.name}</p>
                      <p className="text-sm text-amber-600">Tu repartidor</p>
                    </div>
                  </div>
                  {driverInfo.phone && (
                    <a 
                      href={`tel:${driverInfo.phone}`}
                      className="flex items-center space-x-2 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="text-sm">Llamar</span>
                    </a>
                  )}
                </div>
                {lastLocationUpdate && (
                  <p className="text-xs text-amber-600 mt-2">
                    Última actualización: {new Date(lastLocationUpdate).toLocaleTimeString('es-MX')}
                  </p>
                )}
              </div>
            )}

            <DeliveryMap
              driverLocation={driverLocation || (assignment?.delivery_location as { lat: number; lng: number } | undefined)}
              deliveryAddress={deliveryAddress?.address || customerInfo?.address || ""}
              driverName={driverInfo?.name || assignment?.driver_name || undefined}
            />
            
            <div className="mt-4 flex items-center justify-center space-x-2 text-sm">
              <RefreshCw className="h-4 w-4 text-amber-600" />
              <span className="text-amber-600">
                {driverLocation ? 'Actualizando cada 5 segundos' : 'El mapa se actualiza automáticamente'}
              </span>
            </div>
            
            {trackingError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {trackingError}
                </p>
              </div>
            )}
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-amber-900">Detalles del pedido</h2>
              {order.items.length === 0 ? (
                <p className="text-amber-700">Aún no hay detalles de productos.</p>
              ) : (
                <ul className="divide-y divide-amber-100">
                  {order.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between py-3 text-sm text-amber-800">
                      <div>
                        <p className="font-medium text-amber-900">{item.name}</p>
                        <p>Cantidad: {item.quantity}</p>
                      </div>
                      <span className="font-semibold text-amber-900">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-amber-100 pt-4 text-lg font-semibold text-amber-900">
                <span>Total pagado</span>
                <span>{formatCurrency(order.total)}</span>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-amber-900">Información del cliente</h2>
              <div className="space-y-3 text-sm text-amber-800">
                <div>
                  <p className="text-xs uppercase text-amber-600">Nombre</p>
                  <p className="font-medium">{customerInfo?.name || "Cliente"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-amber-600">Teléfono</p>
                  <p className="font-medium">{customerInfo?.phone || "No disponible"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-amber-600">Método de pago</p>
                  <p className="font-medium">{order.payment_method || "No especificado"}</p>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-amber-900">Entrega</h2>
              {isDelivery ? (
                <div className="space-y-3 text-sm text-amber-800">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-xs uppercase text-amber-600">Dirección</p>
                      <p className="font-medium">
                        {deliveryAddress?.address || customerInfo?.address || "Dirección no disponible"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div>
                      <p className="text-xs uppercase text-amber-600">Tiempo estimado</p>
                      <p className="font-medium">{estimatedDelivery}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-amber-700">Este pedido se recogerá en el restaurante.</p>
              )}
            </div>

            {assignment && assignment.driver_name && (
              <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-lg">
                <h2 className="mb-4 text-lg font-semibold text-amber-900">Repartidor asignado</h2>
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <User className="h-6 w-6" />
                  </div>
                  <div className="text-sm text-amber-800">
                    <p className="text-base font-semibold text-amber-900">{assignment.driver_name}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-amber-600" />
                      <span>{assignment.driver_phone || "No disponible"}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs uppercase text-amber-600">
                  Asignado el {new Date(assignment.assigned_at).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
