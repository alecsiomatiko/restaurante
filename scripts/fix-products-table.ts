import { createClient } from "@supabase/supabase-js"

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Cliente de Supabase con rol de servicio
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function fixProductsTable() {
  console.log("Iniciando corrección de la tabla de productos...")

  try {
    // 1. Verificar si la tabla existe
    const { error: tableCheckError } = await supabase.from("products").select("id").limit(1)

    if (tableCheckError && tableCheckError.message.includes("does not exist")) {
      console.log("La tabla products no existe. Creando tabla...")
      await createProductsTable()
    } else {
      console.log("La tabla products existe. Verificando estructura...")
    }

    // 2. Verificar si la columna stock existe
    const { data: columns, error: columnsError } = await supabase.rpc("get_table_columns", { table_name: "products" })

    if (columnsError) {
      console.error("Error al obtener columnas:", columnsError)
      return
    }

    const hasStockColumn = columns.some((col: any) => col.column_name === "stock")

    if (!hasStockColumn) {
      console.log("La columna stock no existe. Añadiendo columna...")
      await addStockColumn()
    } else {
      console.log("La columna stock existe.")
    }

    // 3. Verificar y actualizar valores de stock
    const { data: products, error: productsError } = await supabase.from("products").select("id, stock")

    if (productsError) {
      console.error("Error al obtener productos:", productsError)
      return
    }

    console.log(`Encontrados ${products.length} productos.`)

    // Actualizar productos sin stock o con stock null
    const productsToUpdate = products.filter((p: any) => p.stock === null || p.stock === undefined)

    if (productsToUpdate.length > 0) {
      console.log(`Actualizando ${productsToUpdate.length} productos sin valor de stock...`)

      for (const product of productsToUpdate) {
        const { error: updateError } = await supabase
          .from("products")
          .update({ stock: 10 }) // Valor predeterminado
          .eq("id", product.id)

        if (updateError) {
          console.error(`Error al actualizar producto ${product.id}:`, updateError)
        }
      }

      console.log("Actualización de productos completada.")
    } else {
      console.log("Todos los productos tienen valores de stock válidos.")
    }

    console.log("Corrección de la tabla de productos completada con éxito.")
  } catch (error) {
    console.error("Error al corregir la tabla de productos:", error)
  }
}

async function createProductsTable() {
  try {
    await supabase.rpc("create_products_table", {})
    console.log("Tabla products creada correctamente.")
  } catch (error) {
    console.error("Error al crear tabla products:", error)
  }
}

async function addStockColumn() {
  try {
    await supabase.rpc("add_stock_column_to_products", {})
    console.log("Columna stock añadida correctamente.")
  } catch (error) {
    console.error("Error al añadir columna stock:", error)
  }
}

// Ejecutar el script
fixProductsTable()
  .then(() => console.log("Script finalizado."))
  .catch((err) => console.error("Error en el script:", err))
