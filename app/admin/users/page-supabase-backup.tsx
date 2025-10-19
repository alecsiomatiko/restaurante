"use client"

import { useState, useEffect } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Truck, ShieldCheck, ShieldX, FlagOffIcon as TruckOff } from "lucide-react"

type User = {
  id: string
  username: string
  is_admin: boolean
  created_at: string
  is_driver?: boolean
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function fetchUsers() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session) {
          router.push("/login")
          return
        }

        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })

        if (profilesError) {
          throw profilesError
        }

        const { data: driversData, error: driversError } = await supabase.from("delivery_drivers").select("user_id")

        if (driversError) {
          throw driversError
        }

        const driverIds = new Set(driversData.map((driver) => driver.user_id))

        const usersWithDriverStatus = profilesData.map((profile) => ({
          ...profile,
          is_driver: driverIds.has(profile.id),
        }))

        setUsers(usersWithDriverStatus || [])
      } catch (err: any) {
        console.error("Error al cargar usuarios:", err)
        setError(err.message || "Error al cargar los usuarios")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [supabase, router])

  const updateUserAdminStatus = async (userId: string, isAdmin: boolean) => {
    try {
      setActionLoading(`admin-${userId}`)
      const { error } = await supabase.from("profiles").update({ is_admin: isAdmin }).eq("id", userId)

      if (error) {
        throw error
      }

      setUsers((prevUsers) => prevUsers.map((user) => (user.id === userId ? { ...user, is_admin: isAdmin } : user)))
    } catch (err: any) {
      console.error("Error al actualizar el estado de administrador:", err)
      setError(err.message || "Error al actualizar el estado de administrador")
    } finally {
      setActionLoading(null)
    }
  }

  const updateUserDriverStatus = async (userId: string, isDriver: boolean) => {
    try {
      setActionLoading(`driver-${userId}`)

      if (isDriver) {
        const { data: userData, error: userError } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", userId)
          .single()

        if (userError) {
          throw userError
        }

        const { error: driverError } = await supabase.from("delivery_drivers").insert({
          user_id: userId,
          name: userData.username,
          phone: "Sin especificar",
          email: userData.username,
          is_active: true,
        })

        if (driverError) {
          throw driverError
        }
      } else {
        const { error: driverError } = await supabase.from("delivery_drivers").delete().eq("user_id", userId)

        if (driverError) {
          throw driverError
        }
      }

      setUsers((prevUsers) => prevUsers.map((user) => (user.id === userId ? { ...user, is_driver: isDriver } : user)))
    } catch (err: any) {
      console.error("Error al actualizar el estado de repartidor:", err)
      setError(err.message || "Error al actualizar el estado de repartidor")
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <AdminLayout>
      {error && (
        <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 text-red-300 px-4 py-3 rounded-lg mb-4 relative">
          <span className="block sm:inline">{error}</span>
          <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError("")}>
            <span className="sr-only">Cerrar</span>
            <svg className="h-6 w-6 text-red-400" stroke="currentColor" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="bg-white/5 backdrop-blur-md border border-purple-800/50 rounded-lg shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-purple-800/30">
            <thead className="bg-purple-900/30 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                  Fecha de registro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-purple-200 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white/5 backdrop-blur-sm divide-y divide-purple-800/30">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-purple-300">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-purple-300">
                    No hay usuarios disponibles
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-purple-800/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {user.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">{user.username}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                      {new Date(user.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                      <div className="flex flex-wrap gap-2">
                        {user.is_admin ? (
                          <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-medium flex items-center border border-purple-500/30">
                            <ShieldCheck className="h-3 w-3 mr-1" />
                            Admin
                          </span>
                        ) : null}
                        {user.is_driver ? (
                          <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs font-medium flex items-center border border-blue-500/30">
                            <Truck className="h-3 w-3 mr-1" />
                            Repartidor
                          </span>
                        ) : null}
                        {!user.is_admin && !user.is_driver ? (
                          <span className="bg-gray-500/20 text-gray-300 px-2 py-1 rounded text-xs font-medium border border-gray-500/30">
                            Cliente
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-200">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateUserAdminStatus(user.id, !user.is_admin)}
                          disabled={actionLoading === `admin-${user.id}`}
                          className={`px-3 py-1 rounded text-xs font-medium flex items-center transition-all ${
                            user.is_admin
                              ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/30"
                              : "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                          } ${actionLoading === `admin-${user.id}` ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {user.is_admin ? (
                            <>
                              <ShieldX className="h-3 w-3 mr-1" />
                              Quitar admin
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              Hacer admin
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => updateUserDriverStatus(user.id, !user.is_driver)}
                          disabled={actionLoading === `driver-${user.id}`}
                          className={`px-3 py-1 rounded text-xs font-medium flex items-center transition-all ${
                            user.is_driver
                              ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 border border-blue-500/30"
                              : "bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
                          } ${actionLoading === `driver-${user.id}` ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {user.is_driver ? (
                            <>
                              <TruckOff className="h-3 w-3 mr-1" />
                              Quitar repartidor
                            </>
                          ) : (
                            <>
                              <Truck className="h-3 w-3 mr-1" />
                              Hacer repartidor
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
