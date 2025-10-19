"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function SupabaseDebugPage() {
  const [sessionData, setSessionData] = useState<any>(null)
  const [testEmail, setTestEmail] = useState("")
  const [testPassword, setTestPassword] = useState("")
  const [testResult, setTestResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkSession() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.auth.getSession()

        setSessionData({
          session: data.session,
          error: error,
          timestamp: new Date().toISOString(),
        })
      } catch (err) {
        setSessionData({
          error: err,
          timestamp: new Date().toISOString(),
        })
      } finally {
        setLoading(false)
      }
    }

    checkSession()
  }, [])

  const handleTestCredentials = async () => {
    if (!testEmail || !testPassword) {
      setTestResult({ error: "Email y contraseña son requeridos" })
      return
    }

    try {
      setTestResult({ loading: true })

      const response = await fetch("/api/auth/check-credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      })

      const data = await response.json()
      setTestResult({
        ...data,
        status: response.status,
        timestamp: new Date().toISOString(),
      })
    } catch (err: any) {
      setTestResult({
        error: err.message,
        timestamp: new Date().toISOString(),
      })
    }
  }

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.reload()
    } catch (err: any) {
      alert(`Error al cerrar sesión: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Diagnóstico de Supabase</h1>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Estado de la Sesión</h2>
          {loading ? (
            <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
          ) : (
            <div className="bg-gray-50 p-4 rounded border overflow-auto max-h-60">
              <pre className="text-sm">{JSON.stringify(sessionData, null, 2)}</pre>
            </div>
          )}

          {sessionData?.session && (
            <button onClick={handleSignOut} className="mt-3 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded">
              Cerrar Sesión
            </button>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Probar Credenciales</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={testPassword}
                onChange={(e) => setTestPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <button
              onClick={handleTestCredentials}
              className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
              disabled={testResult?.loading}
            >
              {testResult?.loading ? "Probando..." : "Probar Credenciales"}
            </button>
          </div>

          {testResult && !testResult.loading && (
            <div className="mt-3 bg-gray-50 p-4 rounded border overflow-auto max-h-60">
              <pre className="text-sm">{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <a href="/login" className="bg-amber-700 hover:bg-amber-800 text-white py-2 px-4 rounded inline-block">
            Ir a Login Normal
          </a>
          <a href="/login-alt" className="bg-amber-700 hover:bg-amber-800 text-white py-2 px-4 rounded inline-block">
            Ir a Login Alternativo
          </a>
        </div>
      </div>
    </div>
  )
}
