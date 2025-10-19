"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { createClient } from "@supabase/supabase-js"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { AlertTriangle, RefreshCw } from "lucide-react"

// Cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function InventoryDashboardPage() {
  const [products, setProducts] = useState<any[]>([])
  const [stockChanges, setStockChanges] = useState<any[]>([])
  const [debugLogs, setDebugLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [stockChartData, setStockChartData] = useState<any[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([])

  // Cargar datos
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Cargar productos
      const { data: productsData, error: productsError } = await supabase.from("products").select("*").order("name")

      if (productsError) throw productsError
      setProducts(productsData || [])

      // Identificar productos con stock bajo
      setLowStockProducts(productsData?.filter((p) => p.stock <= 5) || [])

      // Cargar cambios de stock recientes (sin join)
      const { data: changesData, error: changesError } = await supabase
        .from("stock_changes")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(50)

      if (changesError) {
        console.log("No stock_changes table found, skipping...")
        setStockChanges([])
      } else {
        setStockChanges(changesData || [])
      }

      // Preparar datos para el gráfico (simplificado)
      if (changesData && changesData.length > 0) {
        const chartData = changesData.map((change, index) => ({
          date: new Date(change.timestamp).toLocaleDateString(),
          stock: change.new_stock || 0,
          product: `Producto #${change.product_id || index}`,
        }))
        setStockChartData(chartData.slice(0, 10)) // Solo los primeros 10
      }

      // Cargar logs de depuración (opcional)
      const { data: logsData, error: logsError } = await supabase
        .from("debug_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(20)

      if (logsError) {
        console.log("No debug_logs table found, skipping...")
        setDebugLogs([])
      } else {
        setDebugLogs(logsData || [])
      }
    } catch (error) {
      console.error("Error al cargar datos:", error)
      setMessage({ type: "error", text: "Error al cargar datos: " + (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

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
        loadData()
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

  // Obtener colores para el gráfico
  const getChartColors = () => {
    return [
      "#8884d8",
      "#82ca9d",
      "#ffc658",
      "#ff8042",
      "#0088fe",
      "#00c49f",
      "#ffbb28",
      "#ff8042",
      "#a4de6c",
      "#d0ed57",
    ]
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard de Inventario</h1>

      {message && (
        <Alert className={`mb-6 ${message.type === "success" ? "bg-green-50" : "bg-red-50"}`}>
          <AlertTitle>{message.type === "success" ? "Éxito" : "Error"}</AlertTitle>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {lowStockProducts.length > 0 && (
        <Alert className="mb-6 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alerta de Stock Bajo</AlertTitle>
          <AlertDescription>
            {lowStockProducts.length} productos tienen stock bajo (5 o menos unidades).
            <ul className="mt-2 list-disc pl-5">
              {lowStockProducts.map((product) => (
                <li key={product.id}>
                  {product.name}: <Badge className="bg-red-500">{product.stock}</Badge> unidades
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total de Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{products.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Productos con Stock Bajo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-red-500">{lowStockProducts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Cambios de Stock Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{stockChanges.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="inventory">
        <TabsList className="mb-4">
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="chart">Gráfico de Stock</TabsTrigger>
          <TabsTrigger value="changes">Historial de Cambios</TabsTrigger>
          <TabsTrigger value="logs">Logs de Depuración</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
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
                      <TableHead>Categoría</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>{product.id}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>${product.price?.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={product.stock <= 5 ? "bg-red-500" : "bg-green-500"}>{product.stock}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={product.stock > 0 ? "bg-green-500" : "bg-red-500"}>
                            {product.stock > 0 ? "Disponible" : "Agotado"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={loadData} variant="outline" className="mr-2">
                <RefreshCw className="mr-2 h-4 w-4" />
                Actualizar Datos
              </Button>
              <Button onClick={processPendingOrders} disabled={processing}>
                {processing ? "Procesando..." : "Procesar Pedidos Pendientes"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Evolución del Stock</CardTitle>
              <CardDescription>
                Visualiza cómo ha cambiado el stock de tus productos a lo largo del tiempo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stockChartData.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stockChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {Object.keys(stockChartData[0] || {})
                        .filter((key) => key !== "date")
                        .map((key, index) => (
                          <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={getChartColors()[index % getChartColors().length]}
                            activeDot={{ r: 8 }}
                          />
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p>No hay suficientes datos para mostrar el gráfico.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="changes">
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
                        <TableCell>Producto #{change.product_id || "N/A"}</TableCell>
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

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Depuración</CardTitle>
              <CardDescription>
                Información detallada sobre el procesamiento de pedidos y actualizaciones de stock.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Cargando logs...</p>
              ) : debugLogs.length === 0 ? (
                <p>No hay logs de depuración registrados.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Mensaje</TableHead>
                      <TableHead>Datos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {debugLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                        <TableCell>{log.message}</TableCell>
                        <TableCell>
                          <pre className="text-xs max-h-24 overflow-y-auto">{JSON.stringify(log.data, null, 2)}</pre>
                        </TableCell>
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
