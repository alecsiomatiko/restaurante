const mysql = require('mysql2/promise');

async function testMesasAbiertas() {
  console.log('🧪 Probando carga de mesas abiertas...');
  
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
    
    // Obtener órdenes activas
    console.log('\n📊 Consultando órdenes con status open_table...');
    const [orders] = await connection.execute(`
      SELECT 
        id,
        \`table\` as table_name,
        total,
        status,
        created_at,
        items,
        notes,
        unified_table_id
      FROM orders 
      WHERE status = 'open_table'
      ORDER BY \`table\`, created_at DESC
    `);
    
    console.log(`🔍 Se encontraron ${orders.length} órdenes activas:`);
    
    if (orders.length > 0) {
      // Agrupar por mesa
      const mesasMap = new Map();
      
      orders.forEach(order => {
        const tableName = order.table_name;
        if (!mesasMap.has(tableName)) {
          mesasMap.set(tableName, {
            mesa: tableName,
            ordenes: 0,
            total: 0,
            orders: []
          });
        }
        
        const mesa = mesasMap.get(tableName);
        mesa.ordenes += 1;
        mesa.total += parseFloat(order.total) || 0;
        mesa.orders.push(order);
      });
      
      const mesas = Array.from(mesasMap.values());
      
      console.log(`\n📋 Mesas agrupadas (${mesas.length}):`);
      mesas.forEach(mesa => {
        console.log(`  🍽️  Mesa: ${mesa.mesa}`);
        console.log(`     Órdenes: ${mesa.ordenes}`);
        console.log(`     Total: $${mesa.total.toFixed(2)}`);
        console.log(`     IDs de órdenes: ${mesa.orders.map(o => o.id).join(', ')}`);
        console.log('');
      });
      
      // Verificar si hay mesas unificadas
      console.log('🔗 Verificando mesas unificadas...');
      const [unified] = await connection.execute(`
        SELECT id, unified_name, main_table, original_tables 
        FROM unified_tables
      `);
      
      if (unified.length > 0) {
        console.log(`📊 Mesas unificadas encontradas (${unified.length}):`);
        unified.forEach(table => {
          console.log(`  🔗 ${table.unified_name} (${table.original_tables})`);
        });
      } else {
        console.log('ℹ️  No hay mesas unificadas actualmente');
      }
      
    } else {
      console.log('ℹ️  No hay órdenes activas para mostrar');
      
      // Mostrar todas las órdenes para debug
      console.log('\n🔍 Consultando todas las órdenes...');
      const [allOrders] = await connection.execute(`
        SELECT id, \`table\`, status, total, created_at
        FROM orders 
        ORDER BY created_at DESC 
        LIMIT 10
      `);
      
      console.log('📋 Últimas 10 órdenes:');
      allOrders.forEach(order => {
        console.log(`  ID: ${order.id}, Mesa: ${order.table}, Status: ${order.status}, Total: $${order.total}`);
      });
    }
    
    await connection.end();
    console.log('\n✅ Prueba completada!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testMesasAbiertas();