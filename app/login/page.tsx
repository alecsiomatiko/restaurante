'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-notifications'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const { login } = useAuth()
  const router = useRouter()
  const toast = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!email || !password) {
      setError('Por favor, completa todos los campos')
      return
    }

    if (!email.includes('@')) {
      setError('Por favor, ingresa un email válido')
      return
    }

    setIsLoading(true)

    try {
      const result = await login(email, password)
      
      if (result.success) {
        toast.success('¡Bienvenido!', 'Has iniciado sesión correctamente')
        
        // Verificar si hay un redirect pendiente
        const urlParams = new URLSearchParams(window.location.search)
        const redirectTo = urlParams.get('redirect')
        
        if (redirectTo) {
          // Si hay un redirect específico, ir ahí
          router.push(redirectTo)
        } else {
          // Redirigir según tipo de usuario del login response
          const userData = (result as any).user
          if (userData?.is_admin) {
            router.push('/admin/dashboard')
          } else if (userData?.is_driver) {
            router.push('/driver/dashboard')
          } else {
            router.push('/')
          }
        }
      } else {
        setError(result.message || 'Error al iniciar sesión')
      }
    } catch (error) {
      console.error('Error de login:', error)
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
  <div className="min-h-screen flex items-center justify-center bg-black/60 backdrop-blur-sm py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Supernova Burgers
          </h1>
          <p className="text-purple-200">Sabores fuera de este mundo</p>
        </div>

        <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-white">
              Iniciar Sesión
            </CardTitle>
            <CardDescription className="text-center text-purple-200">
              Ingresa a tu cuenta para ordenar
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert className="bg-red-500/10 border-red-500/20 text-red-200">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-purple-300" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-white/10 border-purple-300/30 text-white placeholder:text-purple-300"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">
                  Contraseña
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-purple-300" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 bg-white/10 border-purple-300/30 text-white placeholder:text-purple-300"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-purple-300 hover:text-white"
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-purple-200 text-sm">
                  ¿No tienes una cuenta?{' '}
                  <Link
                    href="/register"
                    className="text-purple-300 hover:text-white underline"
                  >
                    Regístrate aquí
                  </Link>
                </p>
                
                <Link
                  href="/"
                  className="text-purple-300 hover:text-white text-sm underline"
                >
                  Volver al inicio
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>


      </div>
    </div>
  )
}