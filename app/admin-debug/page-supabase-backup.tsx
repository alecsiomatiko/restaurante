"use client"

import { useState, useEffect } from "react"
// import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function AdminDebugPage() {
  const [session, setSession] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [fixResult, setFixResult] = useState<string | null>(null)
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        // Obtener sesión
        const {
          data: { session },
        } = await supabase.auth.getSession()
        setSession(session)

        if (session) {
          // Obtener perfil
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single()

          if (profileError) {
            console.error("Error al obtener perfil:", profileError)
            setError(`Error al obtener perfil: ${profileError.message}`)
          } else {
            setProfile(profileData)
          }
        }
      } catch (err: any) {
        console.error("Error inesperado:", err)
        setError(`Error inesperado: ${err.message}`)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [supabase])

  const fixAdminStatus = async () => {
    if (!session) {
      setFixResult("No hay sesión activa")
      return
    }

    try {
      setFixResult("Actualizando estado de administrador...")

      // Si no existe el perfil, crearlo
      if (!profile) {
        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: session.user.id,
            username: session.user.email,
            is_admin: true,
          })
          .select()
          .single()

        if (createError) {
          setFixResult(`Error al crear perfil: ${createError.message}`)
          return
        }

        setProfile(newProfile)
        setFixResult("Perfil creado con éxito y establecido como administrador")
        return
      }

      // Actualizar estado de administrador
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ is_admin: true })
        .eq("id", session.user.id)

      if (updateError) {
        setFixResult(`Error al actualizar estado: ${updateError.message}`)
        return
      }

      // Recargar perfil
      const { data: updatedProfile } = await supabase.from("profiles").select("*").eq("id", session.user.id).single()

      setProfile(updatedProfile)
      setFixResult("Estado de administrador actualizado con éxito")
    } catch (err: any) {
      setFixResult(`Error inesperado: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Diagnóstico de Administrador</CardTitle>
            <CardDescription>Cargando información...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico de Administrador</CardTitle>
          <CardDescription>Verifica el estado de administrador de tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

          {fixResult && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">{fixResult}</div>
          )}

          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Estado de sesión:</h3>
              <p>{session ? "Activa" : "No hay sesión"}</p>
              {session && (
                <div className="mt-2 text-sm">
                  <p>
                    <strong>Usuario:</strong> {session.user.email}
                  </p>
                  <p>
                    <strong>ID:</strong> {session.user.id}
                  </p>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium">Perfil:</h3>
              {profile ? (
                <div className="mt-2 text-sm">
                  <p>
                    <strong>ID:</strong> {profile.id}
                  </p>
                  <p>
                    <strong>Username:</strong> {profile.username}
                  </p>
                  <p>
                    <strong>Es administrador:</strong> {profile.is_admin ? "Sí" : "No"}
                  </p>
                </div>
              ) : (
                <p>No se encontró perfil</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={fixAdminStatus} disabled={!session}>
            {profile?.is_admin ? "Refrescar estado de administrador" : "Establecer como administrador"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
