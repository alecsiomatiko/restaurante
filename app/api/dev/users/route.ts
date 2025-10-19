import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const body = await request.json()
    const { email, password, username, isAdmin, isDriver, name, phone } = body

    // Crear usuario en Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const userId = authData.user.id

    // Crear perfil
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      username: username || email.split("@")[0],
      is_admin: isAdmin || false,
    })

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Si es conductor, crear entrada en delivery_drivers
    if (isDriver) {
      const { error: driverError } = await supabase.from("delivery_drivers").insert({
        user_id: userId,
        name: name || username || email.split("@")[0],
        phone: phone || "123456789",
        email,
        is_active: true,
      })

      if (driverError) {
        return NextResponse.json({ error: driverError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        isAdmin,
        isDriver,
      },
    })
  } catch (error: any) {
    console.error("Error al crear usuario:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const body = await request.json()
    const { userId, isAdmin, isDriver, removeAdmin, removeDriver, name, phone } = body

    // Actualizar perfil si es necesario
    if (isAdmin !== undefined || removeAdmin) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ is_admin: removeAdmin ? false : isAdmin })
        .eq("id", userId)

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 500 })
      }
    }

    // Manejar rol de conductor
    if (isDriver) {
      // Verificar si ya existe
      const { data: existingDriver } = await supabase
        .from("delivery_drivers")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle()

      if (existingDriver) {
        // Actualizar conductor existente
        const { error: updateError } = await supabase
          .from("delivery_drivers")
          .update({
            name: name || existingDriver.name,
            phone: phone || existingDriver.phone,
            is_active: true,
          })
          .eq("user_id", userId)

        if (updateError) {
          return NextResponse.json({ error: updateError.message }, { status: 500 })
        }
      } else {
        // Obtener email del usuario
        const { data: userData } = await supabase.auth.admin.getUserById(userId)
        const email = userData?.user?.email || ""

        // Crear nuevo conductor
        const { error: insertError } = await supabase.from("delivery_drivers").insert({
          user_id: userId,
          name: name || email.split("@")[0],
          phone: phone || "123456789",
          email,
          is_active: true,
        })

        if (insertError) {
          return NextResponse.json({ error: insertError.message }, { status: 500 })
        }
      }
    } else if (removeDriver) {
      // Desactivar conductor
      const { error: updateError } = await supabase
        .from("delivery_drivers")
        .update({ is_active: false })
        .eq("user_id", userId)

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: "Usuario actualizado correctamente",
    })
  } catch (error: any) {
    console.error("Error al actualizar usuario:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Obtener todos los usuarios con sus perfiles
    const { data: profiles, error: profilesError } = await supabase.from("profiles").select("*")

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 })
    }

    // Obtener todos los conductores
    const { data: drivers, error: driversError } = await supabase.from("delivery_drivers").select("*")

    if (driversError) {
      return NextResponse.json({ error: driversError.message }, { status: 500 })
    }

    // Mapear conductores por user_id para fácil acceso
    const driversMap = drivers.reduce(
      (acc, driver) => {
        acc[driver.user_id] = driver
        return acc
      },
      {} as Record<string, any>,
    )

    // Combinar datos
    const users = profiles.map((profile) => ({
      id: profile.id,
      username: profile.username,
      isAdmin: profile.is_admin,
      isDriver: !!driversMap[profile.id],
      driverInfo: driversMap[profile.id] || null,
      createdAt: profile.created_at,
    }))

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error("Error al obtener usuarios:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
