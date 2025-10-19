"use client"

import AdminLayout from "@/components/admin/admin-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Construction, MessageSquare } from "lucide-react"
import Link from "next/link"

export default function WhatsAppPage() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            Integración WhatsApp
          </h1>
          <p className="text-muted-foreground">
            Gestión de pedidos y mensajes automáticos via WhatsApp
          </p>
        </div>

        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
          <CardContent className="p-8 text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-green-600 dark:text-green-400" />
            <h3 className="text-xl font-semibold mb-2 text-green-800 dark:text-green-200">
              WhatsApp Business
            </h3>
            <p className="text-green-700 dark:text-green-300 mb-6">
              La integración con WhatsApp está siendo actualizada para mejorar 
              la experiencia de pedidos automatizados.
            </p>
            <div className="flex gap-4 justify-center">
              <Button asChild variant="outline" className="border-green-600 text-green-700 hover:bg-green-100">
                <Link href="/admin/orders">Ver Órdenes</Link>
              </Button>
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/admin/dashboard">Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}