"use client"

import { useState, useEffect } from "react"
// import { createClient } from "@supabase/supabase-js"
import AdminLayout from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, CheckCircle, Package, RefreshCw, Search } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Tipos
interface Product {
  id: number
  name: string
  price: number
  stock: number
  category: string
  description?: string
  image_url?: string
}

interface Category {
  id: number
  name: string
}

export default function StockManagementPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newStock, setNewStock] = useState<number>(0)
  const [updateMessage, setUpdateMessage] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Crear cliente de Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  )

  // Cargar productos y categorías
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setError(null)

      try {
        // Cargar productos
        const { data: productsData, error: productsError } = await supabase.from("products").select("*").order("name")

        if (productsError) throw new Error(productsError.message)

        // Cargar categorías
        const { data: categoriesData, error: categoriesError } = await supabase
          .from("categories")
          .select("*")
          .order("name")

        if (categoriesError) throw new Error(categoriesError.message)

        setProducts(productsData || [])
        setCategories(categoriesData || [])
      } catch (err: any) {
        setError(err.message || "Error al cargar datos")
        console.error("Error al cargar datos:", err)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Filtrar productos
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.description || "").toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory.toString()

    return matchesSearch && matchesCategory
  })

  // Actualizar stock
  const updateStock = async () => {
    if (!editingProduct || newStock < 0) return

    setIsLoading(true)
    setUpdateMessage(null)

    try {
      const { error } = await supabase.from("products").update({ stock: newStock }).eq("id", editingProduct.id)

      if (error) throw new Error(error.message)

      // Actualizar la lista de productos
      setProducts(products.map((p) => (p.id === editingProduct.id ? { ...p, stock: newStock } : p)))

      setUpdateMessage({
        type: "success",
        message: `Stock de "${editingProduct.name}" actualizado a ${newStock} unidades`,
      })

      // Cerrar el editor
      setEditingProduct(null)
    } catch (err: any) {
      setUpdateMessage({
        type: "error",
        message: err.message || "Error al actualizar stock",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <Card className="bg-black/20 backdrop-blur-md text-white">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2 text-purple-500">
              <Package className="h-6 w-6" />
              Gestión de Stock
            </CardTitle>
            <CardDescription className="text-white/80">
              Administra el inventario de productos y actualiza las existencias
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Filtros */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Buscar productos..."
                    className="pl-8 bg-black/40 text-white border-gray-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="w-full md:w-64">
                <select
                  className="w-full p-2 border rounded-md bg-black/40 text-white border-gray-700"
                  value={selectedCategory === "all" ? "all" : selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value === "all" ? "all" : Number(e.target.value))}
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
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

            {updateMessage && (
              <Alert variant={updateMessage.type === "success" ? "default" : "destructive"} className="mb-4">
                {updateMessage.type === "success" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>{updateMessage.type === "success" ? "Éxito" : "Error"}</AlertTitle>
                <AlertDescription>{updateMessage.message}</AlertDescription>
              </Alert>
            )}

            {/* Tabla de productos */}
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-white">ID</TableHead>
                      <TableHead className="text-white">Producto</TableHead>
                      <TableHead className="text-white">Categoría</TableHead>
                      <TableHead className="text-white">Precio</TableHead>
                      <TableHead className="text-white">Stock</TableHead>
                      <TableHead className="text-white">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                          No se encontraron productos
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell className="text-white">{product.id}</TableCell>
                          <TableCell className="text-white">{product.name}</TableCell>
                          <TableCell className="text-white">
                            {categories.find((c) => c.id.toString() === product.category)?.name || product.category}
                          </TableCell>
                          <TableCell className="text-white">${product.price.toFixed(2)}</TableCell>
                          <TableCell>
                            <span
                              className={`font-medium ${product.stock <= 5 ? "text-red-600" : product.stock <= 10 ? "text-amber-600" : "text-green-600"}`}
                            >
                              {product.stock}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:from-purple-700 hover:to-purple-900"
                              onClick={() => {
                                setEditingProduct(product)
                                setNewStock(product.stock)
                              }}
                            >
                              Editar Stock
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Editor de stock */}
            {editingProduct && (
              <div className="mt-6 p-4 border rounded-md bg-black/20 backdrop-blur-md">
                <h3 className="text-lg font-medium mb-4 text-purple-500">Editar Stock: {editingProduct.name}</h3>
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="w-full sm:w-64">
                    <Label htmlFor="stock" className="text-white">
                      Nuevo Stock
                    </Label>
                    <Input
                      id="stock"
                      type="number"
                      min="0"
                      className="bg-black/40 text-white border-gray-700"
                      value={newStock}
                      onChange={(e) => setNewStock(Number.parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={updateStock}
                      disabled={isLoading}
                      className="bg-gradient-to-r from-purple-500 to-purple-700 text-white hover:from-purple-700 hover:to-purple-900"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Actualizando...
                        </>
                      ) : (
                        <>Guardar</>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setEditingProduct(null)}
                      disabled={isLoading}
                      className="text-white border-gray-700"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <div className="text-sm text-gray-500">Total: {filteredProducts.length} productos</div>
            <Button variant="outline" onClick={() => window.location.reload()} className="text-white border-gray-700">
              Actualizar Datos
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  )
}
