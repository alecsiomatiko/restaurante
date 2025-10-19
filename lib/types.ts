// Tipos para el sistema de repartidores
export type LatLng = {
  lat: number
  lng: number
}

export type DeliveryDriver = {
  id: string
  name: string
  phone: string
  email: string
  isActive: boolean
  currentLocation?: LatLng
  lastUpdated?: string
  currentOrderId?: number | null
  rating?: number
}

export type DeliveryAssignment = {
  id: string
  orderId: number
  driverId: string
  status: "pending" | "accepted" | "rejected" | "completed" | "cancelled"
  assignedAt: string
  acceptedAt?: string
  completedAt?: string
  startLocation: LatLng
  deliveryLocation: LatLng
  estimatedDistance?: number
  estimatedDuration?: number
}

export type OrderStatus =
  | "pendiente"
  | "preparando"
  | "listo_para_recoger"
  | "asignado_repartidor"
  | "en_camino"
  | "entregado"
  | "cancelado"

export type OrderStatusUpdate = {
  id: string
  orderId: number
  status: OrderStatus
  timestamp: string
  note?: string
  driverId?: string
}

export type NotificationType = "order_status" | "driver_assignment" | "pickup_ready" | "delivery_complete"

export type Notification = {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  timestamp: string
  data?: any
}
