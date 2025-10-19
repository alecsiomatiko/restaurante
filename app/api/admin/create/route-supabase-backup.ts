import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Esta ruta es solo para desarrollo y debe ser eliminada en producción
export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Datos del administrador
    const adminEmail = "admin@restaurante.com"
    const adminPassword = "admin123456" // Contraseña más segura

    // Verificar si el usuario ya existe en auth
    const { data: authUser, error: authCheckError } = await supabase.auth.admin.getUserByEmail(adminEmail)

    let userId = authUser?.id

    // Si no existe, crearlo
    if (!userId) {
      const { data: newUser, error: createError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
          emailRedirectTo: `${request.nextUrl.origin}/auth/callback`,
          data: {
            email_confirmed: true,
          },
        },
      })

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      userId = newUser.user?.id
    }

    if (!userId) {
      return NextResponse.json({ error: "No se pudo crear o encontrar el usuario" }, { status: 500 })
    }

    // Verificar si ya existe el perfil
    const { data: existingProfile } = await supabase.from("profiles").select("*").eq("id", userId).single()

    if (existingProfile) {
      // Actualizar a admin si no lo es
      if (!existingProfile.is_admin) {
        await supabase.from("profiles").update({ is_admin: true }).eq("id", userId)
      }
    } else {
      // Crear perfil de administrador
      await supabase.from("profiles").insert({
        id: userId,
        username: adminEmail,
        is_admin: true,
      })
    }

    return NextResponse.json({
      success: true,
      message: "Usuario administrador creado o actualizado correctamente",
      credentials: {
        email: adminEmail,
        password: adminPassword,
      },
    })
  } catch (error: any) {
    console.error("Error al crear administrador:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
