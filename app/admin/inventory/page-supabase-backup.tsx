"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from "@supabase/supabase-js"

// Cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [pendingOrders, setPendingOrders] = useState<any[]>([])
  const [stockChanges, setStockChanges] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [newStock, setNewStock] = useState("")

  // Cargar productos
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        // Cargar productos
        const { data: productsData, error: productsError } = await supabase.from("products").select("*").order("name")

        if (productsError) throw productsError
        setProducts(productsData || [])

        // Cargar pedidos pendientes
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("*")
          .eq("stock_processed", false)
          .neq("status", "cancelado")
          .order("created_at", { ascending: false })

        if (ordersError) throw ordersError
        setPendingOrders(ordersData || [])

        // Cargar cambios de stock recientes
        const { data: changesData, error: changesError } = await supabase
          .from("stock_changes")
          .select("*, products(name)")
          .order("timestamp", { ascending: false })
          .limit(20)

        if (changesError) throw changesError
        setStockChanges(changesData || [])
      } catch (error) {
        console.error("Error al cargar datos:", error)
        setMessage({ type: "error", text: "Error al cargar datos: " + (error as Error).message })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Procesar pedidos pendientes
  const processPendingOrders = async () => {
    setProcessing(true)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/stock/process-pending-orders", {
        method: "POST",
      })
      const result = await response.json()

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        // Recargar datos
        window.location.reload()
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error al procesar pedidos:", error)
      setMessage({ type: "error", text: "Error al procesar pedidos: " + (error as Error).message })
    } finally {
      setProcessing(false)
    }
  }

  // Actualizar stock manualmente
  const updateStock = async () => {
    if (!selectedProduct || !newStock || isNaN(Number(newStock))) {
      setMessage({ type: "error", text: "Por favor ingrese un valor válido para el stock" })
      return
    }

    setProcessing(true)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/stock/update-manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: selectedProduct.id,
          newStock: Number(newStock),
        }),
      })
      const result = await response.json()

      if (result.success) {
        setMessage({ type: "success", text: result.message })
        // Actualizar el producto en la lista
        setProducts(products.map((p) => (p.id === selectedProduct.id ? { ...p, stock: Number(newStock) } : p)))
        setSelectedProduct(null)
        setNewStock("")
      } else {
        setMessage({ type: "error", text: result.message })
      }
    } catch (error) {
      console.error("Error al actualizar stock:", error)
      setMessage({ type: "error", text: "Error al actualizar stock: " + (error as Error).message })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Gestión de Inventario</h1>

      {message && (
        <Alert className={`mb-6 ${message.type === "success" ? "bg-green-50" : "bg-red-50"}`}>
          <AlertTitle>{message.type === "success" ? "Éxito" : "Error"}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="products">
        <TabsList className="mb-4">
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="pending">Pedidos Pendientes ({pendingOrders.length})</TabsTrigger>
          <TabsTrigger value="history">Historial de Cambios</TabsTrigger>
        </TabsList>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Inventario de Productos</CardTitle>
              <CardDescription>
                Gestiona el stock de tus productos. Los productos con stock bajo aparecen en rojo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Cargando productos...</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.id}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>
                          <Badge className={product.stock <= 5 ? "bg-red-500" : "bg-green-500"}>{product.stock}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(product)
                              setNewStock(product.stock.toString())
                            }}
                          >
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {selectedProduct && (
                <div className="mt-6 p-4 border rounded-md">
                  <h3 className="text-lg font-medium mb-4">Editar Stock: {selectedProduct.name}</h3>
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label htmlFor="stock">Nuevo Stock</Label>
                      <Input
                        id="stock"
                        type="number"
                        value={newStock}
                        onChange={(e) => setNewStock(e.target.value)}
                        min="0"
                      />
                    </div>
                    <Button onClick={updateStock} disabled={processing}>
                      {processing ? "Actualizando..." : "Actualizar Stock"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedProduct(null)
                        setNewStock("")
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={processPendingOrders}
                disabled={processing || pendingOrders.length === 0}
                className="ml-auto"
              >
                {processing ? "Procesando..." : `Procesar ${pendingOrders.length} Pedidos Pendientes`}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos Pendientes de Procesar</CardTitle>
              <CardDescription>Estos pedidos aún no han actualizado el stock de productos.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Cargando pedidos pendientes...</p>
              ) : pendingOrders.length === 0 ? (
                <p>No hay pedidos pendientes de procesar.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.id}</TableCell>
                        <TableCell>{new Date(order.created_at).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge>{order.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-h-24 overflow-y-auto text-sm">
                            {Array.isArray(order.items) ? (
                              <ul className="list-disc pl-4">
                                {order.items.map((item: any, index: number) => (
                                  <li key={index}>
                                    {item.name} x {item.quantity || 1}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p>Formato de items no reconocido</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={processPendingOrders} disabled={processing || pendingOrders.length === 0}>
                {processing ? "Procesando..." : `Procesar ${pendingOrders.length} Pedidos Pendientes`}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Cambios de Stock</CardTitle>
              <CardDescription>Registro de todos los cambios realizados al stock de productos.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Cargando historial...</p>
              ) : stockChanges.length === 0 ? (
                <p>No hay cambios de stock registrados.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cambio</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Referencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockChanges.map((change) => (
                      <TableRow key={change.id}>
                        <TableCell>{new Date(change.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{change.products?.name || `Producto #${change.product_id}`}</TableCell>
                        <TableCell>
                          {change.previous_stock} → {change.new_stock} ({change.change_amount > 0 ? "-" : "+"}
                          {Math.abs(change.change_amount)})
                        </TableCell>
                        <TableCell>
                          <Badge>{change.change_type}</Badge>
                        </TableCell>
                        <TableCell>{change.notes}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
