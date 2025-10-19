"use client"

import { useState, useEffect } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { createClient } from "@/lib/supabase/client"
import { Plus, Edit, Trash2, Save, X, ImageIcon, Upload } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"

type Category = {
  id: number
  name: string
  description?: string
  subtitle?: string
  image_url?: string
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    subtitle: "",
    image_url: "",
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [uploadingImage, setUploadingImage] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("categories").select("*").order("name")
      if (error) throw error
      setCategories(data || [])
    } catch (error) {
      console.error("Error al cargar categorías:", error)
      toast.error("Error al cargar categorías")
    } finally {
      setLoading(false)
    }
  }

  async function uploadImage(file: File, categoryId?: number): Promise<string | null> {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Error al subir imagen")
      }

      const data = await response.json()
      return data.url
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Error al subir imagen")
      return null
    }
  }

  async function handleImageUpload(file: File, categoryId?: number) {
    if (categoryId) {
      setUploadingImage(categoryId)
    }

    const imageUrl = await uploadImage(file)

    if (imageUrl) {
      if (categoryId) {
        await handleUpdateCategory(categoryId, { image_url: imageUrl })
      } else {
        setNewCategory({ ...newCategory, image_url: imageUrl })
      }
      toast.success("Imagen subida correctamente")
    }

    setUploadingImage(null)
  }

  async function handleAddCategory() {
    if (!newCategory.name.trim()) {
      toast.error("El nombre de la categoría es requerido")
      return
    }

    try {
      const { data, error } = await supabase.from("categories").insert([newCategory]).select()
      if (error) throw error
      toast.success("Categoría creada correctamente")
      setNewCategory({ name: "", description: "", subtitle: "", image_url: "" })
      setShowAddForm(false)
      fetchCategories()
    } catch (error) {
      console.error("Error al crear categoría:", error)
      toast.error("Error al crear categoría")
    }
  }

  async function handleUpdateCategory(id: number, categoryData: Partial<Category>) {
    try {
      const { error } = await supabase.from("categories").update(categoryData).eq("id", id)
      if (error) throw error
      toast.success("Categoría actualizada correctamente")
      setEditingCategory(null)
      fetchCategories()
    } catch (error) {
      console.error("Error al actualizar categoría:", error)
      toast.error("Error al actualizar categoría")
    }
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm("¿Estás seguro de que deseas eliminar esta categoría?")) return

    try {
      const { error } = await supabase.from("categories").delete().eq("id", id)
      if (error) throw error
      toast.success("Categoría eliminada correctamente")
      fetchCategories()
    } catch (error) {
      console.error("Error al eliminar categoría:", error)
      toast.error("Error al eliminar categoría")
    }
  }

  const ImageUploadButton = ({ categoryId, currentImageUrl }: { categoryId?: number; currentImageUrl?: string }) => (
    <div className="space-y-2">
      <label className="block">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleImageUpload(file, categoryId)
          }}
          className="hidden"
        />
        <div className="flex items-center justify-center w-full h-32 border-2 border-dashed border-purple-500/50 rounded-lg cursor-pointer hover:border-purple-400 transition-colors bg-purple-900/20 backdrop-blur-sm">
          {uploadingImage === categoryId ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-2"></div>
              <span className="text-sm text-purple-300">Subiendo...</span>
            </div>
          ) : currentImageUrl ? (
            <div className="relative w-full h-full">
              <Image
                src={currentImageUrl || "/placeholder.svg"}
                alt="Preview"
                fill
                className="object-cover rounded-lg"
              />
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                <Upload className="h-8 w-8 text-white" />
              </div>
            </div>
          ) : (
            <div className="text-center">
              <Upload className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <span className="text-sm text-purple-300">Subir imagen</span>
            </div>
          )}
        </div>
      </label>
    </div>
  )

  return (
    <AdminLayout>
      <div className="bg-white/5 backdrop-blur-md border border-purple-800/50 rounded-lg shadow-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Gestión de Categorías</h2>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-md hover:from-purple-700 hover:to-pink-700 transition-all"
          >
            <Plus size={18} className="mr-2" />
            Nueva Categoría
          </button>
        </div>

        {showAddForm && (
          <div className="bg-purple-900/30 backdrop-blur-sm p-4 rounded-lg mb-6 border border-purple-800/50">
            <h3 className="text-lg font-semibold text-white mb-4">Nueva Categoría</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full p-2 border border-purple-600/50 rounded-md bg-purple-900/30 text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ej: Cortes Premium"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-1">Subtítulo</label>
                <input
                  type="text"
                  value={newCategory.subtitle}
                  onChange={(e) => setNewCategory({ ...newCategory, subtitle: e.target.value })}
                  className="w-full p-2 border border-purple-600/50 rounded-md bg-purple-900/30 text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ej: Los mejores cortes para tu asada"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-purple-200 mb-1">Descripción</label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full p-2 border border-purple-600/50 rounded-md bg-purple-900/30 text-white placeholder-purple-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows={3}
                  placeholder="Descripción detallada de la categoría"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-purple-200 mb-1">Imagen de la Categoría</label>
                <ImageUploadButton currentImageUrl={newCategory.image_url} />
                {newCategory.image_url && (
                  <div className="mt-2 text-sm text-green-400">✓ Imagen cargada correctamente</div>
                )}
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <button
                onClick={handleAddCategory}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md hover:from-green-700 hover:to-emerald-700 transition-all"
              >
                <Save size={18} className="mr-2" />
                Guardar
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewCategory({ name: "", description: "", subtitle: "", image_url: "" })
                }}
                className="flex items-center px-4 py-2 bg-gray-600/50 text-white rounded-md hover:bg-gray-600/70 transition-all"
              >
                <X size={18} className="mr-2" />
                Cancelar
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-center py-4 text-purple-300">Cargando categorías...</p>
        ) : categories.length === 0 ? (
          <p className="text-center py-4 text-purple-300">No hay categorías disponibles</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white/5 backdrop-blur-sm border border-purple-800/50 rounded-lg overflow-hidden shadow-lg"
              >
                <div className="h-48 bg-purple-900/30 relative">
                  {editingCategory?.id === category.id ? (
                    <ImageUploadButton categoryId={category.id} currentImageUrl={editingCategory.image_url} />
                  ) : category.image_url ? (
                    <Image
                      src={category.image_url || "/placeholder.svg"}
                      alt={category.name}
                      fill
                      className="object-cover"
                      onError={() => toast.error(`Error al cargar imagen de ${category.name}`)}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon size={48} className="text-purple-400" />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {editingCategory?.id === category.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                        className="w-full p-2 border border-purple-600/50 rounded-md font-semibold bg-purple-900/30 text-white"
                      />
                      <input
                        type="text"
                        value={editingCategory.subtitle || ""}
                        onChange={(e) => setEditingCategory({ ...editingCategory, subtitle: e.target.value })}
                        className="w-full p-2 border border-purple-600/50 rounded-md text-sm bg-purple-900/30 text-white"
                        placeholder="Subtítulo"
                      />
                      <textarea
                        value={editingCategory.description || ""}
                        onChange={(e) => setEditingCategory({ ...editingCategory, description: e.target.value })}
                        className="w-full p-2 border border-purple-600/50 rounded-md text-sm bg-purple-900/30 text-white"
                        rows={2}
                        placeholder="Descripción"
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleUpdateCategory(category.id, editingCategory)}
                          className="flex items-center px-3 py-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-md hover:from-green-700 hover:to-emerald-700 text-sm transition-all"
                        >
                          <Save size={14} className="mr-1" />
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="flex items-center px-3 py-1 bg-gray-600/50 text-white rounded-md hover:bg-gray-600/70 text-sm transition-all"
                        >
                          <X size={14} className="mr-1" />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="font-semibold text-white mb-1">{category.name}</h3>
                      {category.subtitle && <p className="text-sm text-purple-300 italic mb-2">{category.subtitle}</p>}
                      {category.description && <p className="text-sm text-purple-200 mb-3">{category.description}</p>}
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setEditingCategory(category)}
                          className="flex items-center px-3 py-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-md hover:from-blue-700 hover:to-cyan-700 text-sm transition-all"
                        >
                          <Edit size={14} className="mr-1" />
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="flex items-center px-3 py-1 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-md hover:from-red-700 hover:to-pink-700 text-sm transition-all"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
