"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ShoppingBag, ArrowLeft } from "lucide-react"

type Order = {
  id: number
  items: any
  total: number
  status: string
  created_at: string
  customer_info: any
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchOrders() {
      try {
        // Verificar sesión
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push("/login?redirect=orders")
          return
        }

        // Obtener pedidos del usuario
        const { data, error: ordersError } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })

        if (ordersError) {
          throw ordersError
        }

        setOrders(data || [])
      } catch (err: any) {
        console.error("Error al cargar los pedidos:", err)
        setError(err.message || "Error al cargar los pedidos")
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
  }, [router, supabase])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente":
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">Pendiente</Badge>
      case "preparando":
        return <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">Preparando</Badge>
      case "en_camino":
        return <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">En camino</Badge>
      case "entregado":
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30">Entregado</Badge>
      case "cancelado":
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">Cancelado</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-300 border-gray-500/30">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })
    } catch (error) {
      return dateString
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950/50 to-black/50 backdrop-blur flex items-center justify-center">
        <Card className="bg-black/50 border-purple-800 backdrop-blur">
          <CardContent className="p-8 flex items-center space-x-4">
            <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
            <span className="text-white">Cargando pedidos...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-950/50 to-black/50 backdrop-blur flex items-center justify-center">
        <Card className="bg-black/50 border-red-800 backdrop-blur">
          <CardContent className="p-8 text-center">
            <p className="text-red-400 mb-4">{error}</p>
            <Button onClick={() => router.push("/menu")} className="bg-purple-600 hover:bg-purple-700 text-white">
              Volver al menú
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
              Mis Pedidos Estelares
            </h1>
            <p className="text-gray-400">Historial de tus pedidos y su estado actual</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <Card className="bg-black/50 border-purple-800 backdrop-blur">
            <CardContent className="p-8 text-center">
              <ShoppingBag className="h-16 w-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No tienes pedidos realizados</h3>
              <p className="text-gray-400 mb-6">¡Es hora de probar nuestras hamburguesas espaciales!</p>
              <Button
                onClick={() => router.push("/menu")}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
              >
                Explorar Menú
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="bg-black/50 border-purple-800 backdrop-blur hover:border-purple-600 transition-all"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white">Pedido #{order.id}</CardTitle>
                      <p className="text-gray-400 text-sm">{formatDate(order.created_at)}</p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(order.status)}
                      <p className="text-orange-400 font-bold text-lg mt-1">${order.total.toFixed(2)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="text-gray-400">{order.items?.length || 0} producto(s)</div>
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-purple-400 hover:text-purple-300 underline transition-colors"
                    >
                      Ver detalles
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
