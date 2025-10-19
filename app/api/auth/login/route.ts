import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { authenticateUser } from "@/lib/mysql-db"
import { createSession } from "@/lib/auth-mysql"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son requeridos" },
        { status: 400 }
      )
    }

    // Autenticar usuario con MySQL
    const authResult = await authenticateUser(email, password)

    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.message },
        { status: 401 }
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

        if (otpError) {
          console.error("Error OTP:", otpError.message)
          return NextResponse.json({ error: otpError.message }, { status: 400 })
        }

        return NextResponse.json({
          success: true,
          message: "Se ha enviado un código de acceso a tu correo electrónico.",
        })
      }

      // Si falla Supabase, intentar con el sistema legacy
      try {
        // Intentar con el sistema legacy
        const legacyUser = await verifyUser(email, password)

        if (legacyUser) {
          // Si el usuario existe en el sistema legacy, crear una cookie de sesión
          const userPayload = {
            id: legacyUser.id,
            username: legacyUser.username,
            isAdmin: legacyUser.isAdmin,
            timestamp: Date.now(),
          }

          // Convertir a string y codificar en base64
          const userDataStr = JSON.stringify(userPayload)
          const encodedData = Buffer.from(userDataStr).toString("base64")

          // Establecer cookie
          cookieStore.set("user_session", encodedData, {
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7 días
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
          })

          return NextResponse.json({
            success: true,
            user: userPayload,
            message: "Inicio de sesión exitoso (sistema legacy)",
          })
        }
      } catch (legacyError) {
        console.error("Error en sistema legacy:", legacyError)
      }

      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      user: data.user,
    })
  } catch (error: any) {
    console.error("Error en login:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
