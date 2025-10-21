const mysql = require('mysql2/promise');

async function testCuentasSeparadas() {
  console.log('🧪 Probando generación de cuentas separadas...');
  
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
    const [orders] = await connection.execute(`
      SELECT id, \`table\`, items, total 
      FROM orders 
      WHERE status = 'open_table' AND items IS NOT NULL 
      LIMIT 1
    `);
    
    if (orders.length === 0) {
      console.log('❌ No hay órdenes para probar');
      await connection.end();
      return;
    }
    
    const order = orders[0];
    const items = JSON.parse(order.items);
    
    console.log(`🍽️ Mesa de prueba: ${order.table}`);
    console.log(`📦 Productos disponibles: ${items.length}`);
    
    // Limpiar asignaciones previas de prueba
    await connection.execute(`
      DELETE FROM product_assignments WHERE order_id = ? AND cliente_nombre IN ('Cliente Test 1', 'Cliente Test 2')
    `, [order.id]);
    
    // Crear asignaciones de prueba
    if (items.length >= 2) {
      const producto1 = items[0];
      const producto2 = items[1];
      
      console.log('\n🎯 Creando asignaciones de prueba...');
      
      // Asignar primer producto a Cliente Test 1
      await connection.execute(`
        INSERT INTO product_assignments 
        (order_id, producto_id, cantidad, cliente_nombre, precio_unitario, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [order.id, producto1.id, 1, 'Cliente Test 1', parseFloat(producto1.price) || 0]);
      
      // Asignar segundo producto a Cliente Test 2
      await connection.execute(`
        INSERT INTO product_assignments 
        (order_id, producto_id, cantidad, cliente_nombre, precio_unitario, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `, [order.id, producto2.id, 1, 'Cliente Test 2', parseFloat(producto2.price) || 0]);
      
      console.log(`✅ Asignado "${producto1.name}" a Cliente Test 1`);
      console.log(`✅ Asignado "${producto2.name}" a Cliente Test 2`);
      
      // Simular consulta de división de cuentas
      console.log('\n📊 Simulando consulta de división de cuentas...');
      
      const [asignaciones] = await connection.execute(`
        SELECT 
          pa.id as assignment_id,
          pa.cliente_nombre,
          pa.producto_id,
          pa.cantidad,
          pa.precio_unitario,
          pa.order_id,
          pa.created_at,
          o.items,
          o.table as mesa
        FROM product_assignments pa
        JOIN orders o ON pa.order_id = o.id
        WHERE o.table = ? AND o.status = 'open_table'
        ORDER BY pa.cliente_nombre, pa.created_at
      `, [order.table]);
      
      console.log(`📋 Asignaciones encontradas: ${asignaciones.length}`);
      
      // Procesar clientes y sus productos (simular API)
      const clientesMap = new Map();
      
      asignaciones.forEach(asignacion => {
        const clienteNombre = asignacion.cliente_nombre;
        if (!clientesMap.has(clienteNombre)) {
          clientesMap.set(clienteNombre, {
            id: clienteNombre.toLowerCase().replace(/\s+/g, '_'),
            nombre: clienteNombre,
            productos: [],
            total: 0,
            mesa: asignacion.mesa,
            created_at: asignacion.created_at
          });
        }

        const cliente = clientesMap.get(clienteNombre);
        const items = JSON.parse(asignacion.items || '[]');
        const producto = items.find(item => item.id === asignacion.producto_id);
        
        if (producto) {
          const precioUnitario = parseFloat(asignacion.precio_unitario) || 0;
          const cantidad = parseInt(asignacion.cantidad) || 1;
          const subtotal = cantidad * precioUnitario;
          
          console.log(`💰 Cliente: ${clienteNombre}`);
          console.log(`   Producto: ${producto.name}`);
          console.log(`   Precio unitario: $${precioUnitario} (tipo: ${typeof asignacion.precio_unitario})`);
          console.log(`   Cantidad: ${cantidad}`);
          console.log(`   Subtotal: $${subtotal.toFixed(2)}`);
          console.log('');
          
          const productoObj = {
            id: asignacion.producto_id,
            nombre: producto.name,
            precio_unitario: precioUnitario,
            cantidad: cantidad,
            subtotal: subtotal,
            order_id: asignacion.order_id
          };

          cliente.productos.push(productoObj);
          cliente.total += subtotal;
        }
      });

      const cuentasSeparadas = Array.from(clientesMap.values());
      
      console.log('🧾 Cuentas separadas generadas:');
      cuentasSeparadas.forEach(cuenta => {
        console.log(`  📄 ${cuenta.nombre}: $${cuenta.total.toFixed(2)}`);
        cuenta.productos.forEach(prod => {
          console.log(`    - ${prod.nombre}: ${prod.cantidad} × $${prod.precio_unitario.toFixed(2)} = $${prod.subtotal.toFixed(2)}`);
        });
        console.log('');
      });
      
      const totalGeneral = cuentasSeparadas.reduce((sum, c) => sum + c.total, 0);
      console.log(`💵 Total general: $${totalGeneral.toFixed(2)}`);
      
    } else {
      console.log('⚠️ No hay suficientes productos para crear asignaciones de prueba');
    }
    
    // Limpiar datos de prueba
    await connection.execute(`
      DELETE FROM product_assignments WHERE order_id = ? AND cliente_nombre IN ('Cliente Test 1', 'Cliente Test 2')
    `, [order.id]);
    
    console.log('🧹 Datos de prueba limpiados');
    
    await connection.end();
    console.log('\n✅ Prueba de cuentas separadas completada!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('📍 Stack:', error.stack);
    process.exit(1);
  }
}

testCuentasSeparadas();