const fetch = require('node-fetch');

const baseUrl = 'http://localhost:3000';

async function testTableSystem() {
  console.log('🧪 Probando el sistema de mesas...\n');

  try {
    // 1. Obtener mesas abiertas
    console.log('📋 1. Obteniendo mesas abiertas...');
    const response = await fetch(`${baseUrl}/api/mesero/open-tables`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Simular cookie de autenticación - en producción esto vendría de las cookies
        'Cookie': 'auth-token=your-auth-token-here'
      }
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Se encontraron ${data.tables.length} mesas:`);
      
      data.tables.forEach(table => {
        console.log(`\n📍 Mesa: ${table.tableName}`);
        console.log(`   💰 Total: $${table.totalMesa.toFixed(2)}`);
        console.log(`   📦 Órdenes: ${table.orderCount}`);
        console.log(`   📊 Productos: ${table.allItems.length}`);
        
        // Mostrar badges especiales
        if (table.isUnified) {
          console.log(`   🔗 MESA UNIFICADA (mesas originales: ${table.originalTables?.join(', ')})`);
        }
        if (table.isDividedAccount) {
          console.log(`   👤 CUENTA SEPARADA - Cliente: ${table.customerName} (mesa original: ${table.originalTable})`);
        }
        if (!table.isUnified && !table.isDividedAccount) {
          console.log(`   🏷️  MESA NORMAL`);
        }
      });
    } else {
      console.log('❌ Error:', data.error);
    }

    // 2. Verificar mesas unificadas
    console.log('\n\n🔗 2. Verificando mesas unificadas...');
    const unifiedResponse = await fetch(`${baseUrl}/api/mesero/unificar-mesas`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth-token=your-auth-token-here'
      }
    });

    const unifiedData = await unifiedResponse.json();
    
    if (unifiedData.success) {
      console.log(`✅ Se encontraron ${unifiedData.mesasUnificadas.length} mesas unificadas:`);
      
      unifiedData.mesasUnificadas.forEach(mesa => {
        console.log(`\n🔗 Mesa Unificada: ${mesa.nombre}`);
        console.log(`   💰 Total: $${parseFloat(mesa.montoTotal).toFixed(2)}`);
        console.log(`   📍 Mesas originales: ${mesa.mesasOriginales?.join(', ')}`);
        console.log(`   📊 Órdenes: ${mesa.ordenes}`);
      });
    } else {
      console.log('❌ Error en mesas unificadas:', unifiedData.error);
    }

    // 3. Verificar cuentas separadas
    console.log('\n\n👥 3. Verificando cuentas separadas...');
    const divisionResponse = await fetch(`${baseUrl}/api/mesero/division-cuentas?mesa=mesa7`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth-token=your-auth-token-here'
      }
    });

    const divisionData = await divisionResponse.json();
    
    if (divisionData.success) {
      console.log(`✅ Mesa mesa7 tiene ${divisionData.productosAsignados.length} productos asignados:`);
      
      const clientesUnicos = [...new Set(divisionData.productosAsignados.map(p => p.customerName))];
      console.log(`👥 Clientes: ${clientesUnicos.join(', ')}`);
      
      clientesUnicos.forEach(cliente => {
        const productosCliente = divisionData.productosAsignados.filter(p => p.customerName === cliente);
        const totalCliente = productosCliente.reduce((sum, p) => sum + parseFloat(p.totalPrice), 0);
        console.log(`   ${cliente}: $${totalCliente.toFixed(2)} (${productosCliente.length} productos)`);
      });
    } else {
      console.log('❌ Error en división de cuentas:', divisionData.error);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
  }
}

// Función para mostrar el resumen visual
function mostrarResumenVisual() {
  console.log('\n🎨 RESUMEN VISUAL DEL SISTEMA:\n');
  
  console.log('┌─ PANEL DE MESAS ─────────────────────────────────────┐');
  console.log('│                                                      │');
  console.log('│  🏷️  Mesa 4        🔗 mesa 7         👤 mesa7 - paco  │');
  console.log('│     $50.00            $150.00           $25.00        │');
  console.log('│     [Normal]          [Unificada]       [Separada]    │');
  console.log('│                                                      │');
  console.log('│  👤 mesa7 - pedro   🏷️  Mesa 9       🏷️  Mesa 12     │');
  console.log('│     $60.00            $155.00           $75.00        │');
  console.log('│     [Separada]        [Normal]          [Normal]      │');
  console.log('│                                                      │');
  console.log('└──────────────────────────────────────────────────────┘');
  
  console.log('\n📊 TIPOS DE MESA:');
  console.log('🏷️  Mesa Normal: Mesa original sin modificaciones');
  console.log('🔗 Mesa Unificada: Combina múltiples mesas en una sola cuenta');
  console.log('👤 Cuenta Separada: Divide una mesa por cliente específico');
  
  console.log('\n🔄 FLUJO DE TRABAJO:');
  console.log('1. Mesa Normal → División de Cuentas → Cuentas Separadas por Cliente');
  console.log('2. Mesas Normales → Unificación → Mesa Unificada (mesas originales desaparecen)');
  console.log('3. Mesa Unificada → Separación → Vuelven las Mesas Normales');
}

// Ejecutar pruebas
console.log('🚀 Iniciando pruebas del sistema de manejo de mesas...\n');
testTableSystem().then(() => {
  mostrarResumenVisual();
  console.log('\n✅ Pruebas completadas!');
});