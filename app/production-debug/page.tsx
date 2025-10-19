"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

export default function ProductionDebugPage() {
  const [envInfo, setEnvInfo] = useState<any>(null)
  const [sessionInfo, setSessionInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkEnvironment() {
      try {
        // Verificar variables de entorno públicas
        const envData = {
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "No configurado",
          hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          environment: process.env.NODE_ENV,
          timestamp: new Date().toISOString(),
        }
        setEnvInfo(envData)

        // Verificar sesión actual
        const supabase = createClient()
        const { data, error } = await supabase.auth.getSession()

        setSessionInfo({
          hasSession: !!data.session,
          user: data.session?.user
            ? {
                id: data.session.user.id,
                email: data.session.user.email,
                lastSignIn: data.session.user.last_sign_in_at,
              }
            : null,
          error: error,
        })
      } catch (err: any) {
        console.error("Error al verificar entorno:", err)
        setSessionInfo({
          error: err.message,
        })
      } finally {
        setLoading(false)
      }
    }

    checkEnvironment()
  }, [])

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
        <h1 className="text-2xl font-bold mb-6">Diagnóstico de Producción</h1>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Variables de Entorno</h2>
          {loading ? (
            <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
          ) : (
            <div className="bg-gray-50 p-4 rounded border">
              <pre className="text-sm">{JSON.stringify(envInfo, null, 2)}</pre>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Estado de la Sesión</h2>
          {loading ? (
            <div className="animate-pulse bg-gray-200 h-20 rounded"></div>
          ) : (
            <div className="bg-gray-50 p-4 rounded border">
              <pre className="text-sm">{JSON.stringify(sessionInfo, null, 2)}</pre>
            </div>
          )}

          {sessionInfo?.hasSession && (
            <button onClick={handleSignOut} className="mt-3 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded">
              Cerrar Sesión
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/production-setup"
            className="bg-amber-700 hover:bg-amber-800 text-white py-2 px-4 rounded text-center"
          >
            Configurar Usuario Administrador
          </a>
          <a href="/login" className="bg-amber-700 hover:bg-amber-800 text-white py-2 px-4 rounded text-center">
            Ir a Inicio de Sesión
          </a>
        </div>

        <div className="mt-8 border-t pt-4">
          <h3 className="font-semibold mb-2">Solución de problemas comunes:</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>No reconoce credenciales:</strong> Asegúrate de que estás usando las credenciales correctas para
              el entorno de producción. Usa la página de configuración para crear un usuario administrador.
            </li>
            <li>
              <strong>Error de CORS:</strong> Verifica que el dominio de tu aplicación esté configurado en la sección de
              URL permitidas en la configuración de Supabase.
            </li>
            <li>
              <strong>Problemas con cookies:</strong> Asegúrate de que tu dominio esté configurado correctamente en la
              sección de Auth de Supabase.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
