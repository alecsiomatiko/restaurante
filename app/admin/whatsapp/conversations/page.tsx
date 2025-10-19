"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { Trash, RefreshCw, MessageSquare } from "lucide-react"

export default function WhatsAppConversationsPage() {
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const supabase = createClient()

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select(`
          id,
          phone_number,
          platform,
          status,
          created_at,
          updated_at,
          chat_messages(count)
        `)
        .order("updated_at", { ascending: false })

      if (error) throw error
      setConversations(data || [])
    } catch (error) {
      console.error("Error al cargar conversaciones:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las conversaciones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteConversation = async (id: string) => {
    try {
      const { error } = await supabase.from("chat_conversations").delete().eq("id", id)
      if (error) throw error

      setConversations(conversations.filter((conv) => conv.id !== id))
      toast({
        title: "Éxito",
        description: "Conversación eliminada correctamente",
      })
    } catch (error) {
      console.error("Error al eliminar conversación:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la conversación",
        variant: "destructive",
      })
    }
  }

  const deleteAllConversations = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar todas las conversaciones? Esta acción no se puede deshacer.")) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await fetch("/api/whatsapp/conversations", {
        method: "DELETE",
      }).then((res) => res.json())

      if (error) throw error

      setConversations([])
      toast({
        title: "Éxito",
        description: "Todas las conversaciones han sido eliminadas",
      })
    } catch (error) {
      console.error("Error al eliminar todas las conversaciones:", error)
      toast({
        title: "Error",
        description: "No se pudieron eliminar todas las conversaciones",
        variant: "destructive",
      })
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    fetchConversations()
  }, [])

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Conversaciones</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchConversations} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </Button>
          <Button
            variant="destructive"
            onClick={deleteAllConversations}
            disabled={deleting || conversations.length === 0}
          >
            <Trash className="mr-2 h-4 w-4" />
            Eliminar Todas
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-lg">Cargando conversaciones...</p>
        </div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center h-64">
              <MessageSquare className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg text-gray-500">No hay conversaciones disponibles</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {conversations.map((conversation) => (
            <Card key={conversation.id}>
              <CardHeader>
                <CardTitle className="flex justify-between">
                  <span>Conversación con {conversation.phone_number}</span>
                  <span
                    className={`text-sm px-2 py-1 rounded ${
                      conversation.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {conversation.status === "active" ? "Activa" : "Inactiva"}
                  </span>
                </CardTitle>
                <CardDescription>
                  Plataforma: {conversation.platform} | Creada: {new Date(conversation.created_at).toLocaleString()} |
                  Última actualización: {new Date(conversation.updated_at).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">
                  {conversation.chat_messages.count} mensajes en esta conversación
                </p>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button variant="destructive" size="sm" onClick={() => deleteConversation(conversation.id)}>
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
