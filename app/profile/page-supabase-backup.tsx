"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { User, Mail, Shield, ShoppingCart, ArrowLeft, Loader2 } from "lucide-react"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function loadUserData() {
      try {
        console.log("Iniciando carga de datos del usuario...")

        // First, try to get the current session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        console.log("Sesión obtenida:", session?.user?.email || "No session")
        console.log("Error de sesión:", sessionError)

        if (sessionError) {
          console.error("Error getting session:", sessionError)
          setError("Error al obtener la sesión")
          setLoading(false)
          return
        }

        if (!session) {
          console.log("No hay sesión, redirigiendo al login...")
          router.push("/login?redirect=profile")
          return
        }

        setUser(session.user)
        console.log("Usuario establecido:", session.user.email)

        // Get profile data
        console.log("Obteniendo datos del perfil...")
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single()

        if (profileError) {
          console.error("Error loading profile:", profileError)
          // Create profile if it doesn't exist
          if (profileError.code === "PGRST116") {
            console.log("Perfil no existe, creando uno nuevo...")
            const { data: newProfile, error: createError } = await supabase
              .from("profiles")
              .insert({
                id: session.user.id,
                username: session.user.email?.split("@")[0] || "usuario",
                full_name: session.user.user_metadata?.full_name || session.user.email,
                is_admin: false,
              })
              .select()
              .single()

            if (createError) {
              console.error("Error creating profile:", createError)
              setError("Error al crear el perfil")
            } else {
              console.log("Perfil creado:", newProfile)
              setProfile(newProfile)
            }
          } else {
            setError("Error al cargar el perfil")
          }
        } else {
          console.log("Perfil cargado:", profileData)
          setProfile(profileData)
        }
      } catch (error) {
        console.error("Error inesperado:", error)
        setError("Error inesperado al cargar los datos")
      } finally {
        setLoading(false)
      }
    }

    // Also listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, session?.user?.email || "No session")

      if (event === "SIGNED_OUT") {
        router.push("/login")
        return
      }

      if (event === "SIGNED_IN" && session) {
        setUser(session.user)
        // Reload profile data
        loadUserData()
      }
    })

    loadUserData()

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setUpdating(true)

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setUpdating(false)
      return
    }

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres")
      setUpdating(false)
      return
    }

    try {
      // Update password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw updateError
      }

      setSuccess("Contraseña actualizada correctamente")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err: any) {
      console.error("Error updating password:", err)
      setError(err.message || "Error al cambiar la contraseña")
    } finally {
      setUpdating(false)
    }
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-red-600" />
          <span className="text-gray-600">Cargando perfil...</span>
        </div>
      </div>
    )
  }

  // Show error state if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Acceso Requerido</CardTitle>
            <CardDescription className="text-center">Necesitas iniciar sesión para ver tu perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex space-x-2">
              <Button asChild className="flex-1">
                <Link href="/login">Iniciar Sesión</Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/">Volver al Inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
          <p className="mt-2 text-gray-600">Gestiona tu información personal y configuración</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5 text-red-600" />
                Información de la Cuenta
              </CardTitle>
              <CardDescription>Detalles de tu cuenta y perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-500">Email</Label>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <p className="text-sm">{user.email}</p>
                </div>
              </div>

              {profile ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Nombre de usuario</Label>
                    <p className="text-sm">{profile.username || "No especificado"}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Nombre completo</Label>
                    <p className="text-sm">{profile.full_name || "No especificado"}</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Rol</Label>
                    <div className="flex items-center space-x-2">
                      <Shield className={`h-4 w-4 ${profile.is_admin ? "text-red-600" : "text-gray-400"}`} />
                      <p className="text-sm font-medium">
                        {profile.is_admin ? (
                          <span className="text-red-600">Administrador</span>
                        ) : (
                          <span className="text-gray-600">Cliente</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-500">Miembro desde</Label>
                    <p className="text-sm">
                      {new Date(profile.created_at).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500">Cargando información del perfil...</p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <Link href="/orders">
                  <Button variant="outline" className="w-full justify-start">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Ver mis pedidos
                  </Button>
                </Link>
                {profile?.is_admin && (
                  <Link href="/admin/dashboard">
                    <Button variant="outline" className="w-full justify-start text-red-600 hover:text-red-700">
                      <Shield className="mr-2 h-4 w-4" />
                      Panel de administración
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Cambiar Contraseña</CardTitle>
              <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-4 border-green-200 bg-green-50 text-green-800">
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva contraseña</Label>
                  <Input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                  <Input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    "Cambiar contraseña"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
