const mysql = require('mysql2/promise');

async function testUnifiedTablesAPI() {
  console.log('🧪 Probando API de mesas unificadas...');
  
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
    
    // Crear una mesa unificada de prueba
    console.log('\n📝 Creando mesa unificada de prueba...');
    
    const nombreTest = 'Mesa Test Unificada';
    const mesasTest = ['Mesa Test 1', 'Mesa Test 2'];
    
    // Limpiar datos previos
    await connection.execute(`
      DELETE FROM unified_tables WHERE unified_name = ?
    `, [nombreTest]);
    
    // Crear mesa unificada
    const [result] = await connection.execute(`
      INSERT INTO unified_tables (unified_name, main_table, original_tables, created_at)
      VALUES (?, ?, ?, NOW())
    `, [nombreTest, mesasTest[0], JSON.stringify(mesasTest)]);
    
    const unifiedTableId = result.insertId;
    console.log(`✅ Mesa unificada creada con ID: ${unifiedTableId}`);
    
    // Probar la consulta de la API
    console.log('\n📊 Probando consulta de mesas unificadas...');
    
    const [mesasUnificadas] = await connection.execute(`
      SELECT 
        ut.id,
        ut.unified_name,
        ut.main_table,
        ut.original_tables,
        ut.created_at,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total) as total_amount
      FROM unified_tables ut
      LEFT JOIN orders o ON o.unified_table_id = ut.id AND o.status = 'open_table'
      GROUP BY ut.id, ut.unified_name, ut.main_table, ut.original_tables, ut.created_at
      ORDER BY ut.created_at DESC
    `);
    
    console.log(`🔍 Mesas unificadas encontradas: ${mesasUnificadas.length}`);
    
    // Simular procesamiento de la API
    const processedTables = mesasUnificadas.map(tabla => {
      console.log(`\n📋 Procesando tabla: ${tabla.unified_name}`);
      console.log(`  - total_orders: ${tabla.total_orders} (tipo: ${typeof tabla.total_orders})`);
      console.log(`  - total_amount: ${tabla.total_amount} (tipo: ${typeof tabla.total_amount})`);
      
      return {
        id: tabla.id,
        nombre: tabla.unified_name,
        mesaPrincipal: tabla.main_table,
        mesasOriginales: JSON.parse(tabla.original_tables || '[]'),
        totalOrdenes: parseInt(tabla.total_orders) || 0,
        montoTotal: parseFloat(tabla.total_amount) || 0,
        fechaCreacion: tabla.created_at
      };
    });
    
    console.log('\n🔄 Resultado procesado:');
    processedTables.forEach(tabla => {
      console.log(`  📄 ${tabla.nombre}:`);
      console.log(`     - Mesas originales: ${tabla.mesasOriginales.join(', ')}`);
      console.log(`     - Total órdenes: ${tabla.totalOrdenes} (tipo: ${typeof tabla.totalOrdenes})`);
      console.log(`     - Monto total: $${tabla.montoTotal.toFixed(2)} (tipo: ${typeof tabla.montoTotal})`);
      console.log('');
    });
    
    // Simular respuesta de la API
    const apiResponse = {
      success: true,
      mesasUnificadas: processedTables
    };
    
    console.log('📡 Respuesta simulada de la API:');
    console.log(JSON.stringify(apiResponse, null, 2));
    
    // Limpiar datos de prueba
    await connection.execute(`
      DELETE FROM unified_tables WHERE id = ?
    `, [unifiedTableId]);
    
    console.log('\n🧹 Datos de prueba limpiados');
    
    await connection.end();
    console.log('\n✅ Prueba de API de mesas unificadas completada!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📍 Stack:', error.stack);
    process.exit(1);
  }
}

testUnifiedTablesAPI();