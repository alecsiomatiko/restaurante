"use client"

import { type ReactNode, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminNav from "./admin-nav"
import OrderNotifications from "./order-notifications"
import { useAuth } from "@/hooks/use-auth"

export function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // Handle redirects in useEffect to avoid infinite loops
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        console.log("No user found, redirecting to login...")
        router.push("/login?redirect=admin")
        return
      }
      
      if (!user.is_admin) {
        console.log("User is not admin, redirecting to home...")
        router.push("/")
        return
      }
    }
  }, [user, isLoading, router])

  // Si está cargando, mostrar loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black flex items-center justify-center">
        <div className="bg-black/50 backdrop-blur-md p-8 rounded-lg shadow-xl border border-purple-800/50">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
            <p className="text-white">Verificando permisos...</p>
          </div>
        </div>
      </div>
    )
  }

  // Si no hay usuario o no es admin, mostrar loading mientras se redirige
  if (!user || !user.is_admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black flex items-center justify-center">
        <div className="bg-black/50 backdrop-blur-md p-8 rounded-lg shadow-xl border border-purple-800/50">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
            <p className="text-white">Redirigiendo...</p>
          </div>
        </div>
      </div>
    )
  }

  // Usuario autenticado y es admin, renderizar el layout
  return (
    <div className="flex h-screen bg-gradient-to-br from-black via-purple-900 to-black">
      {/* Sidebar */}
      <div className="w-64 bg-black/50 backdrop-blur-md shadow-2xl border-r border-purple-800/50">
        <div className="p-6 border-b border-purple-800/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Panel Admin</h1>
              <p className="text-sm text-purple-300">Supernova</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <AdminNav />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </div>

      {/* Componente de notificaciones */}
      <OrderNotifications />
    </div>
  )
}

// También añadimos la exportación por defecto para mantener compatibilidad con el código existente
export default function DefaultAdminLayout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
