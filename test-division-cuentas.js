const mysql = require('mysql2/promise');

async function testDivisionCuentas() {
  console.log('🧪 Probando división de cuentas...');
  
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
    
    // Buscar una mesa con productos
    console.log('\n📋 Buscando mesa con productos para probar...');
    const [orders] = await connection.execute(`
      SELECT id, \`table\`, items, total 
      FROM orders 
      WHERE status = 'open_table' AND items IS NOT NULL 
      LIMIT 1
    `);
    
    if (orders.length === 0) {
      console.log('❌ No hay órdenes con productos para probar');
      await connection.end();
      return;
    }
    
    const order = orders[0];
    console.log(`🍽️ Usando mesa: ${order.table}`);
    console.log(`📦 Items: ${order.items}`);
    
    // Parsear items para ver la estructura
    try {
      const items = JSON.parse(order.items);
      console.log('\n📋 Productos en la orden:');
      items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name}`);
        console.log(`     Precio: $${item.price} (tipo: ${typeof item.price})`);
        console.log(`     Cantidad: ${item.quantity || 1}`);
        console.log(`     ID: ${item.id}`);
        console.log('');
      });
      
      // Simular asignación de producto a cliente
      if (items.length > 0) {
        const primerProducto = items[0];
        console.log(`\n🎯 Simulando asignación de "${primerProducto.name}" a cliente "Juan"...`);
        
        // Insertar asignación de prueba
        await connection.execute(`
          INSERT INTO product_assignments 
          (order_id, producto_id, cantidad, cliente_nombre, precio_unitario, created_at)
          VALUES (?, ?, ?, ?, ?, NOW())
        `, [order.id, primerProducto.id, 1, 'Juan', parseFloat(primerProducto.price) || 0]);
        
        console.log('✅ Asignación creada exitosamente');
        
        // Verificar la asignación
        const [assignments] = await connection.execute(`
          SELECT * FROM product_assignments WHERE order_id = ?
        `, [order.id]);
        
        console.log('\n📊 Asignaciones actuales:');
        assignments.forEach(assignment => {
          console.log(`  - Cliente: ${assignment.cliente_nombre}`);
          console.log(`    Producto ID: ${assignment.producto_id}`);
          console.log(`    Cantidad: ${assignment.cantidad}`);
          console.log(`    Precio unitario: $${assignment.precio_unitario} (tipo: ${typeof assignment.precio_unitario})`);
          console.log('');
        });
        
        // Limpiar datos de prueba
        await connection.execute(`
          DELETE FROM product_assignments WHERE order_id = ? AND cliente_nombre = 'Juan'
        `, [order.id]);
        
        console.log('🧹 Datos de prueba limpiados');
      }
      
    } catch (parseError) {
      console.error('❌ Error al parsear items:', parseError.message);
    }
    
    await connection.end();
    console.log('\n✅ Prueba de división de cuentas completada!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testDivisionCuentas();