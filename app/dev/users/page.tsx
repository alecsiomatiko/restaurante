"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function DevUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")

  // Formulario para crear usuario
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDriver, setIsDriver] = useState(false)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")

  // Estado para edición
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    try {
      setLoading(true)
      const response = await fetch("/api/dev/users")
      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setUsers(data.users || [])
    } catch (err: any) {
      setError(err.message || "Error al cargar usuarios")
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setMessage("")
    setError("")

    try {
      const response = await fetch("/api/dev/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          username,
          isAdmin,
          isDriver,
          name: name || username,
          phone,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setMessage(`Usuario creado correctamente: ${data.user.email}`)
      resetForm()
      fetchUsers()
    } catch (err: any) {
      setError(err.message || "Error al crear usuario")
    }
  }

  async function handleUpdateUser(userId: string, updates: any) {
    try {
      setError("")
      setMessage("")

      const response = await fetch("/api/dev/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          ...updates,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setMessage("Usuario actualizado correctamente")
      fetchUsers()
    } catch (err: any) {
      setError(err.message || "Error al actualizar usuario")
    }
  }

  function resetForm() {
    setEmail("")
    setPassword("")
    setUsername("")
    setIsAdmin(false)
    setIsDriver(false)
    setName("")
    setPhone("")
    setEditingUserId(null)
  }

  function handleEditUser(user: any) {
    setEditingUserId(user.id)
    setUsername(user.username || "")
    setIsAdmin(user.isAdmin || false)
    setIsDriver(user.isDriver || false)
    setName(user.driverInfo?.name || "")
    setPhone(user.driverInfo?.phone || "")
  }

  function handleCancelEdit() {
    resetForm()
  }

  async function handleSaveEdit() {
    if (!editingUserId) return

    try {
      await handleUpdateUser(editingUserId, {
        isAdmin,
        isDriver,
        name,
        phone,
      })
      resetForm()
    } catch (err: any) {
      setError(err.message || "Error al guardar cambios")
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900">Gestión de Usuarios (Desarrollo)</h1>
          <p className="mt-2 text-amber-800">Crea y gestiona usuarios con diferentes roles</p>
        </div>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        {message && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{message}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulario de creación/edición */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-amber-900 mb-4">
              {editingUserId ? "Editar Usuario" : "Crear Nuevo Usuario"}
            </h2>
            <form onSubmit={handleCreateUser}>
              {!editingUserId && (
                <>
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-amber-800 mb-2">
                      Correo electrónico *
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required={!editingUserId}
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="password" className="block text-amber-800 mb-2">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required={!editingUserId}
                    />
                  </div>
                </>
              )}

              <div className="mb-4">
                <label htmlFor="username" className="block text-amber-800 mb-2">
                  Nombre de usuario
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="mb-4">
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

              <div className="mb-4">
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

              {isDriver && (
                <>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-amber-800 mb-2">
                      Nombre completo (Repartidor)
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="phone" className="block text-amber-800 mb-2">
                      Teléfono (Repartidor)
                    </label>
                    <input
                      type="text"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </>
              )}

              {editingUserId ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="bg-amber-700 hover:bg-amber-800 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    Guardar Cambios
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  className="bg-amber-700 hover:bg-amber-800 text-white py-2 px-4 rounded-md transition-colors"
                >
                  Crear Usuario
                </button>
              )}
            </form>
          </div>

          {/* Lista de usuarios */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-amber-900 mb-4">Usuarios Existentes</h2>
            {loading ? (
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
                          <div className="text-xs text-amber-700">{user.id}</div>
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
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Usuario</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="px-2 py-1 text-xs bg-amber-600 text-white rounded hover:bg-amber-700"
                            >
                              Editar
                            </button>
                            {!user.isAdmin && (
                              <button
                                onClick={() => handleUpdateUser(user.id, { isAdmin: true })}
                                className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                              >
                                Hacer Admin
                              </button>
                            )}
                            {user.isAdmin && (
                              <button
                                onClick={() => handleUpdateUser(user.id, { removeAdmin: true })}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                Quitar Admin
                              </button>
                            )}
                            {!user.isDriver && (
                              <button
                                onClick={() => handleUpdateUser(user.id, { isDriver: true })}
                                className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Hacer Repartidor
                              </button>
                            )}
                            {user.isDriver && (
                              <button
                                onClick={() => handleUpdateUser(user.id, { removeDriver: true })}
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
      </div>
    </div>
  )
}
