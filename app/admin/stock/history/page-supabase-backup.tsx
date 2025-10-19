"use client"

import { useState, useEffect } from "react"
// import { createClient } from "@supabase/supabase-js"
import AdminLayout from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AlertCircle, History, RefreshCw, Search } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { format } from "date-fns"
import { es } from "date-fns/locale"

// Tipos
interface StockChange {
  id: number
  product_id: number
  product_name?: string
  previous_stock: number
  new_stock: number
  change_amount: number
  change_type: string
  reference_id?: number
  notes?: string
  timestamp: string
}

export default function StockHistoryPage() {
  const [stockChanges, setStockChanges] = useState<StockChange[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [productNames, setProductNames] = useState<Record<number, string>>({})

  // Crear cliente de Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  )

  // Cargar historial de cambios de stock
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setError(null)

      try {
        // Verificar si existe la tabla stock_changes
        const { error: tableCheckError } = await supabase.from("stock_changes").select("id").limit(1)

        if (tableCheckError) {
          if (tableCheckError.message.includes("does not exist")) {
            setError(
              "La tabla de historial de stock no existe. Primero debe crear la tabla ejecutando el script correspondiente.",
            )
            setIsLoading(false)
            return
          }
          throw new Error(tableCheckError.message)
        }

        // Cargar cambios de stock
        const { data: changesData, error: changesError } = await supabase
          .from("stock_changes")
          .select("*")
          .order("timestamp", { ascending: false })

        if (changesError) throw new Error(changesError.message)

        // Cargar nombres de productos
        const productIds = [...new Set(changesData?.map((change) => change.product_id) || [])]

        if (productIds.length > 0) {
          const { data: productsData, error: productsError } = await supabase
            .from("products")
            .select("id, name")
            .in("id", productIds)

          if (productsError) throw new Error(productsError.message)

          // Crear mapa de ID a nombre
          const namesMap: Record<number, string> = {}
          productsData?.forEach((product) => {
            namesMap[product.id] = product.name
          })

          setProductNames(namesMap)
        }

        setStockChanges(changesData || [])
      } catch (err: any) {
        setError(err.message || "Error al cargar datos")
        console.error("Error al cargar datos:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Filtrar cambios de stock
  const filteredChanges = stockChanges.filter((change) => {
    const productName = productNames[change.product_id] || `Producto #${change.product_id}`
    return (
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (change.notes || "").toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Formatear tipo de cambio
  const formatChangeType = (type: string) => {
    switch (type) {
      case "order":
        return "Pedido"
      case "manual":
        return "Manual"
      case "return":
        return "Devolución"
      case "adjustment":
        return "Ajuste"
      default:
        return type
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <History className="h-6 w-6" />
              Historial de Stock
            </CardTitle>
            <CardDescription>Consulta el historial de cambios en el inventario de productos</CardDescription>
          </CardHeader>

          <CardContent>
            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Buscar por producto o notas..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Mensajes */}
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Tabla de cambios de stock */}
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Stock Anterior</TableHead>
                      <TableHead>Cambio</TableHead>
                      <TableHead>Nuevo Stock</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>Notas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredChanges.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4 text-gray-500">
                          No se encontraron cambios de stock
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredChanges.map((change) => (
                        <TableRow key={change.id}>
                          <TableCell>
                            {format(new Date(change.timestamp), "dd/MM/yyyy HH:mm", { locale: es })}
                          </TableCell>
                          <TableCell>{productNames[change.product_id] || `Producto #${change.product_id}`}</TableCell>
                          <TableCell>{formatChangeType(change.change_type)}</TableCell>
                          <TableCell>{change.previous_stock}</TableCell>
                          <TableCell className={change.change_amount < 0 ? "text-red-600" : "text-green-600"}>
                            {change.change_amount > 0 ? `+${change.change_amount}` : change.change_amount}
                          </TableCell>
                          <TableCell>{change.new_stock}</TableCell>
                          <TableCell>
                            {change.reference_id ? (
                              change.change_type === "order" ? (
                                <a
                                  href={`/admin/orders/${change.reference_id}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  Pedido #{change.reference_id}
                                </a>
                              ) : (
                                `#${change.reference_id}`
                              )
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{change.notes || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <div className="text-sm text-gray-500">Total: {filteredChanges.length} registros</div>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Actualizar Datos
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  )
}
