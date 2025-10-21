const fetch = require('node-fetch');

async function testLoginAPI() {
  try {
    console.log('🔍 Probando API de login...');
    
    const response = await fetch('http://127.0.0.1:3000/api/auth/login-mysql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@supernova.com',
        password: 'admin123'
      })
    });

    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers));
    
    const data = await response.text();
    console.log('📄 Response:', data);

    if (response.ok) {
      console.log('✅ API funcionando correctamente');
    } else {
      console.log('❌ Error en API');
    }
    
  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

testLoginAPI();