"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Star, Zap, Rocket, ShoppingCart, Plus, Minus, AlertCircle } from "lucide-react"
import { useCart } from "@/hooks/use-cart"
import { useProducts } from "@/hooks/use-products"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-notifications"
import Image from "next/image"

interface CartQuantity {
  [productId: number]: number
}

export default function MenuPageClient() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [cartQuantities, setCartQuantities] = useState<CartQuantity>({})
  
  const { products, categories, loading, error, fetchProducts, fetchCategories } = useProducts()
  const { addItem, items } = useCart()
  const { user } = useAuth()
  const toast = useToast()

  useEffect(() => {
    fetchProducts()
    if (typeof fetchCategories === 'function') {
      fetchCategories()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Solo cargar una vez al montar

  const filteredProducts = products.filter((product) => {
    const matchesSearch = searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === "all" || 
      product.category_id === parseInt(selectedCategory)
    
    return matchesSearch && matchesCategory && product.available
  })

  const featuredProducts = products.filter((product) => product.available)

  const handleQuantityChange = (productId: number, change: number) => {
    setCartQuantities(prev => {
      const current = prev[productId] || 0
      const newQuantity = Math.max(0, current + change)
      return { ...prev, [productId]: newQuantity }
    })
  }

  const handleAddToCart = (product: any) => {
    const quantity = cartQuantities[product.id] || 1
    addItem(product, quantity)
    
    // Reset quantity
    setCartQuantities(prev => ({ ...prev, [product.id]: 0 }))
    
    // Animación de imagen volando al carrito
    const productCard = document.querySelector(`[data-product-id="${product.id}"]`) as HTMLElement
    const productImage = productCard?.querySelector('img')
    
    if (productImage) {
      const clone = productImage.cloneNode(true) as HTMLElement
      const rect = productImage.getBoundingClientRect()
      
      clone.style.position = 'fixed'
      clone.style.top = rect.top + 'px'
      clone.style.left = rect.left + 'px'
      clone.style.width = rect.width + 'px'
      clone.style.height = rect.height + 'px'
      clone.style.zIndex = '9999'
      clone.style.pointerEvents = 'none'
      clone.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
      clone.style.borderRadius = '50%'
      
      document.body.appendChild(clone)
      
      // Buscar el floating cart
      const floatingCart = document.querySelector('[data-floating-cart]') as HTMLElement
      
      setTimeout(() => {
        if (floatingCart) {
          const cartRect = floatingCart.getBoundingClientRect()
          clone.style.top = cartRect.top + cartRect.height/2 - 10 + 'px'
          clone.style.left = cartRect.left + cartRect.width/2 - 10 + 'px'
          clone.style.width = '20px'
          clone.style.height = '20px'
          clone.style.opacity = '0'
        }
        
        setTimeout(() => {
          document.body.removeChild(clone)
        }, 800)
      }, 50)
    }
  }

  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase()
    if (name.includes("burger") || name.includes("hamburguesa")) return "🍔"
    if (name.includes("wing") || name.includes("alita")) return "🍗"
    if (name.includes("bebida") || name.includes("drink")) return "🥤"
    if (name.includes("postre") || name.includes("dessert")) return "🍰"
    if (name.includes("entrada") || name.includes("appetizer")) return "🍟"
    return "🚀"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <div className="inline-flex items-center space-x-2 text-purple-300">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
              <span>Cargando menú cósmico...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-20">
            <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Error al cargar el menú</h2>
            <p className="text-red-300 mb-4">{error}</p>
            <Button onClick={() => fetchProducts()} className="bg-purple-600 hover:bg-purple-700">
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative py-12 bg-black">
      {/* Nebula Background */}
  <div className="absolute inset-0 z-0 bg-[url('/cosmic-background.png')] bg-cover bg-center opacity-60"></div>
      <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
      {/* Optionally, keep floating particles for extra cosmic effect */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="absolute top-20 left-10 w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-pink-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-32 left-1/4 w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-purple-300 rounded-full animate-ping"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent mb-4">
            Menú Galáctico
          </h1>
          <p className="text-xl text-gray-300 mb-6">Sabores que están fuera de este mundo</p>
          <div className="flex items-center justify-center space-x-2 text-purple-300">
            <Rocket className="h-5 w-5" />
            <span>Delivery intergaláctico disponible</span>
            <Rocket className="h-5 w-5" />
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-purple-300" />
              <Input
                type="text"
                placeholder="Buscar en el universo gastronómico..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/10 border-purple-300/30 text-white placeholder:text-purple-300"
              />
            </div>
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="bg-black/30 border-purple-500/20">
              <TabsTrigger value="all" className="text-white data-[state=active]:bg-purple-600">
                🌌 Todos
              </TabsTrigger>
              {categories.map((category) => (
                <TabsTrigger
                  key={category.id}
                  value={category.id.toString()}
                  className="text-white data-[state=active]:bg-purple-600"
                >
                  {getCategoryIcon(category.name)} {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No se encontraron productos
            </h3>
            <p className="text-purple-300">
              Intenta con una búsqueda diferente o explora otras categorías
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const quantity = cartQuantities[product.id] || 1
              const category = categories.find(c => c.id === product.category_id)
              
              return (
                <Card
                  key={product.id}
                  data-product-id={product.id}
                  className="backdrop-blur-sm bg-white/10 border-purple-500/20 hover:bg-white/20 transition-all duration-300 hover:scale-105"
                >
                  <CardHeader className="pb-3">
                    <div className="relative aspect-square mb-4 rounded-lg overflow-hidden bg-black/30">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          className="object-contain w-full h-full"
                          style={{ aspectRatio: '1 / 1' }}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = "none"
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center aspect-square bg-gradient-to-br from-purple-600 to-pink-600">
                          <span className="text-4xl">
                            {getCategoryIcon(category?.name || '')}
                          </span>
                        </div>
                      )}
                      
                      {/* Featured badge */}
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-orange-500 text-white">
                          <Star className="h-3 w-3 mr-1" />
                          Estelar
                        </Badge>
                      </div>
                    </div>

                    <CardTitle className="text-white text-lg">
                      {product.name}
                    </CardTitle>
                    
                    {category && (
                      <Badge variant="outline" className="w-fit text-purple-300 border-purple-300">
                        {category.name}
                      </Badge>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-purple-200 text-sm line-clamp-2">
                      {product.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-orange-400">
                        ${Number(product.price).toFixed(2)}
                      </span>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantityChange(product.id, -1)}
                          className="h-8 w-8 p-0 border-purple-400 text-purple-300 hover:bg-purple-600 hover:text-white"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="text-white font-medium w-8 text-center">
                          {quantity}
                        </span>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleQuantityChange(product.id, 1)}
                          className="h-8 w-8 p-0 border-purple-400 text-purple-300 hover:bg-purple-600 hover:text-white"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <Button
                      onClick={() => handleAddToCart(product)}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Agregar al Carrito
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Footer message */}
        <div className="text-center mt-12 p-6 bg-black/30 rounded-lg border border-purple-500/20">
          <h3 className="text-xl font-semibold text-white mb-2">
            🚀 ¡Prepárate para el despegue!
          </h3>
          <p className="text-purple-300">
            Cada producto está cuidadosamente preparado con ingredientes de la más alta calidad galáctica
          </p>
        </div>
      </div>
    </div>
  )
}