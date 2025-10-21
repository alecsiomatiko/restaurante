import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { registerUser } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json()

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Email, contraseña y nombre de usuario son requeridos" },
        { status: 400 }
      )
    }

    // Registrar usuario
    const result = await registerUser(email, password, username)

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Usuario registrado exitosamente",
      userId: result.userId,
      username: result.username
    })

  } catch (error: any) {
    console.error("Error en registro:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}