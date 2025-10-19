"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function AdminSetupPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function checkCurrentUser() {
      const { data } = await supabase.auth.getSession()
      if (data.session?.user) {
        setCurrentUser(data.session.user)
      }
    }
    checkCurrentUser()
  }, [supabase])

  const handleMakeAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      // Primero buscar el usuario por email
      const { data: users, error: userError } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", email.split("@")[0])

      if (userError) throw userError

      if (!users || users.length === 0) {
        // Si no existe el perfil, buscar en auth.users
        const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

        if (authError) {
          // Si no tenemos acceso admin, intentar otra estrategia
          setError(`No se encontró ningún usuario con el email ${email}. Asegúrate de que el usuario esté registrado.`)
          return
        }

        const authUser = authUsers?.users.find((u) => u.email === email)
        if (!authUser) {
          setError(`No se encontró ningún usuario con el email ${email}`)
          return
        }

        // Crear el perfil si no existe
        const { error: createError } = await supabase.from("profiles").insert({
          id: authUser.id,
          username: email.split("@")[0],
          full_name: authUser.user_metadata?.full_name || email,
          is_admin: true,
        })

        if (createError) throw createError
      } else {
        // Actualizar el usuario existente a admin
        const user = users[0]
        const { error: updateError } = await supabase.from("profiles").update({ is_admin: true }).eq("id", user.id)

        if (updateError) throw updateError
      }

      setMessage(`¡Usuario ${email} convertido a administrador con éxito!`)
      setEmail("")
    } catch (err: any) {
      console.error("Error:", err)
      setError(err.message || "Ocurrió un error al convertir el usuario en administrador")
    } finally {
      setLoading(false)
    }
  }

  const handleMakeSelfAdmin = async () => {
    if (!currentUser) return

    setLoading(true)
    setError("")
    setMessage("")

    try {
      // Primero verificar si existe el perfil
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single()

      if (profileError && profileError.code === "PGRST116") {
        // El perfil no existe, crearlo
        const { error: createError } = await supabase.from("profiles").insert({
          id: currentUser.id,
          username: currentUser.email?.split("@")[0] || "usuario",
          full_name: currentUser.user_metadata?.full_name || currentUser.email,
          is_admin: true,
        })

        if (createError) throw createError
      } else if (profile) {
        // El perfil existe, actualizarlo
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ is_admin: true })
          .eq("id", currentUser.id)

        if (updateError) throw updateError
      }

      setMessage("¡Te has convertido en administrador con éxito! Recargando página...")

      // Esperar un momento y recargar
      setTimeout(() => {
        router.refresh()
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      console.error("Error:", err)
      setError(err.message || "Ocurrió un error al convertirte en administrador")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 py-12">
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-amber-900 mb-6">Configuración de Administrador</h1>

          {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{message}</div>
          )}

          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

          {currentUser && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-amber-800 mb-2">Convertirte en administrador</h2>
              <p className="text-amber-700 mb-4">
                Estás conectado como: <strong>{currentUser.email}</strong>
              </p>
              <button
                onClick={handleMakeSelfAdmin}
                disabled={loading}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? "Procesando..." : "Convertirme en administrador"}
              </button>
            </div>
          )}

          <div className="border-t border-amber-200 pt-6 mt-6">
            <h2 className="text-lg font-semibold text-amber-800 mb-4">Convertir otro usuario en administrador</h2>
            <form onSubmit={handleMakeAdmin}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-amber-800 mb-2">
                  Email del usuario
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-700 hover:bg-amber-800 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50"
              >
                {loading ? "Procesando..." : "Convertir en administrador"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
