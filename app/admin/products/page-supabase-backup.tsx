"use client"

import type React from "react"

import { useState, useEffect } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { createClient } from "@/lib/supabase/client"
import { Plus, Search, Edit, Trash2, Save, X, History, Upload, Eye } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import ProductImageManager from "@/components/admin/product-image-manager"

type Product = {
  id: number
  name: string
  description: string
  price: number
  image_url: string
  category_id: number | null // ✅ Cambiado a category_id
  stock: number
  available: boolean // ✅ Cambiado a available
  active: boolean // ✅ Mantener para compatibilidad
}

type Category = {
  id: number
  name: string
}

type StockChange = {
  id: number
  product_id: number
  previous_stock: number
  new_stock: number
  change_amount: number
  change_type: string
  reference_id?: number
  notes?: string
  timestamp: string
}

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    description: "",
    price: 0,
    image_url: "",
    category_id: null, // ✅ Cambiado a category_id
    stock: 0,
    available: true, // ✅ Cambiado a available
    active: true,
  })
  const [showNewProductForm, setShowNewProductForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null)
  const [stockHistory, setStockHistory] = useState<StockChange[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [updatingStock, setUpdatingStock] = useState<number | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState<number | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchProducts()
    fetchCategories()
  }, [])

  async function fetchProducts() {
    try {
      setLoading(true)
      // ✅ Incluir categorías en la consulta para mostrar nombres
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          categories(id, name)
        `)
        .order("name")

      if (error) throw error

      // ✅ Mapear para incluir el nombre de categoría
      const productsWithCategory =
        data?.map((product) => ({
          ...product,
          category_name: product.categories?.name || "Sin categoría",
        })) || []

      setProducts(productsWithCategory)
    } catch (error) {
      console.error("Error al cargar productos:", error)
      toast.error("Error al cargar productos")
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name")
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error al cargar categorías:", error)
    }
  }

  async function fetchStockHistory(productId: number) {
    try {
      setLoadingHistory(true)
      setSelectedProduct(productId)

      const { error: tableCheckError } = await supabase.from("stock_changes").select("id").limit(1)

      if (tableCheckError && tableCheckError.message.includes("does not exist")) {
        setStockHistory([])
        toast.error("La tabla de historial de stock no existe todavía")
        return
      }

      const { data, error } = await supabase
        .from("stock_changes")
        .select("*")
        .eq("product_id", productId)
        .order("timestamp", { ascending: false })

      if (error) throw error
      setStockHistory(data || [])
    } catch (error) {
      console.error("Error al cargar historial de stock:", error)
      toast.error("Error al cargar historial de stock")
    } finally {
      setLoadingHistory(false)
    }
  }

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.category_name && product.category_name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  async function handleImageUpload(file: File, productId?: number) {
    try {
      if (productId) setUploadingImage(productId)

      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Error al subir imagen")
      }

      const { url } = await response.json()

      if (productId) {
        const { error } = await supabase.from("products").update({ image_url: url }).eq("id", productId)

        if (error) throw error

        setProducts(products.map((p) => (p.id === productId ? { ...p, image_url: url } : p)))
        toast.success("Imagen actualizada correctamente")
      } else {
        if (editingProduct) {
          setEditingProduct({ ...editingProduct, image_url: url })
        } else {
          setNewProduct({ ...newProduct, image_url: url })
        }
        toast.success("Imagen cargada correctamente")
      }

      return url
    } catch (error) {
      console.error("Error al subir imagen:", error)
      toast.error("Error al subir imagen")
    } finally {
      if (productId) setUploadingImage(null)
    }
  }

  async function handleSaveProduct(product: Partial<Product>) {
    try {
      // ✅ Validar que tenga categoría
      if (!product.category_id) {
        toast.error("Debe seleccionar una categoría")
        return
      }

      const productData = {
        name: product.name,
        description: product.description,
        price: product.price,
        image_url: product.image_url,
        category_id: product.category_id, // ✅ Usar category_id
        stock: product.stock,
        available: product.available, // ✅ Usar available
        active: product.available, // ✅ Sincronizar con available
      }

      if (editingProduct) {
        const { error } = await supabase.from("products").update(productData).eq("id", editingProduct.id)

        if (error) throw error
        toast.success("Producto actualizado correctamente")
        setEditingProduct(null)
      } else {
        const { error } = await supabase.from("products").insert([productData])
        if (error) throw error
        toast.success("Producto creado correctamente")
        setShowNewProductForm(false)
        setNewProduct({
          name: "",
          description: "",
          price: 0,
          image_url: "",
          category_id: null,
          stock: 0,
          available: true,
          active: true,
        })
      }

      // ✅ Refrescar productos inmediatamente
      await fetchProducts()
    } catch (error) {
      console.error("Error al guardar producto:", error)
      toast.error("Error al guardar producto")
    }
  }

  async function handleDeleteProduct(id: number) {
    if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) return

    try {
      const { error } = await supabase.from("products").delete().eq("id", id)
      if (error) throw error
      toast.success("Producto eliminado correctamente")

      // ✅ Refrescar productos inmediatamente
      await fetchProducts()
    } catch (error) {
      console.error("Error al eliminar producto:", error)
      toast.error("Error al eliminar producto")
    }
  }

  async function handleUpdateStock(id: number, newStock: number) {
    try {
      setUpdatingStock(id)

      const response = await fetch("/api/admin/stock/direct-update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: id,
          newStock,
          notes: "Actualización manual desde panel de administración",
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || "Error al actualizar stock")
      }

      toast.success("Stock actualizado correctamente")
      setProducts(products.map((p) => (p.id === id ? { ...p, stock: newStock } : p)))
    } catch (error: any) {
      console.error("Error al actualizar stock:", error)
      toast.error(`Error al actualizar stock: ${error.message || "Error desconocido"}`)
    } finally {
      setUpdatingStock(null)
    }
  }

  function ProductForm({
    product,
    onSave,
    onCancel,
  }: { product: Partial<Product>; onSave: (product: Partial<Product>) => void; onCancel: () => void }) {
    const [formData, setFormData] = useState<Partial<Product>>(product)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target

      if (name === "category_id") {
        // ✅ Convertir a número para category_id
        setFormData({
          ...formData,
          [name]: value ? Number.parseInt(value) : null,
        })
      } else {
        setFormData({
          ...formData,
          [name]: type === "number" ? Number.parseFloat(value) : value,
        })
      }
    }

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, checked } = e.target
      setFormData({
        ...formData,
        [name]: checked,
        // ✅ Sincronizar available y active
        ...(name === "available" && { active: checked }),
      })
    }

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault()
      onSave(formData)
    }

    return (
      <form
        onSubmit={handleSubmit}
        className="bg-purple-900/30 backdrop-blur-sm p-6 rounded-lg shadow-md mb-6 border border-purple-700/50"
      >
        <h3 className="text-xl font-bold text-white mb-4">{product.id ? "Editar Producto" : "Nuevo Producto"}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-1">Nombre</label>
            <input
              type="text"
              name="name"
              value={formData.name || ""}
              onChange={handleChange}
              className="w-full p-2 bg-purple-900/50 border border-purple-700/50 rounded-md text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-1">Categoría</label>
            <select
              name="category_id"
              value={formData.category_id || ""}
              onChange={handleChange}
              className="w-full p-2 bg-purple-900/50 border border-purple-700/50 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            >
              <option value="" className="bg-purple-900">
                Seleccionar categoría
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id} className="bg-purple-900">
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-1">Precio</label>
            <input
              type="number"
              name="price"
              value={formData.price || 0}
              onChange={handleChange}
              className="w-full p-2 bg-purple-900/50 border border-purple-700/50 rounded-md text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              min="0"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-purple-300 mb-1">Stock</label>
            <input
              type="number"
              name="stock"
              value={formData.stock || 0}
              onChange={handleChange}
              className="w-full p-2 bg-purple-900/50 border border-purple-700/50 rounded-md text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              min="0"
              required
            />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-purple-300 mb-1">Imágenes del Producto</label>
            {product.id && <ProductImageManager productId={product.id} />}
            {!product.id && (
              <div className="p-4 border-2 border-dashed border-purple-700/50 rounded-md text-center text-purple-400">
                Guarda el producto primero para gestionar imágenes
              </div>
            )}
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="available"
              checked={formData.available || false}
              onChange={handleCheckboxChange}
              className="mr-2 accent-purple-600"
            />
            <label className="text-sm font-medium text-purple-300">Disponible para venta</label>
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-purple-300 mb-1">Descripción</label>
          <textarea
            name="description"
            value={formData.description || ""}
            onChange={handleChange}
            className="w-full p-2 bg-purple-900/50 border border-purple-700/50 rounded-md text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            rows={3}
            required
          ></textarea>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-purple-900/50 text-purple-200 rounded-md hover:bg-purple-800/50 transition-colors border border-purple-700/50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
          >
            Guardar
          </button>
        </div>
      </form>
    )
  }

  function StockHistoryModal() {
    if (!selectedProduct) return null

    const product = products.find((p) => p.id === selectedProduct)

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
          <div className="p-4 bg-amber-50 border-b border-amber-200 flex justify-between items-center">
            <h3 className="text-xl font-bold text-amber-900">Historial de Stock: {product?.name}</h3>
            <button onClick={() => setSelectedProduct(null)} className="text-amber-900 hover:text-amber-700">
              <X size={24} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(80vh-4rem)]">
            {loadingHistory ? (
              <p className="text-center py-4">Cargando historial...</p>
            ) : stockHistory.length === 0 ? (
              <p className="text-center py-4">No hay registros de cambios de stock para este producto</p>
            ) : (
              <table className="min-w-full divide-y divide-amber-200">
                <thead className="bg-amber-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                      Stock Anterior
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                      Nuevo Stock
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                      Cambio
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                      Referencia
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-amber-900 uppercase tracking-wider">
                      Notas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-amber-100">
                  {stockHistory.map((change) => (
                    <tr key={change.id} className="hover:bg-amber-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {new Date(change.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{change.previous_stock}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{change.new_stock}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        <span className={change.change_amount < 0 ? "text-red-600" : "text-green-600"}>
                          {change.change_amount > 0 ? `+${change.change_amount}` : change.change_amount}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {change.change_type === "order"
                          ? "Pedido"
                          : change.change_type === "manual"
                            ? "Manual"
                            : change.change_type === "return"
                              ? "Devolución"
                              : change.change_type === "adjustment"
                                ? "Ajuste"
                                : change.change_type}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {change.reference_id ? (
                          change.change_type === "order" ? (
                            <Link
                              href={`/admin/orders/${change.reference_id}`}
                              className="text-blue-600 hover:underline"
                            >
                              Pedido #{change.reference_id}
                            </Link>
                          ) : (
                            change.reference_id
                          )
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{change.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    )
  }

  function ImagePreviewModal() {
    if (!previewImage) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="relative max-w-4xl max-h-[90vh]">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75"
          >
            <X size={24} />
          </button>
          <img
            src={previewImage || "/placeholder.svg"}
            alt="Preview"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <div className="bg-black/50 backdrop-blur-md rounded-lg shadow-xl p-6 border border-purple-800/50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Gestión de Productos</h2>
          <button
            onClick={() => setShowNewProductForm(!showNewProductForm)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
          >
            {showNewProductForm ? <X size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
            {showNewProductForm ? "Cancelar" : "Nuevo Producto"}
          </button>
        </div>

        {authError && (
          <div className="bg-red-900/50 backdrop-blur-md border border-red-500/50 text-red-200 px-4 py-3 rounded-lg mb-4">
            <p className="font-bold">Error de autenticación</p>
            <p>{authError}</p>
          </div>
        )}

        {showNewProductForm && (
          <ProductForm
            product={newProduct}
            onSave={handleSaveProduct}
            onCancel={() => {
              setShowNewProductForm(false)
              setNewProduct({
                name: "",
                description: "",
                price: 0,
                image_url: "",
                category_id: null,
                stock: 0,
                available: true,
                active: true,
              })
            }}
          />
        )}

        {editingProduct && (
          <ProductForm product={editingProduct} onSave={handleSaveProduct} onCancel={() => setEditingProduct(null)} />
        )}

        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar productos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 bg-purple-900/50 border border-purple-700/50 rounded-md text-white placeholder-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <Search className="absolute left-3 top-2.5 text-purple-400" size={18} />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-400"></div>
              <p className="text-purple-200">Cargando productos...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <p className="text-center py-8 text-purple-200">No se encontraron productos</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-purple-900/30">
                <tr>
                  <th className="py-3 px-4 text-left text-purple-300 text-sm font-medium uppercase tracking-wider">
                    Imagen
                  </th>
                  <th className="py-3 px-4 text-left text-purple-300 text-sm font-medium uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="py-3 px-4 text-left text-purple-300 text-sm font-medium uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="py-3 px-4 text-left text-purple-300 text-sm font-medium uppercase tracking-wider">
                    Precio
                  </th>
                  <th className="py-3 px-4 text-left text-purple-300 text-sm font-medium uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="py-3 px-4 text-left text-purple-300 text-sm font-medium uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="py-3 px-4 text-left text-purple-300 text-sm font-medium uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-800/30">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-purple-900/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {product.image_url ? (
                          <div className="relative">
                            <img
                              src={product.image_url || "/placeholder.svg"}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-md border border-purple-700/50 cursor-pointer"
                              onClick={() => setPreviewImage(product.image_url)}
                            />
                            <button
                              onClick={() => setPreviewImage(product.image_url)}
                              className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-25 rounded-md transition-all flex items-center justify-center"
                            >
                              <Eye size={16} className="text-white opacity-0 hover:opacity-100" />
                            </button>
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-purple-900/30 rounded-md flex items-center justify-center border border-purple-700/50">
                            <span className="text-purple-400 text-xs">Sin imagen</span>
                          </div>
                        )}
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                await handleImageUpload(file, product.id)
                              }
                            }}
                          />
                          {uploadingImage === product.id ? (
                            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Upload size={16} className="text-purple-400 hover:text-purple-300" />
                          )}
                        </label>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-purple-200">{product.name}</td>
                    <td className="py-3 px-4 text-purple-200">{product.category_name}</td>
                    <td className="py-3 px-4 text-purple-200">${product.price.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        <input
                          type="number"
                          min="0"
                          value={product.stock}
                          onChange={(e) => {
                            const newStock = Number.parseInt(e.target.value)
                            if (!isNaN(newStock) && newStock >= 0) {
                              const updatedProducts = products.map((p) =>
                                p.id === product.id ? { ...p, stock: newStock } : p,
                              )
                              setProducts(updatedProducts)
                            }
                          }}
                          className="w-16 p-1 bg-purple-900/50 border border-purple-700/50 rounded-md text-center text-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          onClick={() => handleUpdateStock(product.id, product.stock)}
                          className="ml-2 text-purple-400 hover:text-purple-300"
                          title="Guardar stock"
                          disabled={updatingStock === product.id}
                        >
                          {updatingStock === product.id ? (
                            <span className="inline-block w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
                          ) : (
                            <Save size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => fetchStockHistory(product.id)}
                          className="ml-2 text-blue-400 hover:text-blue-300"
                          title="Ver historial de stock"
                        >
                          <History size={16} />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          product.available
                            ? "bg-green-900/50 text-green-300 border border-green-700/50"
                            : "bg-red-900/50 text-red-300 border border-red-700/50"
                        }`}
                      >
                        {product.available ? "Disponible" : "No disponible"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedProduct && <StockHistoryModal />}
      {previewImage && <ImagePreviewModal />}
    </AdminLayout>
  )
}
