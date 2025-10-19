"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default function AuthDebugPage() {
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Estado para crear administrador
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")

  // Estado para gestión de usuarios
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)

  // Estado para crear/editar usuario
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserPassword, setNewUserPassword] = useState("")
  const [newUserName, setNewUserName] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDriver, setIsDriver] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  const supabase = createClient()
  const supabaseAuth = createClientComponentClient()

  useEffect(() => {
    checkSession()
  }, [])

  async function checkSession() {
    try {
      setLoading(true)

      // Verificar sesión de Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession()

      // Verificar sesión de API
      const apiResponse = await fetch("/api/auth")
      const apiData = await apiResponse.json()

      setSessionInfo({
        supabaseSession: session,
        apiSession: apiData,
      })
    } catch (err: any) {
      setError(err.message || "Error al verificar sesión")
    } finally {
      setLoading(false)
    }
  }

  async function createAdmin() {
    try {
      setError("")
      setSuccess("")

      if (!email || !password) {
        setError("Email y contraseña son requeridos")
        return
      }

      const response = await fetch("/api/admin/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          username: username || email.split("@")[0],
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al crear administrador")
      }

      setSuccess(`Administrador creado exitosamente: ${email}`)
      setEmail("")
      setPassword("")
      setUsername("")

      // Actualizar la sesión
      checkSession()
    } catch (err: any) {
      setError(err.message || "Error al crear administrador")
    }
  }

  // Funciones para gestión de usuarios
  async function fetchUsers() {
    try {
      setLoadingUsers(true)
      setError("")

      const {
        data: { users: authUsers },
        error: authError,
      } = await supabase.auth.admin.listUsers()

      if (authError) {
        throw new Error(authError.message)
      }

      // Obtener perfiles
      const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*")

      if (profilesError) {
        throw new Error(profilesError.message)
      }

      // Obtener conductores
      const { data: drivers, error: driversError } = await supabase.from("delivery_drivers").select("*")

      if (driversError) {
        throw new Error(driversError.message)
      }

      // Mapear conductores por user_id
      const driversMap =
        drivers?.reduce(
          (acc, driver) => {
            acc[driver.user_id] = driver
            return acc
          },
          {} as Record<string, any>,
        ) || {}

      // Mapear perfiles por id
      const profilesMap =
        profiles?.reduce(
          (acc, profile) => {
            acc[profile.id] = profile
            return acc
          },
          {} as Record<string, any>,
        ) || {}

      // Combinar datos
      const combinedUsers = authUsers.map((user) => ({
        id: user.id,
        email: user.email,
        username: profilesMap[user.id]?.username || user.email?.split("@")[0] || "Sin nombre",
        isAdmin: profilesMap[user.id]?.is_admin || false,
        isDriver: !!driversMap[user.id],
        driverInfo: driversMap[user.id] || null,
        createdAt: user.created_at,
      }))

      setUsers(combinedUsers)
    } catch (err: any) {
      setError(err.message || "Error al cargar usuarios")
    } finally {
      setLoadingUsers(false)
    }
  }

  async function createUser() {
    try {
      setError("")
      setSuccess("")

      if (!newUserEmail || !newUserPassword) {
        setError("Email y contraseña son requeridos")
        return
      }

      // 1. Crear usuario en Auth
      const { data: authData, error: authError } = await supabaseAuth.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true,
      })

      if (authError) {
        throw new Error(authError.message)
      }

      const userId = authData.user.id

      // 2. Crear perfil
      const { error: profileError } = await supabase.from("profiles").insert({
        id: userId,
        username: newUserName || newUserEmail.split("@")[0],
        is_admin: isAdmin,
      })

      if (profileError) {
        throw new Error(profileError.message)
      }

      // 3. Si es conductor, crear entrada en delivery_drivers
      if (isDriver) {
        const { error: driverError } = await supabase.from("delivery_drivers").insert({
          user_id: userId,
          name: newUserName || newUserEmail.split("@")[0],
          phone: "123456789", // Valor por defecto
          email: newUserEmail,
          is_active: true,
        })

        if (driverError) {
          throw new Error(driverError.message)
        }
      }

      setSuccess(`Usuario creado exitosamente: ${newUserEmail}`)
      resetNewUserForm()
      fetchUsers()
    } catch (err: any) {
      setError(err.message || "Error al crear usuario")
    }
  }

  async function updateUserRole(userId: string, updates: any) {
    try {
      setError("")
      setSuccess("")

      // Actualizar perfil si es necesario
      if (updates.isAdmin !== undefined || updates.removeAdmin) {
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ is_admin: updates.removeAdmin ? false : updates.isAdmin })
          .eq("id", userId)

        if (profileError) {
          throw new Error(profileError.message)
        }
      }

      // Manejar rol de conductor
      if (updates.isDriver) {
        // Verificar si ya existe
        const { data: existingDriver } = await supabase
          .from("delivery_drivers")
          .select("*")
          .eq("user_id", userId)
          .maybeSingle()

        if (existingDriver) {
          // Actualizar conductor existente
          const { error: updateError } = await supabase
            .from("delivery_drivers")
            .update({
              is_active: true,
            })
            .eq("user_id", userId)

          if (updateError) {
            throw new Error(updateError.message)
          }
        } else {
          // Obtener email del usuario
          const { data: userData } = await supabase.auth.admin.getUserById(userId)
          const email = userData?.user?.email || ""

          // Crear nuevo conductor
          const { error: insertError } = await supabase.from("delivery_drivers").insert({
            user_id: userId,
            name: email.split("@")[0],
            phone: "123456789", // Valor por defecto
            email,
            is_active: true,
          })

          if (insertError) {
            throw new Error(insertError.message)
          }
        }
      } else if (updates.removeDriver) {
        // Desactivar conductor
        const { error: updateError } = await supabase
          .from("delivery_drivers")
          .update({ is_active: false })
          .eq("user_id", userId)

        if (updateError) {
          throw new Error(updateError.message)
        }
      }

      setSuccess("Usuario actualizado correctamente")
      fetchUsers()
    } catch (err: any) {
      setError(err.message || "Error al actualizar usuario")
    }
  }

  function resetNewUserForm() {
    setNewUserEmail("")
    setNewUserPassword("")
    setNewUserName("")
    setIsAdmin(false)
    setIsDriver(false)
    setEditingUserId(null)
  }

  function toggleUserManagement() {
    const newState = !showUserManagement
    setShowUserManagement(newState)
    if (newState) {
      fetchUsers()
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900">Diagnóstico de Autenticación</h1>
          <p className="mt-2 text-amber-800">Verifica el estado de la sesión y gestiona usuarios</p>
        </div>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{success}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Información de sesión */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-amber-900 mb-4">Estado de la Sesión</h2>
            {loading ? (
              <p className="text-amber-800">Cargando información de sesión...</p>
            ) : (
              <div>
                <h3 className="font-semibold text-amber-900 mb-2">Sesión de Supabase:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
                  {sessionInfo?.supabaseSession
                    ? JSON.stringify(sessionInfo.supabaseSession, null, 2)
                    : "No hay sesión activa"}
                </pre>

                <h3 className="font-semibold text-amber-900 mt-4 mb-2">Sesión de API:</h3>
                <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-40">
                  {JSON.stringify(sessionInfo?.apiSession, null, 2)}
                </pre>

                <button
                  onClick={checkSession}
                  className="mt-4 bg-amber-600 hover:bg-amber-700 text-white py-2 px-4 rounded-md transition-colors"
                >
                  Actualizar Sesión
                </button>
              </div>
            )}
          </div>

          {/* Crear administrador */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-amber-900 mb-4">Crear Administrador</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-amber-800 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-amber-800 mb-2">
                  Contraseña
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-amber-800 mb-2">
                  Nombre de usuario (opcional)
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                onClick={createAdmin}
                className="bg-amber-700 hover:bg-amber-800 text-white py-2 px-4 rounded-md transition-colors"
              >
                Crear Administrador
              </button>
            </div>
          </div>
        </div>

        {/* Botón para mostrar/ocultar gestión de usuarios */}
        <div className="mt-8 text-center">
          <button
            onClick={toggleUserManagement}
            className="bg-amber-600 hover:bg-amber-700 text-white py-2 px-6 rounded-md transition-colors"
          >
            {showUserManagement ? "Ocultar Gestión de Usuarios" : "Mostrar Gestión de Usuarios"}
          </button>
        </div>

        {/* Sección de gestión de usuarios */}
        {showUserManagement && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Crear nuevo usuario */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold text-amber-900 mb-4">
                {editingUserId ? "Editar Usuario" : "Crear Nuevo Usuario"}
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="newUserEmail" className="block text-amber-800 mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    id="newUserEmail"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label htmlFor="newUserPassword" className="block text-amber-800 mb-2">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    id="newUserPassword"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label htmlFor="newUserName" className="block text-amber-800 mb-2">
                    Nombre de usuario (opcional)
                  </label>
                  <input
                    type="text"
                    id="newUserName"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isAdmin}
                      onChange={(e) => setIsAdmin(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-amber-800">Es Administrador</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={isDriver}
                      onChange={(e) => setIsDriver(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-amber-800">Es Repartidor</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={createUser}
                    className="bg-amber-700 hover:bg-amber-800 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    {editingUserId ? "Guardar Cambios" : "Crear Usuario"}
                  </button>

                  {editingUserId && (
                    <button
                      onClick={resetNewUserForm}
                      className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Lista de usuarios */}
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold text-amber-900 mb-4">Usuarios Existentes</h2>
              {loadingUsers ? (
                <p className="text-amber-800">Cargando usuarios...</p>
              ) : users.length === 0 ? (
                <p className="text-amber-800">No hay usuarios registrados</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-amber-200">
                    <thead className="bg-amber-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                          Usuario
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                          Roles
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-amber-200">
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-amber-900">{user.username}</div>
                            <div className="text-xs text-amber-700">{user.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {user.isAdmin && (
                                <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                                  Admin
                                </span>
                              )}
                              {user.isDriver && (
                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                  Repartidor
                                </span>
                              )}
                              {!user.isAdmin && !user.isDriver && (
                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                                  Usuario
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {!user.isAdmin && (
                                <button
                                  onClick={() => updateUserRole(user.id, { isAdmin: true })}
                                  className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                                >
                                  Hacer Admin
                                </button>
                              )}
                              {user.isAdmin && (
                                <button
                                  onClick={() => updateUserRole(user.id, { removeAdmin: true })}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Quitar Admin
                                </button>
                              )}
                              {!user.isDriver && (
                                <button
                                  onClick={() => updateUserRole(user.id, { isDriver: true })}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Hacer Repartidor
                                </button>
                              )}
                              {user.isDriver && (
                                <button
                                  onClick={() => updateUserRole(user.id, { removeDriver: true })}
                                  className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                  Quitar Repartidor
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
