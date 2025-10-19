import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAdmin } from "@/lib/auth-simple"

// Endpoint protegido solo para administradores
export const POST = requireAdmin(async (request: NextRequest) => {
  try {
    // Crear cliente de Supabase con rol de servicio para operaciones privilegiadas
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || "",
      process.env.SUPABASE_SERVICE_ROLE_KEY || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // Crear función para ejecutar SQL dinámico
    const { error: executeSqlError } = await supabaseAdmin.rpc("create_execute_sql_function", {})

    if (executeSqlError) {
      // Si la función ya existe, ignoramos el error
      if (!executeSqlError.message.includes("already exists")) {
        throw new Error(`Error al crear función execute_sql: ${executeSqlError.message}`)
      }
    }

    // Crear función para verificar si una tabla existe
    const { error: checkTableError } = await supabaseAdmin.rpc("create_check_table_exists_function", {})

    if (checkTableError) {
      // Si la función ya existe, ignoramos el error
      if (!checkTableError.message.includes("already exists")) {
        throw new Error(`Error al crear función check_table_exists: ${checkTableError.message}`)
      }
    }

    // Crear función para verificar si una columna existe
    const { error: checkColumnError } = await supabaseAdmin.rpc("create_check_column_exists_function", {})

    if (checkColumnError) {
      // Si la función ya existe, ignoramos el error
      if (!checkColumnError.message.includes("already exists")) {
        throw new Error(`Error al crear función check_column_exists: ${checkColumnError.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Funciones SQL creadas correctamente",
    })
  } catch (error: any) {
    console.error("Error en create-functions:", error)
    return NextResponse.json(
      { success: false, message: error.message || "Error interno del servidor" },
      { status: 500 },
    )
  }
})
