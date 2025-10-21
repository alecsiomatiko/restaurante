'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Plus, Trash2, Users, Calculator, ArrowLeft, Sparkles, Coffee, Star, Check, X, Save, FileText } from 'lucide-react'

interface Producto {
  id: number
  nombre: string
  precio: number
  cantidad: number
  order_id: number
  assignment_id?: number
}

interface Cliente {
  id: string
  nombre: string
  productos: Producto[]
  total: number
  mesa: string
  created_at?: string
}

interface DivisionCuentas {
  mesa: string
  clientes: Cliente[]
  totalMesa: number
  productosSinAsignar: Producto[]
  isUnified: boolean
  unifiedInfo?: {
    unified_name: string
    original_tables: string[]
  }
}

interface TableManagementSystemProps {
  mesa: string
  onBack: () => void
}

export default function TableManagementSystem({ mesa, onBack }: TableManagementSystemProps) {
  const [division, setDivision] = useState<DivisionCuentas | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddCliente, setShowAddCliente] = useState(false)
  const [nombreNuevoCliente, setNombreNuevoCliente] = useState('')
  const [processingAssignment, setProcessingAssignment] = useState(false)
  const [showCuentasSeparadas, setShowCuentasSeparadas] = useState(false)
  const [cuentasSeparadas, setCuentasSeparadas] = useState<any[]>([])

  useEffect(() => {
    cargarDivision()
  }, [mesa])

  const cargarDivision = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/mesero/division-cuentas?mesa=${encodeURIComponent(mesa)}`)
      const data = await response.json()

      if (data.success) {
        setDivision(data.division)
      } else {
        setError(data.error || 'Error al cargar división')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const agregarCliente = async () => {
    if (!nombreNuevoCliente.trim() || !division) return

    const nuevoCliente: Cliente = {
      id: nombreNuevoCliente.toLowerCase().replace(/\s+/g, '_'),
      nombre: nombreNuevoCliente.trim(),
      productos: [],
      total: 0,
      mesa: division.mesa
    }

    setDivision({
      ...division,
      clientes: [...division.clientes, nuevoCliente]
    })

    setNombreNuevoCliente('')
    setShowAddCliente(false)
  }

  const eliminarCliente = async (clienteId: string) => {
    if (!division) return

    const cliente = division.clientes.find(c => c.id === clienteId)
    if (!cliente) return

    // Quitar todas las asignaciones del cliente
    for (const producto of cliente.productos) {
      if (producto.assignment_id) {
        try {
          await fetch(`/api/mesero/division-cuentas?id=${producto.assignment_id}`, {
            method: 'DELETE'
          })
        } catch (error) {
          console.error('Error al eliminar asignación:', error)
        }
      }
    }

    // Actualizar estado local
    const clientesActualizados = division.clientes.filter(c => c.id !== clienteId)
    const productosDevueltos = cliente.productos.map(p => ({
      ...p,
      assignment_id: undefined
    }))

    setDivision({
      ...division,
      clientes: clientesActualizados,
      productosSinAsignar: [...division.productosSinAsignar, ...productosDevueltos]
    })
  }

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || !division) return

    const { source, destination, draggableId } = result

    // Si se mueve dentro de la misma lista, no hacer nada
    if (source.droppableId === destination.droppableId) return

    setProcessingAssignment(true)

    try {
      // Encontrar el producto
      let producto: Producto | null = null
      let sourceCliente: Cliente | null = null

      if (source.droppableId === 'productos-sin-asignar') {
        producto = division.productosSinAsignar.find(p => 
          `${p.id}-${p.order_id}` === draggableId
        ) || null
      } else {
        sourceCliente = division.clientes.find(c => c.id === source.droppableId) || null
        producto = sourceCliente?.productos.find(p => 
          `${p.id}-${p.order_id}` === draggableId
        ) || null
      }

      if (!producto) return

      // Si se está moviendo A productos sin asignar (eliminar asignación)
      if (destination.droppableId === 'productos-sin-asignar') {
        if (producto.assignment_id) {
          const response = await fetch(`/api/mesero/division-cuentas?id=${producto.assignment_id}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            // Actualizar estado local
            const clientesActualizados = division.clientes.map(cliente => ({
              ...cliente,
              productos: cliente.productos.filter(p => 
                `${p.id}-${p.order_id}` !== draggableId
              ),
              total: cliente.productos
                .filter(p => `${p.id}-${p.order_id}` !== draggableId)
                .reduce((sum, p) => sum + (p.precio * p.cantidad), 0)
            }))

            setDivision({
              ...division,
              clientes: clientesActualizados,
              productosSinAsignar: [...division.productosSinAsignar, {
                ...producto,
                assignment_id: undefined
              }]
            })
          }
        }
      } else {
        // Se está moviendo A un cliente (crear asignación)
        const targetCliente = division.clientes.find(c => c.id === destination.droppableId)
        if (!targetCliente) return

        const response = await fetch('/api/mesero/division-cuentas', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            order_id: producto.order_id,
            producto_id: producto.id,
            cantidad: producto.cantidad,
            cliente_nombre: targetCliente.nombre,
            precio_unitario: producto.precio
          })
        })

        const data = await response.json()

        if (data.success) {
          // Actualizar estado local
          await cargarDivision()
        } else {
          console.error('Error al asignar:', data.error)
        }
      }
    } catch (error) {
      console.error('Error en drag and drop:', error)
    } finally {
      setProcessingAssignment(false)
    }
  }

  const generarCuentasSeparadas = async () => {
    if (!division) return

    try {
      const response = await fetch('/api/mesero/cuentas-separadas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mesa: division.mesa,
          clientes: division.clientes
        })
      })

      const data = await response.json()

      if (data.success) {
        setCuentasSeparadas(data.cuentasSeparadas)
        setShowCuentasSeparadas(true)
      } else {
        setError(data.error || 'Error al generar cuentas')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-purple-300">Cargando división de cuentas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center p-8">
          <X className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={cargarDivision}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (showCuentasSeparadas) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowCuentasSeparadas(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-purple-300" />
              </button>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <FileText className="w-6 h-6 text-purple-400" />
                Cuentas Separadas - Mesa {mesa}
              </h1>
            </div>
          </div>

          <div className="grid gap-6">
            {cuentasSeparadas.map((cuenta, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    {cuenta.cliente}
                  </h3>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-300">
                      ${cuenta.total.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {cuenta.productos.map((producto: any, i: number) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{producto.nombre}</p>
                        <p className="text-purple-300 text-sm">
                          {producto.cantidad} × ${(parseFloat(String(producto.precio_unitario)) || 0).toFixed(2)}
                        </p>
                      </div>
                      <p className="text-purple-300 font-bold">
                        ${(parseFloat(String(producto.subtotal)) || 0).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-purple-400" />
              Resumen
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-purple-300">Clientes</p>
                <p className="text-2xl font-bold text-white">{cuentasSeparadas.length}</p>
              </div>
              <div className="text-center">
                <p className="text-purple-300">Total Asignado</p>
                <p className="text-2xl font-bold text-purple-300">
                  ${cuentasSeparadas.reduce((sum, c) => sum + (parseFloat(String(c.total)) || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!division) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Coffee className="w-16 h-16 text-purple-400 mx-auto mb-4" />
          <p className="text-purple-300">No hay datos de división para esta mesa</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
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
              <Sparkles className="w-8 h-8 text-purple-400" />
              División de Cuentas
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-purple-300">Mesa {division.mesa}</p>
              {division.isUnified && (
                <p className="text-sm text-purple-400">
                  Mesa unificada: {division.unifiedInfo?.unified_name}
                </p>
              )}
              <p className="text-2xl font-bold text-white">
                Total: ${division.totalMesa.toFixed(2)}
              </p>
            </div>
            <button
              onClick={generarCuentasSeparadas}
              disabled={division.clientes.length === 0}
              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Calculator className="w-5 h-5" />
              Generar Cuentas
            </button>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Productos sin asignar */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Coffee className="w-5 h-5 text-purple-400" />
                Productos Sin Asignar
                <span className="ml-auto bg-purple-600 text-white text-sm px-2 py-1 rounded-full">
                  {division.productosSinAsignar.length}
                </span>
              </h2>

              <Droppable droppableId="productos-sin-asignar" isDropDisabled={processingAssignment}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[200px] space-y-2 transition-colors ${
                      snapshot.isDraggingOver ? 'bg-purple-500/20 rounded-lg' : ''
                    }`}
                  >
                    {division.productosSinAsignar.map((producto, index) => (
                      <Draggable
                        key={`${producto.id}-${producto.order_id}`}
                        draggableId={`${producto.id}-${producto.order_id}`}
                        index={index}
                        isDragDisabled={processingAssignment}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`p-3 bg-white/10 rounded-lg border border-purple-300/20 cursor-move transition-all ${
                              snapshot.isDragging ? 'rotate-2 shadow-2xl bg-purple-500/30' : 'hover:bg-white/15'
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-white font-medium">{producto.nombre}</p>
                                <p className="text-purple-300 text-sm">
                                  Cantidad: {producto.cantidad}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-purple-300 font-bold">
                                  ${((parseFloat(String(producto.precio)) || 0) * (producto.cantidad || 1)).toFixed(2)}
                                </p>
                                <p className="text-purple-400 text-xs">
                                  ${(parseFloat(String(producto.precio)) || 0).toFixed(2)} c/u
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    
                    {division.productosSinAsignar.length === 0 && (
                      <div className="text-center py-8 text-purple-300">
                        <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Todos los productos están asignados</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>

            {/* Clientes */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  Clientes
                  <span className="ml-2 bg-purple-600 text-white text-sm px-2 py-1 rounded-full">
                    {division.clientes.length}
                  </span>
                </h2>
                
                <button
                  onClick={() => setShowAddCliente(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg font-bold hover:from-purple-600 hover:to-pink-700 transition-all transform hover:scale-105 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Cliente
                </button>
              </div>

              {/* Modal para agregar cliente */}
              {showAddCliente && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-slate-800 p-6 rounded-xl border border-purple-300/20 max-w-md w-full mx-4">
                    <h3 className="text-xl font-bold text-white mb-4">Agregar Cliente</h3>
                    <input
                      type="text"
                      value={nombreNuevoCliente}
                      onChange={(e) => setNombreNuevoCliente(e.target.value)}
                      placeholder="Nombre del cliente"
                      className="w-full px-4 py-2 bg-white/10 border border-purple-300/20 rounded-lg text-white placeholder-purple-300/60 focus:border-purple-400 focus:outline-none"
                      autoFocus
                      onKeyPress={(e) => e.key === 'Enter' && agregarCliente()}
                    />
                    <div className="flex gap-3 mt-4">
                      <button
                        onClick={agregarCliente}
                        disabled={!nombreNuevoCliente.trim()}
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Agregar
                      </button>
                      <button
                        onClick={() => {
                          setShowAddCliente(false)
                          setNombreNuevoCliente('')
                        }}
                        className="flex-1 bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de clientes */}
              <div className="grid gap-4">
                {division.clientes.map((cliente) => (
                  <div key={cliente.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-purple-300/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-purple-400" />
                        {cliente.nombre}
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-xl font-bold text-purple-300">
                            ${cliente.total.toFixed(2)}
                          </p>
                          <p className="text-purple-400 text-sm">
                            {cliente.productos.length} productos
                          </p>
                        </div>
                        <button
                          onClick={() => eliminarCliente(cliente.id)}
                          className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>

                    <Droppable droppableId={cliente.id} isDropDisabled={processingAssignment}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[100px] space-y-2 transition-colors ${
                            snapshot.isDraggingOver ? 'bg-green-500/20 rounded-lg' : ''
                          }`}
                        >
                          {cliente.productos.map((producto, index) => (
                            <Draggable
                              key={`${producto.id}-${producto.order_id}`}
                              draggableId={`${producto.id}-${producto.order_id}`}
                              index={index}
                              isDragDisabled={processingAssignment}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 bg-white/10 rounded-lg border border-purple-300/20 cursor-move transition-all ${
                                    snapshot.isDragging ? 'rotate-2 shadow-2xl bg-green-500/30' : 'hover:bg-white/15'
                                  }`}
                                >
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <p className="text-white font-medium">{producto.nombre}</p>
                                      <p className="text-purple-300 text-sm">
                                        Cantidad: {producto.cantidad}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-green-400 font-bold">
                                        ${((parseFloat(String(producto.precio)) || 0) * (producto.cantidad || 1)).toFixed(2)}
                                      </p>
                                      <p className="text-purple-400 text-xs">
                                        ${(parseFloat(String(producto.precio)) || 0).toFixed(2)} c/u
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
                          {cliente.productos.length === 0 && (
                            <div className="text-center py-6 text-purple-300 border-2 border-dashed border-purple-300/30 rounded-lg">
                              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p>Arrastra productos aquí para {cliente.nombre}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}

                {division.clientes.length === 0 && (
                  <div className="text-center py-12 text-purple-300">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg">No hay clientes agregados</p>
                    <p className="text-sm">Haz clic en "Agregar Cliente" para comenzar</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DragDropContext>

        {/* Indicador de procesamiento */}
        {processingAssignment && (
          <div className="fixed bottom-6 right-6 bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Procesando asignación...</span>
          </div>
        )}
      </div>
    </div>
  )
}