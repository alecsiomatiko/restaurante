"use client"

import { useEffect, useState } from "react"
// import { createClient } from "@supabase/supabase-js"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import Link from "next/link"
import { Settings, Send, Trash2, AlertTriangle } from "lucide-react"

// Crear cliente de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
)

export default function WhatsAppAdmin() {
  const [conversations, setConversations] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<"all" | string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Cargar conversaciones
  useEffect(() => {
    async function loadConversations() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("chat_conversations")
          .select("*")
          .eq("platform", "whatsapp")
          .order("updated_at", { ascending: false })

        if (error) throw error
        setConversations(data || [])

        // Seleccionar la primera conversación por defecto
        if (data && data.length > 0 && !selectedConversation) {
          setSelectedConversation(data[0].id)
        }
      } catch (err: any) {
        setError(err.message || "Error al cargar conversaciones")
        console.error("Error al cargar conversaciones:", err)
      } finally {
        setLoading(false)
      }
    }

    loadConversations()

    // Suscribirse a cambios en las conversaciones
    const conversationsSubscription = supabase
      .channel("whatsapp-conversations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_conversations", filter: "platform=eq.whatsapp" },
        () => {
          loadConversations()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(conversationsSubscription)
    }
  }, [])

  // Cargar mensajes cuando se selecciona una conversación
  useEffect(() => {
    async function loadMessages() {
      if (!selectedConversation) return

      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("chat_messages")
          .select("*")
          .eq("conversation_id", selectedConversation)
          .order("created_at", { ascending: true })

        if (error) throw error
        setMessages(data || [])
      } catch (err: any) {
        setError(err.message || "Error al cargar mensajes")
        console.error("Error al cargar mensajes:", err)
      } finally {
        setLoading(false)
      }
    }

    loadMessages()

    // Suscribirse a cambios en los mensajes
    const messagesSubscription = supabase
      .channel(`messages-${selectedConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        () => {
          loadMessages()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(messagesSubscription)
    }
  }, [selectedConversation])

  // Formatear número de teléfono
  const formatPhoneNumber = (phone: string) => {
    // Eliminar el prefijo de país si existe
    const cleaned = phone.replace(/^\+\d{1,3}/, "")
    // Formatear como (XXX) XXX-XXXX si tiene 10 dígitos
    if (cleaned.length === 10) {
      return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`
    }
    return phone
  }

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "dd MMM yyyy, HH:mm", { locale: es })
    } catch (e) {
      return dateString
    }
  }

  // Eliminar conversación individual
  const deleteConversation = async (conversationId: string) => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/whatsapp/conversations/${conversationId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Error al eliminar conversación")
      }

      // Recargar conversaciones
      setConversations((prev) => prev.filter((conv) => conv.id !== conversationId))
      if (selectedConversation === conversationId) {
        setSelectedConversation(null)
        setMessages([])
      }

      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error("Error:", error)
      setError("Error al eliminar la conversación")
    } finally {
      setIsDeleting(false)
    }
  }

  // Eliminar todas las conversaciones
  const deleteAllConversations = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch("/api/whatsapp/conversations", {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Error al eliminar conversaciones")
      }

      // Limpiar estado
      setConversations([])
      setSelectedConversation(null)
      setMessages([])
      setShowDeleteModal(false)
      setDeleteTarget(null)
    } catch (error) {
      console.error("Error:", error)
      setError("Error al eliminar las conversaciones")
    } finally {
      setIsDeleting(false)
    }
  }

  // Confirmar eliminación
  const confirmDelete = () => {
    if (deleteTarget === "all") {
      deleteAllConversations()
    } else if (deleteTarget) {
      deleteConversation(deleteTarget)
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Administración de WhatsApp</h1>
          <div className="flex space-x-3">
            <Button
              variant="destructive"
              onClick={() => {
                setDeleteTarget("all")
                setShowDeleteModal(true)
              }}
              disabled={conversations.length === 0}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Borrar Todo
            </Button>
            <Link href="/admin/whatsapp/send-template">
              <Button variant="default">
                <Send className="w-4 h-4 mr-2" />
                Enviar Plantilla
              </Button>
            </Link>
            <Link href="/admin/whatsapp/config">
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Configuración
              </Button>
            </Link>
          </div>
        </div>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 bg-black/50 backdrop-blur-md text-white">
            <CardHeader>
              <CardTitle>Conversaciones</CardTitle>
            </CardHeader>
            <CardContent>
              {loading && conversations.length === 0 ? (
                <p>Cargando conversaciones...</p>
              ) : conversations.length === 0 ? (
                <p>No hay conversaciones disponibles.</p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedConversation === conv.id ? "bg-purple-600 text-white" : "hover:bg-purple-800/50"
                      }`}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{formatPhoneNumber(conv.phone_number)}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant={conv.status === "active" ? "default" : "secondary"}>
                            {conv.status === "active" ? "Activa" : "Cerrada"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteTarget(conv.id)
                              setShowDeleteModal(true)
                            }}
                            className="h-6 w-6 p-0 hover:bg-purple-100/10"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm opacity-80 mt-1">Actualizado: {formatDate(conv.updated_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-black/50 backdrop-blur-md text-white">
            <CardHeader>
              <CardTitle>
                {selectedConversation
                  ? `Mensajes - ${formatPhoneNumber(conversations.find((c) => c.id === selectedConversation)?.phone_number || "")}`
                  : "Mensajes"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedConversation ? (
                <p>Selecciona una conversación para ver los mensajes.</p>
              ) : loading && messages.length === 0 ? (
                <p>Cargando mensajes...</p>
              ) : messages.length === 0 ? (
                <p>No hay mensajes en esta conversación.</p>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto p-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg max-w-[80%] ${
                        msg.role === "user" ? "bg-purple-100 text-black ml-auto" : "bg-gray-100 text-black mr-auto"
                      }`}
                    >
                      <div className="text-sm font-medium mb-1">{msg.role === "user" ? "Usuario" : "Asistente"}</div>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <div className="text-xs text-gray-500 mt-1 text-right">{formatDate(msg.created_at)}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Modal de confirmación */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold">Confirmar eliminación</h3>
            </div>

            <p className="text-gray-600 mb-6">
              {deleteTarget === "all"
                ? "¿Estás seguro de que quieres eliminar TODAS las conversaciones? Esta acción no se puede deshacer."
                : "¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer."}
            </p>

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteTarget(null)
                }}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
                {isDeleting ? "Eliminando..." : "Eliminar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
