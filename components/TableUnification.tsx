'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Users, Coffee, Plus, Trash2, Check, X, Sparkles, Link2 } from 'lucide-react'

interface Mesa {
  id: string
  numero: string
  estado: 'libre' | 'ocupada' | 'pendiente'
  ordenes?: number
  total?: number
}

interface MesaUnificada {
  id: number
  nombre: string
  mesaPrincipal: string
  mesasOriginales: string[]
  totalOrdenes: number
  montoTotal: number
  fechaCreacion: string
}

interface TableUnificationProps {
  onBack: () => void
}

export default function TableUnification({ onBack }: TableUnificationProps) {
  const [mesasDisponibles, setMesasDisponibles] = useState<Mesa[]>([])
  const [mesasSeleccionadas, setMesasSeleccionadas] = useState<string[]>([])
  const [nombreUnificado, setNombreUnificado] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mesasUnificadas, setMesasUnificadas] = useState<MesaUnificada[]>([])
  const [showUnifyModal, setShowUnifyModal] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Cargar mesas con órdenes activas
      const mesasResponse = await fetch('/api/mesero/open-tables', { 
        credentials: 'include' 
      })
      const mesasData = await mesasResponse.json()
      
      // Cargar mesas unificadas existentes primero
      const unificadasResponse = await fetch('/api/mesero/unificar-mesas')
      const unificadasData = await unificadasResponse.json()
      
      let mesasYaUnificadas: string[] = []
      
      if (unificadasData.success) {
        setMesasUnificadas(unificadasData.mesasUnificadas)
        // Obtener lista de mesas que ya están unificadas
        mesasYaUnificadas = unificadasData.mesasUnificadas.flatMap((unif: any) => 
          unif.mesasOriginales || []
        )
      } else {
        console.error('❌ Error en mesas unificadas:', unificadasData.error)
      }

      if (mesasData.success) {
        // Filtrar mesas que ya están unificadas
        const mesasDisponiblesParaUnificar = mesasData.tables.filter((table: any) => {
          const nombreMesa = table.tableName.trim()
          return !mesasYaUnificadas.includes(nombreMesa)
        })
        
        // Usar las mesas ya agrupadas por la API
        const mesas: Mesa[] = mesasDisponiblesParaUnificar.map((table: any) => ({
          id: table.tableName.trim(), // Eliminar espacios extra
          numero: table.tableName.trim(),
          estado: 'ocupada' as const,
          ordenes: table.orderCount,
          total: parseFloat(table.totalMesa) || 0
        }))
        
        setMesasDisponibles(mesas)
      } else {
        console.error('❌ Error en respuesta:', mesasData.error)
        setError(mesasData.error || 'Error al cargar mesas')
      }

    } catch (error) {
      console.error('❌ Error al cargar datos:', error)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const toggleMesaSeleccionada = (mesaId: string) => {
    if (mesasSeleccionadas.includes(mesaId)) {
      setMesasSeleccionadas(mesasSeleccionadas.filter(id => id !== mesaId))
    } else {
      setMesasSeleccionadas([...mesasSeleccionadas, mesaId])
    }
  }

  const unificarMesas = async () => {
    if (mesasSeleccionadas.length < 2 || !nombreUnificado.trim()) return

    try {
      setProcessing(true)
      
      const response = await fetch('/api/mesero/unificar-mesas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mesas: mesasSeleccionadas,
          nombreUnificado: nombreUnificado.trim()
        })
      })

      const data = await response.json()

      if (data.success) {
        // Resetear formulario
        setMesasSeleccionadas([])
        setNombreUnificado('')
        setShowUnifyModal(false)
        
        // Recargar datos
        await cargarDatos()
      } else {
        setError(data.error || 'Error al unificar mesas')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión')
    } finally {
      setProcessing(false)
    }
  }

  const separarMesas = async (unifiedTableId: number) => {
    try {
      setProcessing(true)
      
      const response = await fetch(`/api/mesero/unificar-mesas?id=${unifiedTableId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        // Recargar datos
        await cargarDatos()
      } else {
        setError(data.error || 'Error al separar mesas')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión')
    } finally {
      setProcessing(false)
    }
  }

  const generarNombreSugerido = () => {
    if (mesasSeleccionadas.length >= 2) {
      const mesasOrdenadas = [...mesasSeleccionadas].sort()
      return `Mesas ${mesasOrdenadas.join('+')}`
    }
    return ''
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-purple-300">Cargando mesas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-purple-300" />
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Link2 className="w-8 h-8 text-purple-400" />
              Unificar Mesas
            </h1>
          </div>
          
          <button
            onClick={() => setShowUnifyModal(true)}
            disabled={mesasSeleccionadas.length < 2}
            className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-xl font-bold hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Unificar Seleccionadas ({mesasSeleccionadas.length})
          </button>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-400 hover:text-red-300 underline"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Mesas Unificadas - Mostrar arriba de forma prominente */}
        {mesasUnificadas.length > 0 && (
          <div className="mb-6 bg-gradient-to-r from-green-500/20 to-emerald-600/20 backdrop-blur-sm rounded-xl p-6 border border-green-300/30">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Link2 className="w-6 h-6 text-green-400" />
              Mesas Unificadas Activas
              <span className="ml-auto bg-green-600 text-white text-sm px-3 py-1 rounded-full">
                {mesasUnificadas.length}
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mesasUnificadas.map((mesaUnificada) => (
                <div
                  key={mesaUnificada.id}
                  className="p-4 bg-green-500/10 rounded-lg border border-green-300/20 hover:bg-green-500/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white font-bold text-lg">{mesaUnificada.nombre}</p>
                      <p className="text-green-300 text-sm">
                        Mesas: {mesaUnificada.mesasOriginales.join(' + ')}
                      </p>
                    </div>
                    <button
                      onClick={() => separarMesas(mesaUnificada.id)}
                      disabled={processing}
                      className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors disabled:opacity-50"
                      title="Separar mesa unificada"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-green-300">Órdenes</p>
                      <p className="text-white font-bold">{mesaUnificada.totalOrdenes}</p>
                    </div>
                    <div>
                      <p className="text-green-300">Total</p>
                      <p className="text-green-400 font-bold">
                        ${(parseFloat(String(mesaUnificada.montoTotal)) || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Mesas Disponibles */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-purple-400" />
              Mesas Disponibles para Unificar
              <span className="ml-auto bg-purple-600 text-white text-sm px-2 py-1 rounded-full">
                {mesasDisponibles.length}
              </span>
            </h2>

            <div className="space-y-3">
              {mesasDisponibles.map((mesa) => (
                <div
                  key={mesa.id}
                  onClick={() => toggleMesaSeleccionada(mesa.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    mesasSeleccionadas.includes(mesa.id)
                      ? 'bg-purple-500/30 border-purple-400 shadow-lg'
                      : 'bg-white/5 border-purple-300/20 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        mesasSeleccionadas.includes(mesa.id)
                          ? 'bg-purple-500 border-purple-500'
                          : 'border-purple-300'
                      }`}>
                        {mesasSeleccionadas.includes(mesa.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-bold">Mesa {mesa.numero}</p>
                        <p className="text-purple-300 text-sm">
                          {mesa.ordenes} orden(es) activa(s)
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-300 font-bold">
                        ${(parseFloat(String(mesa.total)) || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {mesasDisponibles.length === 0 && (
                <div className="text-center py-8 text-purple-300">
                  <Coffee className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay mesas con órdenes activas</p>
                </div>
              )}
            </div>

            {mesasSeleccionadas.length > 0 && (
              <div className="mt-4 p-3 bg-purple-500/20 rounded-lg border border-purple-400/30">
                <p className="text-white text-sm">
                  <strong>{mesasSeleccionadas.length} mesas seleccionadas:</strong>
                </p>
                <p className="text-purple-300 text-sm">
                  {mesasSeleccionadas.join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Instrucciones */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Instrucciones
            </h2>
            
            <div className="space-y-3 text-purple-200">
              <div className="flex items-start gap-3">
                <div className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-1">1</div>
                <p>Selecciona 2 o más mesas de la izquierda haciendo clic en ellas</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-1">2</div>
                <p>Haz clic en "Unificar Seleccionadas" para combinar las mesas</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-purple-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-1">3</div>
                <p>Las mesas unificadas aparecerán arriba con un nombre personalizado</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mt-1">!</div>
                <p>Para separar una mesa unificada, usa el botón de eliminar (🗑️)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal para unificar mesas */}
        {showUnifyModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl border border-purple-300/20 max-w-md w-full mx-4">
              <div className="flex items-center gap-2 mb-4">
                <Link2 className="w-6 h-6 text-purple-400" />
                <h3 className="text-xl font-bold text-white">Unificar Mesas</h3>
              </div>
              
              <div className="mb-4">
                <p className="text-purple-300 text-sm mb-2">Mesas seleccionadas:</p>
                <div className="bg-white/10 p-3 rounded-lg">
                  <p className="text-white font-bold">
                    {mesasSeleccionadas.join(' + ')}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-purple-300 text-sm mb-2">
                  Nombre para la mesa unificada:
                </label>
                <input
                  type="text"
                  value={nombreUnificado}
                  onChange={(e) => setNombreUnificado(e.target.value)}
                  placeholder={generarNombreSugerido()}
                  className="w-full px-4 py-2 bg-white/10 border border-purple-300/20 rounded-lg text-white placeholder-purple-300/60 focus:border-purple-400 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => setNombreUnificado(generarNombreSugerido())}
                  className="mt-2 text-purple-400 hover:text-purple-300 text-sm underline"
                >
                  Usar nombre sugerido
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={unificarMesas}
                  disabled={processing || !nombreUnificado.trim() || mesasSeleccionadas.length < 2}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Unificando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Unificar
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowUnifyModal(false)
                    setNombreUnificado('')
                  }}
                  disabled={processing}
                  className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Indicador de procesamiento */}
        {processing && !showUnifyModal && (
          <div className="fixed bottom-6 right-6 bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Procesando...</span>
          </div>
        )}
      </div>
    </div>
  )
}