const mysql = require('mysql2/promise');

async function debugOpenTablesAPI() {
  console.log('🧪 Debuggeando API open-tables...');
  
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
    
    // Primero verificar si hay usuarios meseros
    console.log('\n👤 Verificando usuarios meseros...');
    const [waiters] = await connection.execute(`
      SELECT id, email, username, is_waiter FROM users WHERE is_waiter = 1
    `);
    
    console.log(`📋 Meseros encontrados (${waiters.length}):`);
    waiters.forEach(waiter => {
      console.log(`  - ID: ${waiter.id}, Email: ${waiter.email}, Username: ${waiter.username}`);
    });
    
    if (waiters.length === 0) {
      console.log('❌ No hay usuarios meseros configurados');
      await connection.end();
      return;
    }
    
    const waiterId = waiters[0].id; // Usar el primer mesero para la prueba
    
    // Verificar órdenes del mesero
    console.log(`\n📊 Consultando órdenes del mesero ID ${waiterId}...`);
    const [orders] = await connection.execute(`
      SELECT id, \`table\`, status, created_at, items, total, notes, waiter_order, user_id
      FROM orders 
      WHERE waiter_order = 1 AND status = 'open_table' AND user_id = ?
      ORDER BY created_at DESC
    `, [waiterId]);
    
    console.log(`🔍 Órdenes encontradas para mesero ${waiterId}: ${orders.length}`);
    
    if (orders.length > 0) {
      // Simular el agrupamiento que hace la API
      const groupedTables = orders.reduce((groups, order) => {
        const tableName = order.table;
        
        if (!groups[tableName]) {
          groups[tableName] = {
            tableName,
            orders: [],
            totalMesa: 0,
            allItems: [],
            firstOrderDate: order.created_at,
            lastOrderDate: order.created_at,
            orderCount: 0
          };
        }
        
        groups[tableName].orders.push(order);
        groups[tableName].totalMesa += parseFloat(order.total) || 0;
        groups[tableName].orderCount += 1;
        
        return groups;
      }, {});
      
      const tables = Object.values(groupedTables);
      
      console.log(`\n📋 Mesas agrupadas (${tables.length}):`);
      tables.forEach(table => {
        console.log(`  🍽️  Mesa: ${table.tableName}`);
        console.log(`     Órdenes: ${table.orderCount}`);
        console.log(`     Total: $${table.totalMesa.toFixed(2)}`);
        console.log('');
      });
      
      // Simular respuesta de la API
      const apiResponse = {
        success: true,
        tables: tables
      };
      
      console.log('📡 Respuesta simulada de la API:');
      console.log(JSON.stringify(apiResponse, null, 2));
      
    } else {
      console.log('ℹ️  No hay órdenes de mesero para este usuario');
      
      // Verificar órdenes generales
      console.log('\n🔍 Verificando todas las órdenes open_table...');
      const [allOrders] = await connection.execute(`
        SELECT id, \`table\`, status, waiter_order, user_id, total
        FROM orders 
        WHERE status = 'open_table'
        ORDER BY created_at DESC
      `);
      
      console.log(`📊 Total órdenes open_table: ${allOrders.length}`);
      allOrders.forEach(order => {
        console.log(`  - ID: ${order.id}, Mesa: ${order.table}, Mesero: ${order.waiter_order ? 'Sí' : 'No'}, User: ${order.user_id}`);
      });
    }
    
    await connection.end();
    console.log('\n✅ Debug completado!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugOpenTablesAPI();