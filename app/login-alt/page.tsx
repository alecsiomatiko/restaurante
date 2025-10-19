"use client"

import type React from "react"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function LoginAltPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage("")
    setLoading(true)

    try {
      const supabase = createClient()

      // Intentar iniciar sesión
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
      } else {
        setMessage(`Éxito! Usuario: ${data.user?.email}`)

        // Redirigir después de un breve retraso
        setTimeout(() => {
          window.location.href = "/menu"
        }, 1000)
      }
    } catch (err: any) {
      setMessage(`Error inesperado: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Login Alternativo</h1>

        {message && (
          <div
            className={`p-3 mb-4 rounded ${message.includes("Error") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-700 text-white py-2 px-4 rounded-md hover:bg-amber-800 transition-colors disabled:opacity-50"
          >
            {loading ? "Procesando..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/login" className="text-amber-700 hover:underline">
            Volver al login normal
          </a>
        </div>
      </div>
    </div>
  )
}
