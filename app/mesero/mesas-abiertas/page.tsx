"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Printer, CheckCircle, ChevronDown, ChevronUp, Loader2, PlusCircle, Clock, DollarSign, CreditCard, Banknote, Calculator } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-notifications";

interface MeseroOrder {
  id: number;
  table: string;
  status: string;
  created_at: string;
  items: any[];
  total: number;
  notes?: string;
}

interface GroupedTable {
  tableName: string;
  orders: MeseroOrder[];
  totalMesa: number;
  allItems: any[];
  firstOrderDate: string;
  lastOrderDate: string;
  orderCount: number;
}

export default function MesasAbiertasPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [tables, setTables] = useState<GroupedTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingTable, setPrintingTable] = useState<string | null>(null);
  const [closingTable, setClosingTable] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  
  // Modal de cierre de mesa
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedTableToClose, setSelectedTableToClose] = useState<GroupedTable | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'efectivo' | 'tarjeta'>('efectivo');
  const [amountPaid, setAmountPaid] = useState('');
  const [calculating, setCalculating] = useState(false);
  
  const [businessInfo, setBusinessInfo] = useState<any>({
    name: 'SUPER NOVA',
    slogan: 'Restaurante & Delivery',
    address: 'Av. Principal #123',
    phone: '(555) 123-4567',
    email: 'info@supernova.com',
    website: 'www.supernova-delivery.com',
    instagram: '@SuperNovaRestaurante',
    facebook: '@SuperNovaOficial',
    whatsapp: '+52 555 123 4567'
  });

  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/mesero/open-tables", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setTables(data.tables || []);
      } else {
        toast.error("Error", data.error || "No se pudieron cargar las mesas abiertas");
      }
    } catch (e) {
      toast.error("Error", "No se pudieron cargar las mesas abiertas");
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessInfo = async () => {
    try {
      const res = await fetch("/api/admin/business-info", { credentials: "include" });
      const data = await res.json();
      console.log("Business info response:", data);
      if (data.success && data.businessInfo) {
        console.log("Setting business info:", data.businessInfo);
        setBusinessInfo(data.businessInfo);
      }
    } catch (e) {
      console.log("Error loading business info:", e);
    }
  };

  useEffect(() => {
    fetchTables();
    fetchBusinessInfo();
    // Optionally, poll every 30s
    // const interval = setInterval(fetchTables, 30000);
    // return () => clearInterval(interval);
  }, []);

  const toggleTableExpansion = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const handlePrintTable = async (table: GroupedTable) => {
    console.log("🖨️ Printing ticket for table:", table.tableName);
    console.log("=== TICKET GENERATION DEBUG ===");
    console.log("Business info:", businessInfo);
    console.log("Logo URL from DB:", businessInfo.logo_url);
    console.log("Current origin:", window.location.origin);
    
    setPrintingTable(table.tableName);
    
    const ticketContent = generateTableTicket(table);
    console.log("📄 Generated ticket HTML length:", ticketContent.length);
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(ticketContent);
      printWindow.document.close();
      
      // Esperar a que se carguen las imágenes antes de imprimir
      printWindow.onload = () => {
        console.log("🖼️ Print window loaded, waiting for images...");
        setTimeout(() => {
          console.log("🖨️ Starting print...");
          printWindow.print();
          printWindow.onafterprint = () => {
            console.log("✅ Print completed");
            printWindow.close();
            setPrintingTable(null);
          };
        }, 1500); // Reducido a 1.5 segundos
      };
    } else {
      console.error("❌ Failed to open print window");
      toast.error("Error", "No se pudo abrir la ventana de impresión");
      setPrintingTable(null);
    }
  };

  const handleCloseTable = (table: GroupedTable) => {
    setSelectedTableToClose(table);
    setPaymentMethod('efectivo');
    setAmountPaid('');
    setCloseModalOpen(true);
  };

  const handleConfirmCloseTable = async () => {
    if (!selectedTableToClose) return;
    
    // Validaciones
    if (paymentMethod === 'efectivo') {
      const paid = parseFloat(amountPaid);
      const total = selectedTableToClose.totalMesa;
      
      if (!amountPaid || isNaN(paid)) {
        toast.error("Error", "Ingresa el monto que pagó el cliente");
        return;
      }
      
      if (paid < total) {
        toast.error("Error", `El monto pagado ($${paid.toFixed(2)}) es menor al total ($${total.toFixed(2)})`);
        return;
      }
    }
    
    setCalculating(true);
    
    try {
      console.log('💳 Procesando cierre de mesa con pago:', {
        tableId: selectedTableToClose.tableName,
        paymentMethod,
        amountPaid: paymentMethod === 'efectivo' ? amountPaid : selectedTableToClose.totalMesa,
        totalAmount: selectedTableToClose.totalMesa
      });

      const response = await fetch('/api/close-table-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tableId: selectedTableToClose.tableName,
          paymentMethod,
          amountPaid: paymentMethod === 'efectivo' ? parseFloat(amountPaid) : selectedTableToClose.totalMesa,
          totalAmount: selectedTableToClose.totalMesa
        })
      });

      const result = await response.json();

      if (result.success) {
        const change = paymentMethod === 'efectivo' ? parseFloat(amountPaid) - selectedTableToClose.totalMesa : 0;
        
        if (paymentMethod === 'efectivo' && change > 0) {
          toast.success("Mesa cerrada", `Mesa ${selectedTableToClose.tableName} cerrada. Cambio: $${change.toFixed(2)}`);
        } else {
          toast.success("Mesa cerrada", `Mesa ${selectedTableToClose.tableName} cerrada correctamente`);
        }
        
        setCloseModalOpen(false);
        setSelectedTableToClose(null);
        setPaymentMethod('tarjeta');
        setAmountPaid('');
        fetchTables();
      } else {
        toast.error("Error", result.error || "No se pudo cerrar la mesa");
      }
    } catch (e) {
      console.error('❌ Error procesando pago:', e);
      toast.error("Error", "No se pudo cerrar la mesa");
    } finally {
      setCalculating(false);
    }
  };

  const generateTableTicket = (table: GroupedTable) => {
    const now = new Date().toLocaleString();
    
    // Construir URL del logo de forma segura
    let logoUrl = null;
    
    if (businessInfo.logo_url) {
      try {
        if (businessInfo.logo_url.startsWith('http://') || businessInfo.logo_url.startsWith('https://')) {
          logoUrl = businessInfo.logo_url;
        } else if (businessInfo.logo_url.startsWith('/')) {
          logoUrl = `${window.location.origin}${businessInfo.logo_url}`;
        } else {
          logoUrl = `${window.location.origin}/${businessInfo.logo_url}`;
        }
      } catch (error) {
        logoUrl = null;
      }
    }
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ticket - ${table.tableName}</title>
          <meta charset="UTF-8">
          <style>
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            body { 
              font-family: 'Courier New', monospace; 
              width: 320px; 
              margin: 0 auto; 
              padding: 15px; 
              background: white;
              color: #000;
              font-weight: 900;
              -webkit-font-smoothing: antialiased;
              text-rendering: optimizeLegibility;
            }
            
            .header { 
              text-align: center; 
              border-bottom: 3px dashed #000; 
              padding-bottom: 15px; 
              margin-bottom: 15px; 
            }
            
            .logo {
              width: 120px;
              height: 120px;
              margin: 0 auto 15px auto;
              background: #ffffff;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 3px solid #000;
              overflow: hidden;
              position: relative;
              box-sizing: border-box;
              padding: 5px;
            }
            
            .logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
              border-radius: 50%;
              display: block;
              max-width: 100%;
              max-height: 100%;
              filter: contrast(1.3) brightness(0.9);
            }
            
            .logo img[src=""], .logo img:not([src]) {
              display: none;
            }
            
            .logo .fallback {
              font-size: 28px;
              color: #000;
              font-weight: 900;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 100%;
              height: 100%;
              text-align: center;
            }
            
            .business-name {
              font-size: 20px;
              font-weight: 900;
              margin: 10px 0 5px 0;
              letter-spacing: 2px;
              color: #000;
              text-transform: uppercase;
            }
            
            .business-info {
              font-size: 12px;
              margin: 3px 0;
              color: #000;
              font-weight: 700;
            }
            
            .table-info {
              font-size: 16px;
              font-weight: 900;
              margin: 10px 0;
              padding: 8px;
              background: #000;
              color: #fff;
              border: 2px solid #000;
            }
            
            .items {
              margin: 15px 0;
            }
            
            .item { 
              display: flex; 
              justify-content: space-between; 
              margin: 8px 0; 
              padding: 5px 0;
              border-bottom: 2px solid #000;
              font-weight: 900;
            }
            
            .item:last-child {
              border-bottom: 2px solid #000;
            }
            
            .item-name {
              flex: 1;
              margin-right: 10px;
              font-size: 13px;
              color: #000;
              font-weight: 900;
            }
            
            .item-price {
              font-weight: 900;
              min-width: 70px;
              text-align: right;
              font-size: 14px;
              color: #000;
            }
            
            .total { 
              border-top: 4px double #000; 
              padding-top: 12px; 
              margin-top: 15px; 
              font-weight: 900; 
              font-size: 20px;
              background: #000;
              color: #fff;
              padding: 12px 8px;
            }
            
            .total .item {
              border-bottom: none;
              color: #fff;
              margin: 0;
            }
            
            .total .item-price {
              color: #fff;
              font-size: 20px;
            }
            
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              font-size: 13px;
              border-top: 3px dashed #000;
              padding-top: 15px;
              font-weight: 700;
            }
            
            .thank-you {
              font-size: 16px;
              font-weight: 900;
              margin: 12px 0;
              color: #000;
              text-transform: uppercase;
            }
            
            .social {
              font-size: 11px;
              margin: 6px 0;
              color: #000;
              font-weight: 700;
            }
            
            @media print {
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              body {
                font-weight: 900 !important;
                color: #000 !important;
              }
              
              .business-name,
              .business-info,
              .table-info,
              .item,
              .item-name,
              .item-price,
              .total,
              .thank-you,
              .social {
                font-weight: 900 !important;
                color: #000 !important;
              }
              
              .table-info {
                background: #000 !important;
                color: #fff !important;
              }
              
              .total {
                background: #000 !important;
                color: #fff !important;
              }
              
              .total .item,
              .total .item-price {
                color: #fff !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              ${logoUrl 
                ? `<img src="${logoUrl}" alt="Logo">`
                : '<div class="fallback">⭐🚀</div>'
              }
            </div>
            <div class="business-name">${businessInfo.name}</div>
            <div class="business-info">${businessInfo.slogan}</div>
            <div class="business-info">Direccion: ${businessInfo.address}</div>
            <div class="business-info">Tel: ${businessInfo.phone}</div>
            ${businessInfo.email ? `<div class="business-info">Email: ${businessInfo.email}</div>` : ''}
            
            <div class="table-info">
              <div><strong>Mesa: ${table.tableName}</strong></div>
              <div>${now}</div>
              <div>Pedidos: ${table.orderCount}</div>
            </div>
            </div>
            
            <div class="items">
            ${table.allItems.map(item => `
              <div class="item">
                <span class="item-name">${item.quantity || 1}x ${item.name}</span>
                <span class="item-price">$${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
              </div>
            `).join('')}
            </div>          <div class="total">
            <div class="item">
              <span>TOTAL:</span>
              <span class="item-price">$${table.totalMesa.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <div class="thank-you">Gracias por su visita!</div>
            <div class="social">Siguenos en redes sociales</div>
            ${businessInfo.instagram ? `<div class="social">${businessInfo.instagram}</div>` : ''}
            ${businessInfo.facebook ? `<div class="social">${businessInfo.facebook}</div>` : ''}
            ${businessInfo.website ? `<div class="social">${businessInfo.website}</div>` : ''}
            ${businessInfo.whatsapp ? `<div class="social">WhatsApp: ${businessInfo.whatsapp}</div>` : ''}
            <div style="margin-top: 15px; font-size: 10px; border-top: 1px dashed #ccc; padding-top: 10px;">
              <div>Ticket #${Math.random().toString(36).substr(2, 9).toUpperCase()}</div>
              <div style="margin-top: 5px; color: #999;">
                ${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]}
              </div>
            </div>
          </div>
        </body>
        <script>
          // Fallback para logos que no cargan
          document.addEventListener('DOMContentLoaded', function() {
            var logoImg = document.querySelector('.logo img');
            if (logoImg) {
              logoImg.onerror = function() {
                this.parentElement.innerHTML = '<div class=\"fallback\">⭐🚀</div>';
              };
            }
          });
        </script>
      </html>
    `;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 py-4 sm:py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent mb-2">Panel de Mesas - Mesero</h1>
          <p className="text-purple-200">Mesas abiertas. Cada pedido se muestra individualmente.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : tables.length === 0 ? (
          <Card className="backdrop-blur-sm bg-white/10 border-purple-500/20 shadow-xl">
            <CardContent className="text-center text-purple-200 py-12">
              <p className="text-lg">No hay mesas abiertas en este momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <Card key={table.tableName} className="backdrop-blur-sm bg-white/10 border-purple-500/20 shadow-xl hover:shadow-2xl hover:bg-white/15 transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      {table.tableName}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge className="bg-purple-600/80 text-white border-none">
                        {table.orderCount} pedidos
                      </Badge>
                      <Badge className="bg-green-600/80 text-white border-none">
                        ${table.totalMesa.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-purple-300">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{new Date(table.firstOrderDate).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      <span>Total Mesa</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {/* Mostrar items de la mesa */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm text-white mb-2">Productos en mesa:</h4>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {table.allItems.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-purple-200 font-medium">{item.quantity || 1}x {item.name}</span>
                          <span className="text-green-400 font-semibold">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                        </div>
                      ))}
                      {table.allItems.length > 5 && (
                        <div className="text-xs text-purple-300 font-medium">
                          +{table.allItems.length - 5} productos más...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detalles expandibles */}
                  <Collapsible open={expandedTables.has(table.tableName)} onOpenChange={() => toggleTableExpansion(table.tableName)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between text-sm p-2 h-8 text-purple-200 hover:bg-purple-800/20">
                        <span>Ver pedidos individuales ({table.orderCount})</span>
                        {expandedTables.has(table.tableName) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2">
                      {table.orders.map((order) => (
                        <div key={order.id} className="bg-purple-800/20 backdrop-blur-sm rounded-lg p-3 text-sm border border-purple-500/30">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-white">Pedido #{order.id}</span>
                            <span className="text-green-400">${Number(order.total).toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-purple-300">
                            {new Date(order.created_at).toLocaleString()}
                          </div>
                          {order.notes && (
                            <div className="text-xs text-blue-300 mt-1">
                              Nota: {order.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Botones de acción */}
                  <div className="grid grid-cols-1 gap-2 mt-4">
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-gray-800 to-black text-white hover:from-gray-700 hover:to-gray-900" 
                      onClick={() => handlePrintTable(table)} 
                      disabled={printingTable === table.tableName}
                    >
                      {printingTable === table.tableName ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Printer className="h-4 w-4 mr-2" />
                      )}
                      Imprimir Ticket Mesa
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        className="bg-purple-600/80 backdrop-blur-sm text-white hover:bg-purple-700/80 border border-purple-400/30" 
                        onClick={() => {
                          // Usar el primer pedido para agregar productos a la mesa
                          window.location.href = `/menu?mesa=${table.orders[0].id}`;
                        }}
                      >
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Agregar
                      </Button>
                      
                      <Button 
                        size="sm" 
                        className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700" 
                        onClick={() => handleCloseTable(table)} 
                        disabled={closingTable === table.tableName}
                      >
                        {closingTable === table.tableName ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Cerrar Mesa
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Cierre de Mesa */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent className="max-w-md bg-white border-2 border-gray-300">
          <DialogHeader>
            <DialogTitle className="flex items-center text-gray-900 font-bold text-lg">
              <Calculator className="h-5 w-5 mr-2 text-blue-600" />
              Cerrar Mesa {selectedTableToClose?.tableName}
            </DialogTitle>
          </DialogHeader>
          
          {selectedTableToClose && (
            <div className="space-y-4">
              {/* Resumen de la mesa */}
              <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg border border-white/20">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800">Total a pagar:</span>
                  <span className="text-xl font-bold text-green-600">
                    ${selectedTableToClose.totalMesa.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm text-gray-700">
                  {selectedTableToClose.orderCount} pedido(s) • {selectedTableToClose.allItems.length} producto(s)
                </div>
              </div>

              {/* Método de pago */}
              <div>
                <Label className="text-lg font-bold mb-3 block text-gray-900">Método de pago</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value: 'efectivo' | 'tarjeta') => setPaymentMethod(value)}>
                  <div className="flex items-center space-x-2 p-3 bg-white/90 rounded-lg border border-gray-300">
                    <RadioGroupItem value="efectivo" id="efectivo" />
                    <Label htmlFor="efectivo" className="flex items-center cursor-pointer text-gray-900 font-bold text-base">
                      <Banknote className="h-5 w-5 mr-2 text-green-600" />
                      Efectivo
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-white/90 rounded-lg border border-gray-300">
                    <RadioGroupItem value="tarjeta" id="tarjeta" />
                    <Label htmlFor="tarjeta" className="flex items-center cursor-pointer text-gray-900 font-bold text-base">
                      <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                      Tarjeta
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Monto pagado (solo para efectivo) */}
              {paymentMethod === 'efectivo' && (
                <div>
                  <Label htmlFor="amount-paid" className="text-lg font-bold text-gray-900">
                    ¿Con cuánto paga el cliente?
                  </Label>
                  <Input
                    id="amount-paid"
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    placeholder="0.00"
                    className="text-xl mt-2 bg-white text-gray-900 border-2 border-gray-400 focus:border-blue-600 font-bold placeholder:text-gray-500"
                    step="0.01"
                    min={selectedTableToClose.totalMesa}
                  />
                  
                  {/* Cálculo del cambio */}
                  {amountPaid && !isNaN(parseFloat(amountPaid)) && (
                    <div className="mt-2 p-3 bg-white/90 backdrop-blur-sm rounded border border-blue-200">
                      <div className="flex justify-between text-sm text-gray-800">
                        <span className="font-medium">Total:</span>
                        <span className="font-semibold">${selectedTableToClose.totalMesa.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-800">
                        <span className="font-medium">Pagó:</span>
                        <span className="font-semibold">${parseFloat(amountPaid).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2 mt-1">
                        <span className="text-gray-800">Cambio:</span>
                        <span className={parseFloat(amountPaid) >= selectedTableToClose.totalMesa ? 'text-green-600' : 'text-red-600'}>
                          ${Math.max(0, parseFloat(amountPaid) - selectedTableToClose.totalMesa).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Información de pago con tarjeta */}
              {paymentMethod === 'tarjeta' && (
                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center text-blue-800 mb-2">
                    <CreditCard className="h-4 w-4 mr-2" />
                    <span className="font-semibold">Pago con tarjeta</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Se cobrará exactamente <strong className="text-gray-900">${selectedTableToClose.totalMesa.toFixed(2)}</strong>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Este pago se registrará en el sistema para reportes
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setCloseModalOpen(false)}
              disabled={calculating}
              className="border-gray-400 text-white hover:bg-gray-100 font-semibold"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmCloseTable}
              disabled={calculating || (paymentMethod === 'efectivo' && (!amountPaid || parseFloat(amountPaid) < (selectedTableToClose?.totalMesa || 0)))}
              className="bg-green-600 hover:bg-green-700 text-white font-bold"
            >
              {calculating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cerrando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Cerrar Mesa
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
