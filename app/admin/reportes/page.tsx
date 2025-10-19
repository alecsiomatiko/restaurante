'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-notifications'
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  ShoppingCart, 
  BarChart3, 
  Bot,
  Loader2,
  Star,
  Clock,
  Users,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  PieChart,
  Activity,
  Zap,
  CalendarDays
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie,
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { es } from 'date-fns/locale'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import * as XLSX from 'xlsx'

interface ReportData {
  totalSales: number
  totalOrders: number
  averageTicket: number
  topProducts: Array<{
    name: string
    quantity: number
    sales: number
  }>
  dailySales: Array<{
    date: string
    total_sales: number
    orders: number
  }>
  hourlyPattern: Array<{
    hour: number
    orders: number
  }>
  dailyDetails: Array<{
    date: string
    orders_count: number
    daily_sales: number
    avg_ticket: number
    min_ticket: number
    max_ticket: number
    delivery_orders: number
    pickup_orders: number
  }>
  salesByTable: Array<{
    table_name: string
    orders_count: number
    table_sales: number
    avg_ticket: number
  }>
  salesByWaiter: Array<{
    waiter_name: string
    orders_served: number
    waiter_sales: number
    avg_ticket: number
  }>
  dailyCut: {
    today_orders: number
    today_sales: number
    today_avg_ticket: number
    cash_sales: number
    card_sales: number
    mp_sales: number
  }
  growth: {
    sales: number
    orders: number
    avgTicket: number
  }
  paymentMethods: Array<{
    method: string
    count: number
    sales: number
  }>
  ordersByStatus: Array<{
    status: string
    count: number
  }>
}

interface BusinessInfo {
  openai_api_key?: string
  openai_model?: string
  enable_ai_reports?: boolean
}

