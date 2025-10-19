"use client"

import { useState, useEffect } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Copy, ExternalLink, Info } from "lucide-react"
import Link from "next/link"

export default function WhatsAppConfig() {
  const [webhookUrl, setWebhookUrl] = useState("")
  const [verifyToken, setVerifyToken] = useState("")
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    // Obtener la URL base del sitio
    const baseUrl = window.location.origin
    setWebhookUrl(`${baseUrl}/api/whatsapp/webhook`)

    // Usar el token de verificación que generamos anteriormente
    setVerifyToken("sonora-express-whatsapp-verify-8f29a7d6e3b5c2")
  }, [])

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center mb-6">
          <Link href="/admin/whatsapp" className="mr-4">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Configuración de WhatsApp</h1>
        </div>

        <Tabs defaultValue="webhook">
          <TabsList className="mb-6">
            <TabsTrigger value="webhook">Configuración de Webhook</TabsTrigger>
            <TabsTrigger value="templates">Plantillas de Mensajes</TabsTrigger>
            <TabsTrigger value="settings">Ajustes Generales</TabsTrigger>
          </TabsList>

          <TabsContent value="webhook">
            <div className="grid gap-6">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Información importante</AlertTitle>
                <AlertDescription>
                  Para configurar la integración con WhatsApp Business API, necesitas registrar el webhook en el panel
                  de desarrollador de Meta.
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle>Configuración del Webhook</CardTitle>
                  <CardDescription>
                    Utiliza esta información para configurar el webhook en el panel de desarrollador de Meta.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="callback-url">Callback URL</Label>
                    <div className="flex">
                      <Input id="callback-url" value={webhookUrl} readOnly className="flex-1" />
                      <Button variant="outline" className="ml-2" onClick={() => copyToClipboard(webhookUrl, "url")}>
                        <Copy className="h-4 w-4 mr-2" />
                        {copied === "url" ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Esta es la URL que debes proporcionar en el panel de desarrollador de Meta.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="verify-token">Verify Token</Label>
                    <div className="flex">
                      <Input id="verify-token" value={verifyToken} readOnly className="flex-1" />
                      <Button variant="outline" className="ml-2" onClick={() => copyToClipboard(verifyToken, "token")}>
                        <Copy className="h-4 w-4 mr-2" />
                        {copied === "token" ? "Copiado" : "Copiar"}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Este token debe coincidir con el valor de la variable de entorno WHATSAPP_VERIFY_TOKEN.
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex-col items-start">
                  <h3 className="font-semibold mb-2">Pasos para configurar el webhook:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    <li>
                      Accede al{" "}
                      <a
                        href="https://developers.facebook.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Panel de Desarrollador de Meta <ExternalLink className="h-3 w-3 inline" />
                      </a>
                    </li>
                    <li>Selecciona tu aplicación o crea una nueva</li>
                    <li>Ve a la sección de WhatsApp &gt; Configuración</li>
                    <li>En la sección de Webhooks, haz clic en "Configurar"</li>
                    <li>Ingresa la Callback URL y el Verify Token proporcionados arriba</li>
                    <li>Selecciona los campos de suscripción: messages, message_deliveries, message_reads</li>
                    <li>Haz clic en "Verificar y guardar"</li>
                  </ol>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Variables de Entorno Requeridas</CardTitle>
                  <CardDescription>
                    Asegúrate de que estas variables de entorno estén configuradas en tu proyecto de Vercel.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>WHATSAPP_PHONE_NUMBER_ID</Label>
                      <p className="text-sm text-muted-foreground">
                        El ID del número de teléfono de WhatsApp Business. Lo encuentras en el panel de desarrollador de
                        Meta.
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <Label>WHATSAPP_ACCESS_TOKEN</Label>
                      <p className="text-sm text-muted-foreground">
                        El token de acceso permanente para la API de WhatsApp Business. Lo generas en el panel de
                        desarrollador de Meta.
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <Label>WHATSAPP_VERIFY_TOKEN</Label>
                      <p className="text-sm text-muted-foreground">
                        El token de verificación que acabamos de generar. Debe coincidir con el que proporcionas en el
                        panel de desarrollador de Meta.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle>Plantillas de Mensajes</CardTitle>
                <CardDescription>Gestiona las plantillas de mensajes para WhatsApp Business.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-6">
                  Las plantillas de mensajes se configuran directamente en el panel de desarrollador de Meta.
                </p>
                <div className="flex justify-center">
                  <a href="https://developers.facebook.com/" target="_blank" rel="noopener noreferrer">
                    <Button>
                      Ir al Panel de Desarrollador
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Ajustes Generales</CardTitle>
                <CardDescription>Configura los ajustes generales para la integración con WhatsApp.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center py-6">Esta sección estará disponible próximamente.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
