const fetch = require('node-fetch');

async function testUnificationAPI() {
  console.log('🧪 Probando API de unificación de mesas...');
  
  try {
    // Simular cookie de autenticación (necesitarías obtener una real del navegador)
    console.log('📡 Probando endpoint /api/mesero/mesas-abiertas...');
    
    const response = await fetch('http://localhost:3000/api/mesero/mesas-abiertas', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Nota: En producción necesitarías una cookie de autenticación válida
      }
    });
    
    const data = await response.json();
    console.log('📊 Status:', response.status);
    console.log('📋 Respuesta:', JSON.stringify(data, null, 2));
    
    if (data.success && data.orders) {
      console.log(`✅ Se encontraron ${data.orders.length} órdenes`);
      console.log('🍽️ Mesas detectadas:');
      
      // Agrupar por mesa como lo hace el componente
      const mesasMap = new Map();
      
      data.orders.forEach(order => {
        const mesaId = order.table;
        if (!mesasMap.has(mesaId)) {
          mesasMap.set(mesaId, {
            id: mesaId,
            numero: mesaId,
            estado: 'ocupada',
            ordenes: 0,
            total: 0
          });
        }
        
        const mesa = mesasMap.get(mesaId);
        mesa.ordenes += 1;
        mesa.total += parseFloat(order.total) || 0;
      });
      
      const mesas = Array.from(mesasMap.values());
      mesas.forEach(mesa => {
        console.log(`  - Mesa ${mesa.numero}: ${mesa.ordenes} órdenes, $${mesa.total.toFixed(2)}`);
      });
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ El servidor no está ejecutándose en localhost:3000');
      console.log('💡 Inicia el servidor con: npm run dev');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testUnificationAPI();