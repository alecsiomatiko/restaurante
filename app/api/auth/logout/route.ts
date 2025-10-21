import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { deleteSession } from "@/lib/auth-mysql"

export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get('auth-token')?.value

    if (authToken) {
      // Eliminar sesión de la base de datos
      await deleteSession(authToken)
    }

    // Crear respuesta y eliminar cookies
    const response = NextResponse.json({
      success: true,
      message: "Sesión cerrada exitosamente"
    })

    // Eliminar cookies
    response.cookies.delete('auth-token')
    response.cookies.delete('refresh-token')

    return response

  } catch (error: any) {
    console.error("Error en logout:", error)
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}