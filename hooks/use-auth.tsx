'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: number
  email: string
  username: string
  is_admin: boolean
  is_driver: boolean
  is_waiter: boolean
  driver_info?: any
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>
  logout: () => Promise<void>
  isLoading: boolean
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Verificar sesión al cargar
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // PRODUCTION: Priorizar múltiples fuentes de autenticación
      const token = localStorage.getItem('auth-token')
      const userData = localStorage.getItem('user-data')
      
      // ESTRATEGIA 1: localStorage + validación API
      if (token && userData) {
        try {
          const user = JSON.parse(userData)
          
          // Validar token con API
          const response = await fetch('/api/users/profile', {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              setUser(data.user)
              console.log('✅ Usuario autenticado desde localStorage + API')
              return
            }
          }
        } catch (e) {
          console.log('⚠️ Error validando localStorage, limpiando...')
          localStorage.removeItem('auth-token')
          localStorage.removeItem('refresh-token')
          localStorage.removeItem('user-data')
        }
      }
      
      // ESTRATEGIA 2: Solo cookies
      const response = await fetch('/api/users/profile', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUser(data.user)
          // Sincronizar con localStorage
          if (token) {
            localStorage.setItem('user-data', JSON.stringify(data.user))
          }
          console.log('✅ Usuario autenticado desde cookies')
          return
        }
      }
      
      console.log('ℹ️ No hay sesión activa')
    } catch (error) {
      console.error('Error verificando autenticación:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login-mysql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (data.success) {
        setUser(data.user)
        
        // CRITICAL: Asegurar que localStorage se guarde SIEMPRE
        if (data.accessToken) {
          localStorage.setItem('auth-token', data.accessToken)
          localStorage.setItem('refresh-token', data.refreshToken)
          localStorage.setItem('user-data', JSON.stringify(data.user))
          console.log('💾 Tokens guardados en localStorage')
          console.log('🔑 Token preview:', data.accessToken.substring(0, 50) + '...')
        }
        
        console.log('✅ Login exitoso - Usuario autenticado')
        return { success: true, user: data.user }
      } else {
        return { success: false, message: data.error || 'Error de inicio de sesión' }
      }
    } catch (error) {
      console.error('Error en login:', error)
      return { success: false, message: 'Error de conexión' }
    }
  }

  const register = async (name: string, email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/register-mysql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (data.success) {
        return { success: true, message: 'Usuario registrado exitosamente' }
      } else {
        return { success: false, message: data.error || 'Error de registro' }
      }
    } catch (error) {
      console.error('Error en registro:', error)
      return { success: false, message: 'Error de conexión' }
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Error en logout:', error)
    } finally {
      setUser(null)
      router.push('/login')
    }
  }

  const refreshUser = async () => {
    // Llama al endpoint de refresh para regenerar el token y la sesión con los roles actuales
    try {
      await fetch('/api/auth/refresh-session', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (e) {
      // Ignorar errores, checkAuth los manejará
    }
    await checkAuth()
  }

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      isLoading,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}