import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { authenticateUser } from "@/lib/mysql-db"
import { createSession } from "@/lib/auth-mysql"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    console.log('🔐 Intento de login:', { email, password: password ? '***' : 'NO_PASSWORD' })

    if (!email || !password) {
      console.log('❌ Email o contraseña faltantes')
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      )
    }

    // Autenticar usuario con MySQL
    console.log('🔍 Autenticando con MySQL...')
    const authResult = await authenticateUser(email, password)
    console.log('📝 Resultado autenticación:', authResult)

    if (!authResult.success) {
      console.log('❌ Autenticación fallida:', authResult.message)
      return NextResponse.json(
        { error: authResult.message },
        { status: 401 }
      )
    }

    if (!authResult.user) {
      return NextResponse.json(
        { error: "Error en los datos del usuario" },
        { status: 500 }
      )
    }

    // Crear sesión
    const sessionData = await createSession(authResult.user)
    console.log('🍪 Creando sesión con token:', sessionData.accessToken.substring(0, 20) + '...')

    // PRODUCTION: Crear respuesta con múltiples estrategias de autenticación
    const response = NextResponse.json({
      success: true,
      user: authResult.user,
      message: "Inicio de sesión exitoso",
      accessToken: sessionData.accessToken,
      refreshToken: sessionData.refreshToken
    })

    // ESTRATEGIA 1: Cookies HttpOnly seguras
    response.headers.append('Set-Cookie', `auth-token=${sessionData.accessToken}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}`)
    response.headers.append('Set-Cookie', `refresh-token=${sessionData.refreshToken}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}`)
    
    // ESTRATEGIA 2: Cookie de sesión simple para middleware
    const sessionId = `session_${authResult.user.id}_${Date.now()}`
    response.headers.append('Set-Cookie', `session-token=${sessionData.accessToken}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure=${process.env.NODE_ENV === 'production'}`)
    
    // ESTRATEGIA 3: Cookie con datos de usuario
    const userData = Buffer.from(JSON.stringify({
      id: authResult.user.id,
      email: authResult.user.email,
      username: authResult.user.username,
      is_admin: authResult.user.is_admin,
      is_driver: authResult.user.is_driver,
      is_waiter: authResult.user.is_waiter
    })).toString('base64')
    response.headers.append('Set-Cookie', `user-data=${userData}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure=${process.env.NODE_ENV === 'production'}`)
    
    console.log('✅ PRODUCTION: Sistema de autenticación multi-estrategia configurado')
    console.log('🔍 All Set-Cookie headers:', response.headers.getSetCookie())

    return response

  } catch (error: any) {
    console.error("Error en login:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}