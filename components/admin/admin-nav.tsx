"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  MessageSquare,
  Truck,
  BarChart3,
  Tags,
  Star,
  Settings,
  TrendingUp,
  Building2,
  PieChart,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Pedidos", href: "/admin/orders", icon: ShoppingCart },
  { name: "Productos", href: "/admin/products", icon: Package },
  { name: "Productos Destacados", href: "/admin/featured-products", icon: Star },
  { name: "Categorías", href: "/admin/categories", icon: Tags },
  { name: "Reportes", href: "/admin/reportes", icon: TrendingUp },
  { name: "Usuarios", href: "/admin/users", icon: Users },
  { name: "Delivery", href: "/admin/delivery", icon: Truck },
  { name: "Estadísticas Drivers", href: "/admin/driver-stats", icon: TrendingUp },
  { name: "Inventario", href: "/admin/inventory-dashboard", icon: BarChart3 },
  { name: "WhatsApp", href: "/admin/whatsapp", icon: MessageSquare },
  { name: "Configuración Empresa", href: "/admin/configuracion-empresa", icon: Building2 },
  { name: "Configuración", href: "/admin/settings", icon: Settings },
]

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`
              group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200
              ${
                isActive
                  ? "bg-gradient-to-r from-purple-600/50 to-pink-600/50 text-white border border-purple-500/50 shadow-lg"
                  : "text-purple-200 hover:bg-purple-800/30 hover:text-white border border-transparent"
              }
            `}
          >
            <item.icon
              className={`
                mr-3 h-5 w-5 flex-shrink-0 transition-colors
                ${isActive ? "text-purple-300" : "text-purple-400 group-hover:text-purple-300"}
              `}
            />
            {item.name}
          </Link>
        )
      })}
    </nav>
  )
}
