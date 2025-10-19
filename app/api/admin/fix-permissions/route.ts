import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function GET() {
  try {
    const supabase = createClient()
    const cookieStore = cookies()

    // Verificar sesión de Supabase
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !sessionData?.session) {
      return NextResponse.json(
        {
          success: false,
          message: "No hay sesión activa",
          error: sessionError?.message,
        },
        { status: 401 },
      )
    }

    const userId = sessionData.session.user.id

    // Verificar si el usuario existe en la tabla users
    const { data: userData, error: userError } = await supabase.from("users").select("*").eq("id", userId).single()

    if (userError) {
      // Si el usuario no existe, intentar crearlo
      if (userError.code === "PGRST116") {
        // No data found
        const { data: newUser, error: createError } = await supabase
          .from("users")
          .insert({
            id: userId,
            username: sessionData.session.user.email,
            email: sessionData.session.user.email,
            is_admin: true, // Hacer administrador por defecto
          })
          .select()
          .single()

        if (createError) {
          return NextResponse.json(
            {
              success: false,
              message: "Error al crear usuario",
              error: createError.message,
            },
            { status: 500 },
          )
        }

        return NextResponse.json({
          success: true,
          message: "Usuario creado y configurado como administrador",
          user: newUser,
        })
      }

      return NextResponse.json(
        {
          success: false,
          message: "Error al verificar usuario",
          error: userError.message,
        },
        { status: 500 },
      )
    }

    // Si el usuario existe pero no es admin, hacerlo admin
    if (!userData.is_admin) {
      const { error: updateError } = await supabase.from("users").update({ is_admin: true }).eq("id", userId)

      if (updateError) {
        return NextResponse.json(
          {
            success: false,
            message: "Error al actualizar permisos",
            error: updateError.message,
          },
          { status: 500 },
        )
      }

      return NextResponse.json({
        success: true,
        message: "Usuario actualizado a administrador",
        user: { ...userData, is_admin: true },
      })
    }

    return NextResponse.json({
      success: true,
      message: "El usuario ya tiene permisos de administrador",
      user: userData,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
        error: error.message,
      },
      { status: 500 },
    )
  }
}