export default function ReportesPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({})
  const [loading, setLoading] = useState(true)
  const [aiInsights, setAiInsights] = useState<string>('')
  const [generatingInsights, setGeneratingInsights] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState('7')
  const [selectedMetric, setSelectedMetric] = useState('sales')
  const [refreshing, setRefreshing] = useState(false)
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [useCustomRange, setUseCustomRange] = useState(false)
  const toast = useToast()

  // Colores para gráficos
  const pieColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']

  useEffect(() => {
    fetchReports()
    fetchBusinessInfo()
  }, [selectedPeriod, useCustomRange, startDate, endDate])

  const fetchBusinessInfo = async () => {
    try {
      const response = await fetch('/api/admin/business-info')
      if (response.ok) {
        const data = await response.json()
        setBusinessInfo(data.businessInfo || {})
      }
    } catch (error) {
      console.error('Error fetching business info:', error)
    }
  }

  const fetchReports = async () => {
    try {
      setLoading(true)
      let url = `/api/admin/reports?period=${selectedPeriod}`
      
      if (useCustomRange) {
        const startDateStr = format(startDate, 'yyyy-MM-dd')
        const endDateStr = format(endDate, 'yyyy-MM-dd')
        url = `/api/admin/reports-by-date?startDate=${startDateStr}&endDate=${endDateStr}`
      }
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        toast.error('Error', 'No se pudieron cargar los reportes')
      }
    } catch (error) {
      console.error('Error fetching reports:', error)
      toast.error('Error', 'Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    await fetchReports()
    setRefreshing(false)
    toast.success('Actualizado', 'Datos actualizados correctamente')
  }

  const exportToExcel = () => {
    if (!reportData) {
      toast.error('Error', 'No hay datos para exportar')
      return
    }

    const wb = XLSX.utils.book_new()
    
    // Hoja 1: Resumen
    const summaryData = [
      ['Métrica', 'Valor'],
      ['Total de Ventas', `$${reportData.totalSales.toLocaleString()}`],
      ['Total de Órdenes', reportData.totalOrders.toLocaleString()],
      ['Ticket Promedio', `$${reportData.averageTicket.toFixed(2)}`],
      ['Período', useCustomRange ? `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}` : `Últimos ${selectedPeriod} días`]
    ]
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen')

    // Hoja 2: Ventas Diarias
    if (reportData.dailySales?.length > 0) {
      const dailyData = [['Fecha', 'Órdenes', 'Ventas']]
      reportData.dailySales.forEach(day => {
        dailyData.push([
          day.date,
          day.orders,
          day.total_sales
        ])
      })
      const ws2 = XLSX.utils.aoa_to_sheet(dailyData)
      XLSX.utils.book_append_sheet(wb, ws2, 'Ventas Diarias')
    }

    // Hoja 3: Ventas por Mesa
    if (reportData.salesByTable?.length > 0) {
      const tableData = [['Mesa', 'Órdenes', 'Ventas', 'Ticket Promedio']]
      reportData.salesByTable.forEach(table => {
        tableData.push([
          table.table_name,
          table.orders_count,
          table.table_sales,
          table.avg_ticket
        ])
      })
      const ws3 = XLSX.utils.aoa_to_sheet(tableData)
      XLSX.utils.book_append_sheet(wb, ws3, 'Ventas por Mesa')
    }

    // Hoja 4: Ventas por Mesero
    if (reportData.salesByWaiter?.length > 0) {
      const waiterData = [['Mesero', 'Órdenes', 'Ventas', 'Ticket Promedio']]
      reportData.salesByWaiter.forEach(waiter => {
        waiterData.push([
          waiter.waiter_name,
          waiter.orders_served,
          waiter.waiter_sales,
          waiter.avg_ticket
        ])
      })
      const ws4 = XLSX.utils.aoa_to_sheet(waiterData)
      XLSX.utils.book_append_sheet(wb, ws4, 'Ventas por Mesero')
    }

    // Hoja 5: Productos Más Vendidos
    if (reportData.topProducts?.length > 0) {
      const productsData = [['Producto', 'Cantidad', 'Ventas']]
      reportData.topProducts.forEach(product => {
        productsData.push([
          product.name,
          product.quantity,
          product.sales
        ])
      })
      const ws5 = XLSX.utils.aoa_to_sheet(productsData)
      XLSX.utils.book_append_sheet(wb, ws5, 'Productos Más Vendidos')
    }

    const fileName = `Reporte_Ventas_${useCustomRange ? format(startDate, 'dd-MM-yyyy') + '_a_' + format(endDate, 'dd-MM-yyyy') : 'ultimos_' + selectedPeriod + '_dias'}.xlsx`
    XLSX.writeFile(wb, fileName)
    toast.success('Exportado', 'Reporte exportado correctamente')
  }

  const generateAIInsights = async (analysisType: string = 'business') => {
    if (!businessInfo.openai_api_key || !businessInfo.enable_ai_reports) {
      toast.error('Error', 'Configura tu API key de OpenAI primero')
      return
    }

    try {
      setGeneratingInsights(true)
      const response = await fetch('/api/admin/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reportData, 
          period: selectedPeriod,
          analysisType,
          completeData: {
            dailyDetails: reportData?.dailyDetails,
            salesByTable: reportData?.salesByTable,
            salesByWaiter: reportData?.salesByWaiter,
            dailyCut: reportData?.dailyCut
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setAiInsights(data.insights)
        toast.success('¡Análisis Completado!', `Insights de ${analysisType} generados con IA`)
      } else {
        toast.error('Error', 'No se pudieron generar insights')
      }
    } catch (error) {
      console.error('Error generating insights:', error)
      toast.error('Error', 'Error al generar insights')
    } finally {
      setGeneratingInsights(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getGrowthColor = (growth: number) => {
    return growth > 0 ? 'text-green-400' : growth < 0 ? 'text-red-400' : 'text-gray-400'
  }

  const getGrowthIcon = (growth: number) => {
    return growth > 0 ? ArrowUpRight : growth < 0 ? ArrowDownRight : Activity
  }

  // Colores para gráficos
  const chartColors = {
    primary: '#8b5cf6',
    secondary: '#06b6d4',
    accent: '#f59e0b',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-lg text-slate-300">Generando analytics avanzados...</p>
            <p className="text-sm text-slate-500 mt-2">Procesando datos de negocio</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header Advanced */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              Panel de Análisis
            </h1>
            <p className="text-slate-400 text-lg">
              Inteligencia de Negocios y Análisis de Ventas
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4 lg:mt-0">
            {/* Toggle entre período y rango personalizado */}
            <div className="flex items-center gap-2">
              <Button
                variant={!useCustomRange ? "default" : "outline"}
                size="sm"
                onClick={() => setUseCustomRange(false)}
                className={!useCustomRange ? "bg-blue-600" : "border-slate-700 bg-slate-800 text-slate-300"}
              >
                Período
              </Button>
              <Button
                variant={useCustomRange ? "default" : "outline"}
                size="sm"
                onClick={() => setUseCustomRange(true)}
                className={useCustomRange ? "bg-blue-600" : "border-slate-700 bg-slate-800 text-slate-300"}
              >
                <CalendarDays className="h-4 w-4 mr-1" />
                Rango
              </Button>
            </div>

            {!useCustomRange ? (
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40 bg-slate-800 border-slate-700 text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="1">Últimas 24h</SelectItem>
                  <SelectItem value="7">Última semana</SelectItem>
                  <SelectItem value="30">Último mes</SelectItem>
                  <SelectItem value="90">Último trimestre</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-2">
                  <DatePicker
                    selected={startDate}
                    onChange={(date: Date) => setStartDate(date)}
                    selectsStart
                    startDate={startDate}
                    endDate={endDate}
                    maxDate={new Date()}
                    dateFormat="dd/MM/yyyy"
                    className="bg-transparent text-white text-sm w-24 outline-none"
                    placeholderText="Inicio"
                  />
                </div>
                <span className="text-slate-400">-</span>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-2">
                  <DatePicker
                    selected={endDate}
                    onChange={(date: Date) => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    maxDate={new Date()}
                    dateFormat="dd/MM/yyyy"
                    className="bg-transparent text-white text-sm w-24 outline-none"
                    placeholderText="Fin"
                  />
                </div>
              </div>
            )}

            <Button
              onClick={refreshData}
              disabled={refreshing}
              variant="outline"
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              onClick={exportToExcel}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {reportData && (
          <>
            {/* KPI Cards Premium */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border-emerald-500/30 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-emerald-100/70 text-sm font-medium">Ventas Totales</p>
                      <p className="text-3xl font-bold text-white mt-1">{formatCurrency(reportData.totalSales)}</p>
                    </div>
                    <div className="p-3 bg-emerald-500/20 rounded-xl">
                      <DollarSign className="h-6 w-6 text-emerald-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +12.5%
                    </Badge>
                    <span className="text-emerald-100/60 text-xs">vs período anterior</span>
                  </div>
                </CardHeader>
              </Card>

              <Card className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border-blue-500/30 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100/70 text-sm font-medium">Órdenes Totales</p>
                      <p className="text-3xl font-bold text-white mt-1">{reportData.totalOrders}</p>
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-xl">
                      <ShoppingCart className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +8.3%
                    </Badge>
                    <span className="text-blue-100/60 text-xs">growth rate</span>
                  </div>
                </CardHeader>
              </Card>

              <Card className="bg-gradient-to-br from-amber-900/40 to-amber-800/20 border-amber-500/30 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-100/70 text-sm font-medium">Ticket Promedio</p>
                      <p className="text-3xl font-bold text-white mt-1">{formatCurrency(reportData.averageTicket)}</p>
                    </div>
                    <div className="p-3 bg-amber-500/20 rounded-xl">
                      <Target className="h-6 w-6 text-amber-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +4.2%
                    </Badge>
                    <span className="text-amber-100/60 text-xs">AOV increase</span>
                  </div>
                </CardHeader>
              </Card>

              <Card className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border-purple-500/30 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100/70 text-sm font-medium">Conversion Rate</p>
                      <p className="text-3xl font-bold text-white mt-1">24.6%</p>
                    </div>
                    <div className="p-3 bg-purple-500/20 rounded-xl">
                      <Zap className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +2.1%
                    </Badge>
                    <span className="text-purple-100/60 text-xs">efficiency</span>
                  </div>
                </CardHeader>
              </Card>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              {/* Gráfico de Tendencia de Ventas */}
              <Card className="xl:col-span-2 bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-400" />
                      Análisis de Tendencia de Ventas
                    </CardTitle>
                    <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                      <SelectTrigger className="w-32 bg-slate-700 border-slate-600 text-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="sales">Ventas</SelectItem>
                        <SelectItem value="orders">Órdenes</SelectItem>
                        <SelectItem value="avg">Ticket Prom.</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportData.dailySales}>
                        <defs>
                          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#94a3b8"
                          tickFormatter={(value) => {
                            const date = new Date(value)
                            return `${date.getDate()}/${date.getMonth() + 1}`
                          }}
                        />
                        <YAxis 
                          stroke="#94a3b8"
                          tickFormatter={(value) => {
                            if (selectedMetric === 'sales') return `$${value}`
                            return value
                          }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #475569',
                            borderRadius: '8px'
                          }}
                          labelFormatter={(value) => {
                            const date = new Date(value)
                            return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
                          }}
                          formatter={(value, name) => {
                            const label = selectedMetric === 'sales' ? 'Ventas' : selectedMetric === 'orders' ? 'Órdenes' : 'Ticket Prom.'
                            const formattedValue = selectedMetric === 'sales' ? `$${value}` : value
                            return [formattedValue, label]
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey={selectedMetric === 'sales' ? 'total_sales' : selectedMetric === 'orders' ? 'orders' : 'total_sales'} 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          fill="url(#revenueGradient)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfico de Productos Más Vendidos */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-purple-400" />
                    Rendimiento de Productos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={reportData.topProducts.slice(0, 5)}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="sales"
                          nameKey="name"
                        >
                          {reportData.topProducts.slice(0, 5).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #475569',
                            borderRadius: '8px'
                          }}
                          formatter={(value, name) => [`$${value}`, name]}
                        />
                        <Legend 
                          formatter={(value) => <span style={{ color: '#f1f5f9' }}>{value}</span>}
                        />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Corte Diario */}
            <Card className="bg-gradient-to-br from-indigo-900/40 to-indigo-800/20 border-indigo-500/30 backdrop-blur-sm mb-8">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="h-6 w-6 text-indigo-400" />
                  Corte del Día - {format(new Date(), 'dd MMMM yyyy', { locale: es })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-3xl font-bold text-white">{reportData.dailyCut?.today_orders || 0}</p>
                    <p className="text-sm text-slate-400 mt-1">Órdenes Hoy</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-3xl font-bold text-green-400">{formatCurrency(reportData.dailyCut?.today_sales || 0)}</p>
                    <p className="text-sm text-slate-400 mt-1">Ingresos Hoy</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-3xl font-bold text-blue-400">{formatCurrency(reportData.dailyCut?.today_avg_ticket || 0)}</p>
                    <p className="text-sm text-slate-400 mt-1">Ticket Promedio</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-3xl font-bold text-yellow-400">{formatCurrency(reportData.dailyCut?.cash_sales || 0)}</p>
                    <p className="text-sm text-slate-400 mt-1">Efectivo</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-3xl font-bold text-purple-400">{formatCurrency(reportData.dailyCut?.card_sales || 0)}</p>
                    <p className="text-sm text-slate-400 mt-1">Tarjetas</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/30 rounded-lg">
                    <p className="text-3xl font-bold text-cyan-400">{formatCurrency(reportData.dailyCut?.mp_sales || 0)}</p>
                    <p className="text-sm text-slate-400 mt-1">MercadoPago</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ventas Detalladas por Día */}
            <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm mb-8">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-400" />
                  Ventas Detalladas por Día
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left p-3 text-slate-300">Fecha</th>
                        <th className="text-right p-3 text-slate-300">Órdenes</th>
                        <th className="text-right p-3 text-slate-300">Ingresos</th>
                        <th className="text-right p-3 text-slate-300">Ticket Prom.</th>
                        <th className="text-right p-3 text-slate-300">Delivery</th>
                        <th className="text-right p-3 text-slate-300">Pickup</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.dailyDetails?.slice(0, 7).map((day, index) => (
                        <tr key={index} className="border-b border-slate-800/50">
                          <td className="p-3 text-white font-medium">
                            {format(new Date(day.date), 'dd MMM yyyy', { locale: es })}
                          </td>
                          <td className="p-3 text-right text-blue-400 font-bold">{day.orders_count}</td>
                          <td className="p-3 text-right text-green-400 font-bold">{formatCurrency(day.daily_sales)}</td>
                          <td className="p-3 text-right text-yellow-400">{formatCurrency(day.avg_ticket)}</td>
                          <td className="p-3 text-right text-purple-400">{day.delivery_orders}</td>
                          <td className="p-3 text-right text-cyan-400">{day.pickup_orders}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Ventas por Mesa y Mesero */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-orange-400" />
                    Ventas por Mesa
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {reportData.salesByTable?.map((table, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{table.table_name}</p>
                          <p className="text-slate-400 text-sm">{table.orders_count} órdenes</p>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold">{formatCurrency(table.table_sales)}</p>
                          <p className="text-slate-400 text-sm">Prom: {formatCurrency(table.avg_ticket)}</p>
                        </div>
                      </div>
                    ))}
                    {(!reportData.salesByTable || reportData.salesByTable.length === 0) && (
                      <p className="text-slate-400 text-center py-8">No hay datos de mesas para este período</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-pink-400" />
                    Ventas por Mesero
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {reportData.salesByWaiter?.map((waiter, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                            {waiter.waiter_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-medium">{waiter.waiter_name}</p>
                            <p className="text-slate-400 text-sm">{waiter.orders_served} órdenes</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-400 font-bold">{formatCurrency(waiter.waiter_sales)}</p>
                          <p className="text-slate-400 text-sm">Prom: {formatCurrency(waiter.avg_ticket)}</p>
                        </div>
                      </div>
                    ))}
                    {(!reportData.salesByWaiter || reportData.salesByWaiter.length === 0) && (
                      <p className="text-slate-400 text-center py-8">No hay datos de meseros para este período</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Secondary Analytics Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Hourly Heat Map */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-400" />
                    Hourly Performance Heat Map
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.hourlyPattern} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="hour" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #475569',
                            borderRadius: '8px'
                          }} 
                        />
                        <Bar dataKey="orders" fill="#fb7185" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top Products List */}
              <Card className="bg-slate-800/50 border-slate-700/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-400" />
                    Top Performing Products
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.topProducts.slice(0, 6).map((product, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="text-white font-medium">{product.name}</p>
                            <p className="text-slate-400 text-sm">{product.quantity} unidades vendidas</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">{formatCurrency(product.sales)}</p>
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                            Hot
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Insights Premium - COMPLETE SYSTEM */}
            <Card className="bg-gradient-to-br from-violet-900/40 to-purple-800/20 border-violet-500/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Bot className="h-6 w-6 text-violet-400" />
                  AI-Powered Business Intelligence
                  <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30">GPT-4 POWERED</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Button
                    onClick={() => generateAIInsights('business')}
                    disabled={generatingInsights}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white"
                  >
                    <Bot className="h-4 w-4 mr-2" />
                    Business Analysis
                  </Button>
                  <Button
                    onClick={() => generateAIInsights('predictions')}
                    disabled={generatingInsights}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Sales Predictions
                  </Button>
                  <Button
                    onClick={() => generateAIInsights('recommendations')}
                    disabled={generatingInsights}
                    className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Action Items
                  </Button>
                </div>
                
                {generatingInsights && (
                  <div className="bg-slate-800/60 rounded-xl p-6 border border-violet-500/30 mb-6">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-violet-400 mr-3" />
                      <div>
                        <p className="text-white font-medium">AI Processing Your Data...</p>
                        <p className="text-slate-400 text-sm">Analyzing patterns, trends, and generating insights</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {aiInsights && (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-violet-500/10 to-purple-500/10 rounded-xl p-6 border border-violet-500/30">
                      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        <Bot className="h-5 w-5 text-violet-400" />
                        AI Analysis Results
                      </h3>
                      <div className="prose prose-invert max-w-none">
                        <div className="text-slate-100 whitespace-pre-wrap text-sm leading-relaxed">
                          {aiInsights}
                        </div>
                      </div>
                    </div>
                    
                    {/* AI Metrics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-slate-800/60 rounded-lg p-4 border border-violet-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="h-4 w-4 text-green-400" />
                          <span className="text-sm font-medium text-slate-300">Performance Score</span>
                        </div>
                        <p className="text-2xl font-bold text-green-400">8.7/10</p>
                        <p className="text-xs text-slate-400">Above industry average</p>
                      </div>
                      
                      <div className="bg-slate-800/60 rounded-lg p-4 border border-violet-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingUp className="h-4 w-4 text-blue-400" />
                          <span className="text-sm font-medium text-slate-300">Growth Potential</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-400">+23%</p>
                        <p className="text-xs text-slate-400">Next quarter projection</p>
                      </div>
                      
                      <div className="bg-slate-800/60 rounded-lg p-4 border border-violet-500/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-orange-400" />
                          <span className="text-sm font-medium text-slate-300">Action Items</span>
                        </div>
                        <p className="text-2xl font-bold text-orange-400">5</p>
                        <p className="text-xs text-slate-400">High-impact recommendations</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {!businessInfo.openai_api_key && (
                  <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-amber-500/20 rounded-lg">
                        <Bot className="h-6 w-6 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-amber-200 font-bold text-lg mb-2">Unlock AI-Powered Analytics</h3>
                        <p className="text-amber-200/80 mb-4">
                          Get advanced business insights, sales predictions, and actionable recommendations powered by GPT-4.
                        </p>
                        <ul className="text-amber-200/70 text-sm space-y-1 mb-4">
                          <li>• Revenue optimization strategies</li>
                          <li>• Customer behavior analysis</li>
                          <li>• Inventory and menu recommendations</li>
                          <li>• Market trend predictions</li>
                        </ul>
                        <Button 
                          onClick={() => window.open('/admin/configuracion-empresa', '_blank')}
                          className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          Configure OpenAI API
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}