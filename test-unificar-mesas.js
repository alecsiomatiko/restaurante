const mysql = require('mysql2/promise');

async function testUnificarMesas() {
  console.log('🧪 Probando unificación de mesas...');
  
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
    
    // Obtener mesas disponibles
    console.log('\n📊 Obteniendo mesas con órdenes activas...');
    const [orders] = await connection.execute(`
      SELECT DISTINCT \`table\` as mesa 
      FROM orders 
      WHERE status = 'open_table'
      ORDER BY \`table\`
    `);
    
    console.log(`🍽️ Mesas disponibles (${orders.length}):`);
    orders.forEach((order, index) => {
      console.log(`  ${index + 1}. ${order.mesa}`);
    });
    
    if (orders.length >= 2) {
      const mesa1 = orders[0].mesa;
      const mesa2 = orders[1].mesa;
      const nombreUnificado = `Unión ${mesa1}-${mesa2}`;
      
      console.log(`\n🔗 Probando unificación de "${mesa1}" y "${mesa2}"...`);
      
      // Limpiar unificaciones previas de prueba
      await connection.execute(`
        DELETE FROM unified_tables WHERE unified_name LIKE 'Unión%'
      `);
      
      // Probar creación de mesa unificada
      console.log('📝 Creando mesa unificada...');
      
      const [result] = await connection.execute(`
        INSERT INTO unified_tables (unified_name, main_table, original_tables, created_at)
        VALUES (?, ?, ?, NOW())
      `, [nombreUnificado, mesa1, JSON.stringify([mesa1, mesa2])]);
      
      const unifiedTableId = result.insertId;
      console.log(`✅ Mesa unificada creada con ID: ${unifiedTableId}`);
      
      // Actualizar órdenes para referenciar la mesa unificada
      console.log('🔄 Actualizando órdenes...');
      
      const [updateResult] = await connection.execute(`
        UPDATE orders 
        SET unified_table_id = ? 
        WHERE \`table\` IN (?, ?) 
        AND status = 'open_table'
      `, [unifiedTableId, mesa1, mesa2]);
      
      console.log(`✅ ${updateResult.affectedRows} órdenes actualizadas`);
      
      // Verificar la unificación
      console.log('\n🔍 Verificando mesa unificada...');
      
      const [unifiedTables] = await connection.execute(`
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
        WHERE ut.id = ?
        GROUP BY ut.id, ut.unified_name, ut.main_table, ut.original_tables, ut.created_at
      `, [unifiedTableId]);
      
      if (unifiedTables.length > 0) {
        const table = unifiedTables[0];
        console.log('📊 Mesa unificada verificada:');
        console.log(`  - Nombre: ${table.unified_name}`);
        console.log(`  - Mesa principal: ${table.main_table}`);
        console.log(`  - Mesas originales: ${table.original_tables}`);
        console.log(`  - Total órdenes: ${table.total_orders || 0}`);
        console.log(`  - Monto total: $${(parseFloat(table.total_amount) || 0).toFixed(2)}`);
      }
      
      // Probar separación
      console.log('\n✂️ Probando separación de mesa unificada...');
      
      // Eliminar referencia de unificación en las órdenes
      await connection.execute(`
        UPDATE orders SET unified_table_id = NULL 
        WHERE unified_table_id = ?
      `, [unifiedTableId]);
      
      // Eliminar la mesa unificada
      await connection.execute(`
        DELETE FROM unified_tables WHERE id = ?
      `, [unifiedTableId]);
      
      console.log('✅ Mesa unificada separada exitosamente');
      
      // Verificar que las órdenes volvieron a su estado original
      const [ordersAfter] = await connection.execute(`
        SELECT \`table\`, unified_table_id 
        FROM orders 
        WHERE \`table\` IN (?, ?) AND status = 'open_table'
      `, [mesa1, mesa2]);
      
      console.log('\n🔍 Estado de órdenes después de separar:');
      ordersAfter.forEach(order => {
        console.log(`  - Mesa: ${order.table}, Unificada: ${order.unified_table_id || 'No'}`);
      });
      
    } else {
      console.log('⚠️ Se necesitan al menos 2 mesas para probar la unificación');
    }
    
    await connection.end();
    console.log('\n✅ Prueba de unificación de mesas completada!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📍 Query que falló:', error.sql || 'N/A');
    process.exit(1);
  }
}

testUnificarMesas();