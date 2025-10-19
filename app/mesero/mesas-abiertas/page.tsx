"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Printer, CheckCircle, ChevronDown, ChevronUp, Loader2, PlusCircle, Clock, DollarSign } from "lucide-react";
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
    setPrintingTable(table.tableName);
    // Create consolidated ticket content
    const ticketContent = generateTableTicket(table);
    
    // Open print window with ticket content
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(ticketContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    }
    
    setPrintingTable(null);
  };

  const handleCloseTable = async (table: GroupedTable) => {
    setClosingTable(table.tableName);
    try {
      // Close all orders in this table
      const orderIds = table.orders.map(o => o.id);
      const promises = orderIds.map(id =>
        fetch(`/api/mesero/close-table/${id}`, {
          method: "PATCH",
          credentials: "include",
        })
      );
      
      const results = await Promise.all(promises);
      const allSuccessful = results.every(res => res.ok);
      
      if (allSuccessful) {
        toast.success("Mesa cerrada", `La mesa ${table.tableName} ha sido marcada como pagada y cerrada.`);
        fetchTables();
      } else {
        toast.error("Error", "No se pudieron cerrar todas las órdenes de la mesa");
      }
    } catch (e) {
      toast.error("Error", "No se pudo cerrar la mesa");
    } finally {
      setClosingTable(null);
    }
  };

  const generateTableTicket = (table: GroupedTable) => {
    const now = new Date().toLocaleString();
    const consolidatedItems = consolidateItems(table.allItems);
    
    console.log("Generating ticket with business info:", businessInfo);
    console.log("Logo URL:", businessInfo.logo_url);
    
    return `
      <html>
        <head>
          <title>Ticket - ${table.tableName}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              width: 320px; 
              margin: 0 auto; 
              padding: 15px; 
              background: white;
              color: black;
            }
            .header { 
              text-align: center; 
              border-bottom: 2px dashed #000; 
              padding-bottom: 15px; 
              margin-bottom: 15px; 
            }
            .logo {
              width: 80px;
              height: 80px;
              margin: 0 auto 10px auto;
              background: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid #000;
              font-size: 24px;
              font-weight: bold;
              overflow: hidden;
            }
            .logo img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              border-radius: 50%;
            }
            .business-name {
              font-size: 18px;
              font-weight: bold;
              margin: 10px 0 5px 0;
              letter-spacing: 1px;
            }
            .business-info {
              font-size: 11px;
              margin: 2px 0;
              color: #333;
            }
            .table-info {
              font-size: 14px;
              font-weight: bold;
              margin: 10px 0;
              padding: 5px;
              background: #f5f5f5;
              border: 1px solid #ddd;
            }
            .item { 
              display: flex; 
              justify-content: space-between; 
              margin: 5px 0; 
              padding: 2px 0;
              border-bottom: 1px dotted #ccc;
            }
            .item:last-child {
              border-bottom: none;
            }
            .item-name {
              flex: 1;
              margin-right: 10px;
            }
            .item-price {
              font-weight: bold;
              min-width: 60px;
              text-align: right;
            }
            .total { 
              border-top: 2px dashed #000; 
              padding-top: 10px; 
              margin-top: 15px; 
              font-weight: bold; 
              font-size: 16px;
            }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              font-size: 12px;
              border-top: 1px dashed #000;
              padding-top: 15px;
            }
            .thank-you {
              font-size: 14px;
              font-weight: bold;
              margin: 10px 0;
            }
            .social {
              font-size: 10px;
              margin: 5px 0;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">
              ${businessInfo.logo_url 
                ? `<img src="http://localhost:3000${businessInfo.logo_url}" alt="Logo" />` 
                : '⭐🚀'
              }
            </div>
            <div class="business-name">${businessInfo.name}</div>
            <div class="business-info">${businessInfo.slogan}</div>
            <div class="business-info">📍 ${businessInfo.address}</div>
            <div class="business-info">� ${businessInfo.phone}</div>
            ${businessInfo.email ? `<div class="business-info">✉️ ${businessInfo.email}</div>` : ''}
            
            <div class="table-info">
              <div><strong>Mesa: ${table.tableName}</strong></div>
              <div>${now}</div>
              <div>Pedidos: ${table.orderCount}</div>
            </div>
          </div>
          
          <div class="items">
            ${consolidatedItems.map(item => `
              <div class="item">
                <span class="item-name">${item.quantity}x ${item.name}</span>
                <span class="item-price">$${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          
          <div class="total">
            <div class="item">
              <span>TOTAL:</span>
              <span class="item-price">$${table.totalMesa.toFixed(2)}</span>
            </div>
          </div>
          
          <div class="footer">
            <div class="thank-you">¡Gracias por su visita!</div>
            <div class="social">Síguenos en redes sociales</div>
            ${businessInfo.instagram ? `<div class="social">${businessInfo.instagram}</div>` : ''}
            ${businessInfo.facebook ? `<div class="social">${businessInfo.facebook}</div>` : ''}
            ${businessInfo.website ? `<div class="social">${businessInfo.website}</div>` : ''}
            ${businessInfo.whatsapp ? `<div class="social">WhatsApp: ${businessInfo.whatsapp}</div>` : ''}
            <div style="margin-top: 15px; font-size: 10px;">
              Ticket #${Math.random().toString(36).substr(2, 9).toUpperCase()}
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const consolidateItems = (items: any[]) => {
    const consolidated: { [key: string]: any } = {};
    
    items.forEach(item => {
      const key = `${item.name}-${item.price}`;
      if (consolidated[key]) {
        consolidated[key].quantity += item.quantity || 1;
      } else {
        consolidated[key] = { ...item, quantity: item.quantity || 1 };
      }
    });
    
    return Object.values(consolidated);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-white to-yellow-200 py-4 sm:py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-800 mb-2">Panel de Mesas - Mesero</h1>
          <p className="text-yellow-700">Mesas abiertas agrupadas. Cada mesa puede tener múltiples pedidos.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-600" />
          </div>
        ) : tables.length === 0 ? (
          <Card className="backdrop-blur-md bg-white/60 border-none shadow-lg">
            <CardContent className="text-center text-yellow-700 py-12">
              <p className="text-lg">No hay mesas abiertas en este momento.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tables.map((table) => (
              <Card key={table.tableName} className="backdrop-blur-md bg-white/80 border-none shadow-lg hover:shadow-xl transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-yellow-800">
                      {table.tableName}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                        {table.orderCount} pedidos
                      </Badge>
                      <Badge variant="outline" className="border-green-500 text-green-700">
                        ${table.totalMesa.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-yellow-600">
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
                  {/* Mostrar resumen de items consolidados */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-sm text-gray-800 mb-2">Productos en mesa:</h4>
                    <div className="space-y-1">
                      {consolidateItems(table.allItems).slice(0, 3).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-800 font-medium">{item.quantity}x {item.name}</span>
                          <span className="text-green-700 font-semibold">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      {consolidateItems(table.allItems).length > 3 && (
                        <div className="text-xs text-gray-700 font-medium">
                          +{consolidateItems(table.allItems).length - 3} productos más...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detalles expandibles */}
                  <Collapsible open={expandedTables.has(table.tableName)} onOpenChange={() => toggleTableExpansion(table.tableName)}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between text-sm p-2 h-8">
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
                        <div key={order.id} className="bg-yellow-50/50 rounded p-2 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Pedido #{order.id}</span>
                            <span className="text-gray-600">${Number(order.total).toFixed(2)}</span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(order.created_at).toLocaleString()}
                          </div>
                          {order.notes && (
                            <div className="text-xs text-blue-600 mt-1">
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
                      className="bg-black text-white hover:opacity-95" 
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
                        variant="outline"
                        className="border-yellow-600 text-yellow-700 hover:bg-yellow-50" 
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
                        className="bg-green-600 text-white hover:bg-green-700" 
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
    </div>
  );
}
