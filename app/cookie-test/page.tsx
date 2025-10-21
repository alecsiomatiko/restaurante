'use client'

import { useEffect, useState } from 'react'

export default function CookieTestPage() {
  const [cookies, setCookies] = useState('')
  const [apiResponse, setApiResponse] = useState('')

  useEffect(() => {
    setCookies(document.cookie)
  }, [])

  const testLogin = async () => {
    try {
      const response = await fetch('/api/auth/login-mysql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: 'admin@supernova.com',
          password: 'admin123'
        }),
      })

      const data = await response.json()
      setApiResponse(JSON.stringify(data, null, 2))
      
      // Actualizar cookies después del login
      setTimeout(() => {
        setCookies(document.cookie)
      }, 1000)
      
    } catch (error) {
      setApiResponse(`Error: ${error}`)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Test de Cookies</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Cookies actuales:</h2>
          <textarea 
            className="w-full h-32 p-4 border rounded font-mono text-sm"
            value={cookies || 'Sin cookies'}
            readOnly
          />
        </div>

        <button 
          onClick={testLogin}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
        >
          Probar Login
        </button>

        <div>
          <h2 className="text-xl font-semibold mb-2">Respuesta API:</h2>
          <textarea 
            className="w-full h-64 p-4 border rounded font-mono text-sm"
            value={apiResponse}
            readOnly
          />
        </div>

        <button 
          onClick={() => setCookies(document.cookie)}
          className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
        >
          Actualizar Cookies
        </button>
      </div>
    </div>
  )
}