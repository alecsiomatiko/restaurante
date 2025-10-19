"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function FixAuthPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleFixAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setLoading(true)

    try {
      const supabase = createClient()

      // Cerrar cualquier sesión existente
      await supabase.auth.signOut()

      // Limpiar localStorage y sessionStorage
      if (typeof window !== "undefined") {
        localStorage.clear()
        sessionStorage.clear()
      }

      // Intentar iniciar sesión nuevamente
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        throw error
      }

      setMessage(`Autenticación reparada exitosamente. Usuario: ${data.user?.email}`)
    } catch (err: any) {
      console.error("Error al reparar autenticación:", err)
      setMessage(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Reparar Autenticación</h1>

        <p className="mb-4 text-gray-700">
          Esta herramienta limpiará tu sesión actual y te permitirá iniciar sesión nuevamente para resolver problemas de
          autenticación.
        </p>

        <form onSubmit={handleFixAuth}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-700 mb-2">
              Correo electrónico
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50"
          >
            {loading ? "Reparando..." : "Reparar Autenticación"}
          </button>
        </form>

        {message && (
          <div className={`mt-4 p-4 rounded ${message.includes("Error") ? "bg-red-100" : "bg-green-100"}`}>
            {message}
          </div>
        )}

        <div className="mt-6 flex justify-between">
          <a href="/login" className="text-amber-700 hover:underline">
            Volver a Iniciar Sesión
          </a>
          <a href="/" className="text-amber-700 hover:underline">
            Ir al Inicio
          </a>
        </div>
      </div>
    </div>
  )
}
