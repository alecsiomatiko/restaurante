"use client"

import { useState, useEffect } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { createClient } from "@/lib/supabase/client"
import { Save, ArrowRight } from "lucide-react"
import { toast } from "sonner"

type Product = {
  id: number
  name: string
  category_id: number | null
  price: number
  available: boolean
  active: boolean
}

type Category = {
  id: number
  name: string
}

export default function AssignCategoriesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)

      const [productsRes, categoriesRes] = await Promise.all([
        supabase.from("products").select("id, name, category_id, price, available, active").order("name"),
        supabase.from("categories").select("id, name").order("name"),
      ])

      if (productsRes.error) throw productsRes.error
      if (categoriesRes.error) throw categoriesRes.error

      setProducts(productsRes.data || [])
      setCategories(categoriesRes.data || [])
    } catch (error) {
      console.error("Error loading data:", error)
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  async function updateProductCategory(productId: number, categoryId: number | null) {
    try {
      const { error } = await supabase.from("products").update({ category_id: categoryId }).eq("id", productId)

      if (error) throw error

      setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, category_id: categoryId } : p)))

      toast.success("Categoría asignada correctamente")
    } catch (error) {
      console.error("Error updating category:", error)
      toast.error("Error al asignar categoría")
    }
  }

  async function autoAssignCategories() {
    setSaving(true)
    try {
      const updates = []

      // Auto-asignar basado en nombres
      for (const product of products) {
        let categoryId = null

        if (
          product.name.toLowerCase().includes("rib eye") ||
          product.name.toLowerCase().includes("t-bone") ||
          product.name.toLowerCase().includes("sirloin") ||
          product.name.toLowerCase().includes("new york") ||
          product.name.toLowerCase().includes("filete") ||
          product.name.toLowerCase().includes("medallone")
        ) {
          categoryId = categories.find((c) => c.name.includes("Premium"))?.id || null
        } else if (product.name.toLowerCase().includes("chistorra") || product.name.toLowerCase().includes("chorizo")) {
          categoryId = categories.find((c) => c.name.includes("Embutidos"))?.id || null
        }

        if (categoryId && product.category_id !== categoryId) {
          updates.push(updateProductCategory(product.id, categoryId))
        }
      }

      await Promise.all(updates)
      toast.success("Categorías asignadas automáticamente")
    } catch (error) {
      console.error("Error auto-assigning:", error)
      toast.error("Error en asignación automática")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="text-center py-8">Cargando...</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-amber-900">Asignar Productos a Categorías</h2>
          <button
            onClick={autoAssignCategories}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <Save size={18} className="mr-2" />
            {saving ? "Asignando..." : "Auto-Asignar"}
          </button>
        </div>

        <div className="space-y-4">
          {products.map((product) => (
            <div key={product.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-600">${product.price}</p>
                <div className="flex space-x-2 mt-1">
                  <span
                    className={`text-xs px-2 py-1 rounded ${product.available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                  >
                    {product.available ? "Disponible" : "No disponible"}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${product.active ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}
                  >
                    {product.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>

              <ArrowRight className="mx-4 text-gray-400" size={20} />

              <div className="flex-1">
                <select
                  value={product.category_id || ""}
                  onChange={(e) =>
                    updateProductCategory(product.id, e.target.value ? Number.parseInt(e.target.value) : null)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Sin categoría</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                {product.category_id && (
                  <p className="text-sm text-green-600 mt-1">
                    ✓ Asignado a: {categories.find((c) => c.id === product.category_id)?.name}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Resumen:</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Total productos:</span> {products.length}
            </div>
            <div>
              <span className="font-medium">Con categoría:</span> {products.filter((p) => p.category_id).length}
            </div>
            <div>
              <span className="font-medium">Sin categoría:</span> {products.filter((p) => !p.category_id).length}
            </div>
            <div>
              <span className="font-medium">Activos:</span> {products.filter((p) => p.active && p.available).length}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
