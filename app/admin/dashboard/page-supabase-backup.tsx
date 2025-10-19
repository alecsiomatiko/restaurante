"use client"

import { useState, useEffect } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { createClient } from "@/lib/supabase/client"

type OrderStats = {
  total: number
  pending: number
  preparing: number
  delivered: number
  canceled: number
  todayTotal: number
  weekTotal: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<OrderStats>({
    total: 0,
    pending: 0,
    preparing: 0,
    delivered: 0,
    canceled: 0,
    todayTotal: 0,
    weekTotal: 0,
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchStats() {
      try {
        // Obtener todos los pedidos
        const { data: orders, error } = await supabase.from("orders").select("*")

        if (error) throw error

        // Calcular estadísticas
        const now = new Date()
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString()

        const stats: OrderStats = {
          total: orders.length,
          pending: orders.filter((o) => o.status === "pendiente").length,
          preparing: orders.filter((o) => o.status === "preparando").length,
          delivered: orders.filter((o) => o.status === "entregado").length,
          canceled: orders.filter((o) => o.status === "cancelado").length,
          todayTotal: orders.filter((o) => o.created_at >= today).length,
          weekTotal: orders.filter((o) => o.created_at >= weekAgo).length,
        }

        setStats(stats)
      } catch (error) {
        console.error("Error al cargar estadísticas:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [supabase])

  return (
    <AdminLayout>
      <div className="bg-black/50 backdrop-blur-md rounded-lg shadow-xl p-6 border border-purple-800/50">
        <h2 className="text-xl font-bold text-white mb-6">Resumen de Pedidos</h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
            <p className="text-purple-300 ml-3">Cargando estadísticas...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 p-6 rounded-lg border border-purple-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-2">Total de Pedidos</h3>
              <p className="text-3xl font-bold text-purple-300">{stats.total}</p>
            </div>

            <div className="bg-gradient-to-br from-yellow-600/20 to-orange-600/20 p-6 rounded-lg border border-yellow-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-2">Pedidos Pendientes</h3>
              <p className="text-3xl font-bold text-yellow-300">{stats.pending}</p>
            </div>

            <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 p-6 rounded-lg border border-blue-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-2">En Preparación</h3>
              <p className="text-3xl font-bold text-blue-300">{stats.preparing}</p>
            </div>

            <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 p-6 rounded-lg border border-green-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-2">Entregados</h3>
              <p className="text-3xl font-bold text-green-300">{stats.delivered}</p>
            </div>

            <div className="bg-gradient-to-br from-red-600/20 to-pink-600/20 p-6 rounded-lg border border-red-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-2">Cancelados</h3>
              <p className="text-3xl font-bold text-red-300">{stats.canceled}</p>
            </div>

            <div className="bg-gradient-to-br from-purple-600/20 to-indigo-600/20 p-6 rounded-lg border border-purple-500/30 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-white mb-2">Pedidos de Hoy</h3>
              <p className="text-3xl font-bold text-purple-300">{stats.todayTotal}</p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
