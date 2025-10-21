-- Script SQL para crear las tablas del sistema de división y unificación de mesas
-- Ejecutar en MySQL

-- Tabla para asignaciones de productos a clientes específicos
CREATE TABLE IF NOT EXISTS product_assignments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  producto_id INT NOT NULL,
  cantidad INT NOT NULL,
  cliente_nombre VARCHAR(255) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_order_id (order_id),
  INDEX idx_cliente (cliente_nombre),
  INDEX idx_producto (producto_id),
  
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Tabla para mesas unificadas
CREATE TABLE IF NOT EXISTS unified_tables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unified_name VARCHAR(255) NOT NULL,
  original_tables JSON NOT NULL, -- Array de nombres de mesas originales
  main_table VARCHAR(255) NOT NULL, -- Mesa principal de referencia
  created_by INT NOT NULL, -- ID del mesero que unificó
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('active', 'separated', 'closed') DEFAULT 'active',
  notes TEXT,
  
  INDEX idx_unified_name (unified_name),
  INDEX idx_main_table (main_table),
  INDEX idx_created_by (created_by),
  
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Agregar campos a la tabla orders para manejar unificación
ALTER TABLE orders 
ADD COLUMN unified_table_id INT NULL,
ADD COLUMN original_table VARCHAR(255) NULL,
ADD INDEX idx_unified_table_id (unified_table_id),
ADD FOREIGN KEY (unified_table_id) REFERENCES unified_tables(id) ON DELETE SET NULL;

-- Comentarios sobre las tablas:
-- product_assignments: Almacena qué productos están asignados a qué clientes
-- unified_tables: Registra las unificaciones de mesas con historial
-- orders.unified_table_id: Vincula órdenes con mesas unificadas
-- orders.original_table: Guarda el nombre original de la mesa antes de unificar