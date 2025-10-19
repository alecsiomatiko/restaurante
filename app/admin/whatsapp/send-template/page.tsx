"use client"

import type React from "react"

import { useState } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle } from "lucide-react"

export default function SendWhatsAppTemplate() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [templateName, setTemplateName] = useState("")
  const [languageCode, setLanguageCode] = useState("es_MX")
  const [parameters, setParameters] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)

    try {
      // Validar número de teléfono
      let formattedPhone = phoneNumber.trim().replace(/\D/g, "")
      if (!formattedPhone.startsWith("+")) {
        // Añadir código de país de México si no tiene prefijo
        if (formattedPhone.startsWith("52")) {
          formattedPhone = "+" + formattedPhone
        } else {
          formattedPhone = "+52" + formattedPhone
        }
      }

      // Parsear parámetros JSON si existen
      let parsedParams = []
      if (parameters.trim()) {
        try {
          parsedParams = JSON.parse(parameters)
        } catch (err) {
          throw new Error("Los parámetros deben estar en formato JSON válido")
        }
      }

      // Enviar solicitud al servidor
      const response = await fetch("/api/whatsapp/send-template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: formattedPhone,
          templateName,
          languageCode,
          components: parsedParams.length > 0 ? parsedParams : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Error al enviar la plantilla")
      }

      setResult({
        success: true,
        message: `Plantilla enviada correctamente a ${formattedPhone}`,
      })

      toast({
        title: "Plantilla enviada",
        description: `La plantilla se ha enviado correctamente a ${formattedPhone}`,
      })
    } catch (error: any) {
      console.error("Error al enviar plantilla:", error)
      setResult({
        success: false,
        message: error.message || "Error al enviar la plantilla",
      })

      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Error al enviar la plantilla",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Enviar Plantilla de WhatsApp</h1>

        <Card>
          <CardHeader>
            <CardTitle>Enviar mensaje usando plantilla</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Número de teléfono (con código de país)</Label>
                <Input
                  id="phoneNumber"
                  placeholder="+5212345678900"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
                <p className="text-sm text-gray-500">
                  Formato: +52 seguido del número de 10 dígitos sin espacios ni guiones
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="templateName">Nombre de la plantilla</Label>
                <Input
                  id="templateName"
                  placeholder="nombre_de_tu_plantilla"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  required
                />
                <p className="text-sm text-gray-500">
                  Debe ser exactamente igual al nombre de la plantilla aprobada en Meta Business Manager
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="languageCode">Código de idioma</Label>
                <Select value={languageCode} onValueChange={setLanguageCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un idioma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="es_MX">Español (México)</SelectItem>
                    <SelectItem value="es_ES">Español (España)</SelectItem>
                    <SelectItem value="en_US">Inglés (EE.UU.)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parameters">Parámetros (JSON - opcional)</Label>
                <Textarea
                  id="parameters"
                  placeholder='[{"type":"body","parameters":[{"type":"text","text":"Juan Pérez"}]}]'
                  value={parameters}
                  onChange={(e) => setParameters(e.target.value)}
                  rows={5}
                />
                <p className="text-sm text-gray-500">
                  Formato JSON para los parámetros de la plantilla. Deja en blanco si la plantilla no tiene parámetros.
                </p>
              </div>

              {result && (
                <div
                  className={`p-4 rounded-md ${
                    result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
                  }`}
                >
                  <div className="flex items-center">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                    )}
                    <p className={result.success ? "text-green-700" : "text-red-700"}>{result.message}</p>
                  </div>
                </div>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Enviando..." : "Enviar plantilla"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">¿Qué son las plantillas?</h3>
              <p className="text-gray-600">
                Las plantillas son mensajes pre-aprobados que puedes enviar a tus clientes fuera de la ventana de 24
                horas. Son necesarias para iniciar conversaciones.
              </p>
            </div>

            <div>
              <h3 className="font-medium">Cómo crear plantillas</h3>
              <ol className="list-decimal list-inside text-gray-600 space-y-1">
                <li>Ve a Meta Business Manager</li>
                <li>Navega a tu cuenta de WhatsApp Business</li>
                <li>Ve a la sección "Plantillas de mensaje"</li>
                <li>Crea plantillas siguiendo las directrices de WhatsApp</li>
                <li>Espera la aprobación (puede tardar hasta 24 horas)</li>
              </ol>
            </div>

            <div>
              <h3 className="font-medium">Ejemplo de parámetros JSON</h3>
              <pre className="bg-gray-100 p-3 rounded-md text-sm overflow-x-auto">
                {`[
  {
    "type": "body",
    "parameters": [
      {
        "type": "text",
        "text": "Juan Pérez"
      },
      {
        "type": "text",
        "text": "12345"
      }
    ]
  }
]`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
