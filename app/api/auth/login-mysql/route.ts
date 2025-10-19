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

    // Crear respuesta con cookie de sesión
    const response = NextResponse.json({
      success: true,
      user: authResult.user,
      message: "Inicio de sesión exitoso"
    })

    // Configurar cookie segura con el token
    response.cookies.set('auth-token', sessionData.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/'
    })

    // Cookie para refresh token
    response.cookies.set('refresh-token', sessionData.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: '/'
    })

    return response

  } catch (error: any) {
    console.error("Error en login:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}