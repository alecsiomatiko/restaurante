const mysql = require('mysql2/promise');

async function createTableManagementTables() {
  console.log('🔌 Conectando a MySQL para crear tablas del sistema de gestión de mesas...');
  
  const config = {
    host: 'srv440.hstgr.io',
    user: 'u191251575_manu',
    password: 'Cerounocero.com20182417',
    database: 'u191251575_manu',
    port: 3306
  };

  try {
    const connection = await mysql.createConnection(config);
    console.log('✅ Conexión exitosa a MySQL!');
    
    // Crear tabla product_assignments
    console.log('📋 Creando tabla product_assignments...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS product_assignments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          producto_id INT NOT NULL,
          cantidad INT NOT NULL,
          cliente_nombre VARCHAR(255) NOT NULL,
          precio_unitario DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
          INDEX idx_order_producto (order_id, producto_id),
          INDEX idx_cliente (cliente_nombre)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Tabla product_assignments creada exitosamente');
    } catch (error) {
      console.log('⚠️  product_assignments:', error.message);
    }
    
    // Crear tabla unified_tables
    console.log('📋 Creando tabla unified_tables...');
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS unified_tables (
          id INT AUTO_INCREMENT PRIMARY KEY,
          unified_name VARCHAR(255) NOT NULL,
          main_table VARCHAR(50) NOT NULL,
          original_tables JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_unified_name (unified_name),
          INDEX idx_main_table (main_table)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Tabla unified_tables creada exitosamente');
    } catch (error) {
      console.log('⚠️  unified_tables:', error.message);
    }
    
    // Agregar columna unified_table_id a orders si no existe
    console.log('📋 Agregando columna unified_table_id a orders...');
    try {
      await connection.execute(`
        ALTER TABLE orders 
        ADD COLUMN unified_table_id INT NULL,
        ADD FOREIGN KEY (unified_table_id) REFERENCES unified_tables(id) ON DELETE SET NULL
      `);
      console.log('✅ Columna unified_table_id agregada exitosamente');
    } catch (error) {
      console.log('⚠️  unified_table_id:', error.message);
    }
    
    // Verificar que las tablas fueron creadas
    console.log('\n🔍 Verificando tablas creadas...');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'u191251575_manu' 
      AND TABLE_NAME IN ('product_assignments', 'unified_tables')
    `);
    
    console.log('📊 Tablas del sistema de gestión encontradas:');
    tables.forEach(table => {
      console.log(`  ✅ ${table.TABLE_NAME}`);
    });
    
    await connection.end();
    console.log('\n🎉 Sistema de gestión de mesas configurado exitosamente!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTableManagementTables();