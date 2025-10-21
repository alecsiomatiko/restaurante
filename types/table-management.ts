// Tipos TypeScript para el sistema de gestión de mesas
export interface ClienteEnMesa {
  id: string;
  nombre: string;
  productos: ProductoAsignado[];
  total: number;
  mesa: string;
  created_at: string;
}

export interface ProductoAsignado {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  cliente_id: string;
  order_id: number;
  assignment_id?: number;
}

export interface MesaDividida {
  mesa: string;
  clientes: ClienteEnMesa[];
  totalMesa: number;
  productosSinAsignar: ProductoSinAsignar[];
}

export interface ProductoSinAsignar {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  order_id: number;
}

export interface MesaUnificada {
  id: number;
  unified_name: string;
  original_tables: string[];
  main_table: string;
  created_by: number;
  created_at: string;
  status: 'active' | 'separated' | 'closed';
  notes?: string;
  total_amount: number;
  order_count: number;
  combined_items: any[];
}

export interface AsignacionRequest {
  order_id: number;
  producto_id: number;
  cantidad: number;
  cliente_nombre: string;
  precio_unitario: number;
}

export interface UnificarMesasRequest {
  mesas: string[];
  unified_name: string;
  main_table: string;
  notes?: string;
}

export interface SepararMesaRequest {
  unified_table_id: number;
  redistribution: {
    mesa: string;
    productos: {
      order_id: number;
      producto_id: number;
      cantidad: number;
    }[];
  }[];
}