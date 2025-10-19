"use client"

import { useState, useEffect } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { createClient } from "@/lib/supabase/client"
import { Clock, CheckCircle, Truck, AlertCircle, Package, ShoppingBag, MessageSquare } from "lucide-react"
import Link from "next/link"

type Order = {
  id: number
  user_id: string
  items: any
  total: number
  status: string
  created_at: string
  customer_info: any
  username?: string
  created_from?: string
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<string>("all")
  const supabase = createClient()

  useEffect(() => {
    async function fetchOrders() {
      try {
        // Obtener todos los pedidos
        const { data: orders, error: ordersError } = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })

        if (ordersError) throw ordersError

        // Obtener información de usuarios para cada pedido
        const ordersWithUsernames = await Promise.all(
          orders.map(async (order) => {
            if (!order.user_id) return { ...order, username: "Usuario anónimo" }

            const { data: profile } = await supabase
              .from("profiles")
              .select("username")
              .eq("id", order.user_id)
              .single()

            return {
              ...order,
              username: profile?.username || "Usuario desconocido",
            }
          }),
        )

        setOrders(ordersWithUsernames)
      } catch (err: any) {
        console.error("Error al cargar pedidos:", err)
        setError(err.message || "Error al cargar los pedidos")
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [supabase])

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const { error } = await supabase.from("orders").update({ status }).eq("id", orderId)

      if (error) throw error

      // Actualizar la lista de pedidos
      setOrders((prevOrders) => prevOrders.map((order) => (order.id === orderId ? { ...order, status } : order)))
    } catch (error) {
      console.error("Error al actualizar el estado del pedido:", error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pendiente":
        return <Clock className="h-5 w-5 text-yellow-400" />
      case "preparando":
        return <Package className="h-5 w-5 text-blue-400" />
      case "en_camino":
        return <Truck className="h-5 w-5 text-purple-400" />
      case "entregado":
        return <CheckCircle className="h-5 w-5 text-green-400" />
      case "cancelado":
        return <AlertCircle className="h-5 w-5 text-red-400" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getDeliveryTypeIcon = (order: Order) => {
    if (!order.customer_info || !order.customer_info.deliveryType) return null

    if (order.customer_info.deliveryType === "delivery") {
      return <Truck className="h-5 w-5 text-purple-400" title="Entrega a domicilio" />
    } else if (order.customer_info.deliveryType === "pickup") {
      return <ShoppingBag className="h-5 w-5 text-green-400" title="Recoger en local" />
    }

    return null
  }

  const getSourceIcon = (order: Order) => {
    // Verificar si la fuente está en customer_info
    if (order.customer_info?.source === "chat-whatsapp") {
      return <MessageSquare className="h-5 w-5 text-green-400" title="Creado desde WhatsApp/chat sin autenticación" />
    } else if (order.created_from === "chat") {
      return <MessageSquare className="h-5 w-5 text-blue-400" title="Creado desde el chat" />
    }
    return null
  }

  const filteredOrders = filter === "all" ? orders : orders.filter((order) => order.status === filter)

  return (
    <AdminLayout>
      {/* Filtros */}
      <div className="mb-6 bg-black/50 backdrop-blur-md p-4 rounded-lg shadow-xl border border-purple-800/50">
        <h2 className="text-lg font-medium text-white mb-3">Filtrar por estado:</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md transition-all ${
              filter === "all"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                : "bg-purple-900/30 text-purple-200 hover:bg-purple-800/50 border border-purple-700/50"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter("pendiente")}
            className={`px-4 py-2 rounded-md transition-all ${
              filter === "pendiente"
                ? "bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-lg"
                : "bg-yellow-900/30 text-yellow-200 hover:bg-yellow-800/50 border border-yellow-700/50"
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter("preparando")}
            className={`px-4 py-2 rounded-md transition-all ${
              filter === "preparando"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                : "bg-blue-900/30 text-blue-200 hover:bg-blue-800/50 border border-blue-700/50"
            }`}
          >
            Preparando
          </button>
          <button
            onClick={() => setFilter("en_camino")}
            className={`px-4 py-2 rounded-md transition-all ${
              filter === "en_camino"
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
                : "bg-purple-900/30 text-purple-200 hover:bg-purple-800/50 border border-purple-700/50"
            }`}
          >
            En camino
          </button>
          <button
            onClick={() => setFilter("entregado")}
            className={`px-4 py-2 rounded-md transition-all ${
              filter === "entregado"
                ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                : "bg-green-900/30 text-green-200 hover:bg-green-800/50 border border-green-700/50"
            }`}
          >
            Entregados
          </button>
          <button
            onClick={() => setFilter("cancelado")}
            className={`px-4 py-2 rounded-md transition-all ${
              filter === "cancelado"
                ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg"
                : "bg-red-900/30 text-red-200 hover:bg-red-800/50 border border-red-700/50"
            }`}
          >
            Cancelados
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 backdrop-blur-md border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-black/50 backdrop-blur-md p-8 rounded-lg shadow-xl border border-purple-800/50 text-center">
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
            <p className="text-purple-200">Cargando pedidos...</p>
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-black/50 backdrop-blur-md p-8 rounded-lg shadow-xl border border-purple-800/50 text-center">
          <p className="text-purple-200">No hay pedidos {filter !== "all" ? `con estado "${filter}"` : ""}</p>
        </div>
      ) : (
        <div className="bg-black/50 backdrop-blur-md rounded-lg shadow-xl border border-purple-800/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-purple-800/50">
              <thead className="bg-purple-900/30">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Pedido #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Origen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-800/30">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-purple-900/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">#{order.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                      {order.customer_info?.name || order.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                      {new Date(order.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">${order.total.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getDeliveryTypeIcon(order)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getSourceIcon(order)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(order.status)}
                        <span className="ml-2 text-sm text-purple-200">
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                      <select
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        className="bg-purple-900/50 border border-purple-700/50 rounded px-2 py-1 text-sm text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="preparando">Preparando</option>
                        <option value="en_camino">En camino</option>
                        <option value="entregado">Entregado</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-3 py-1 rounded text-sm transition-all"
                      >
                        Ver detalles
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
