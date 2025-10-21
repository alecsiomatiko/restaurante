'use client'

import { useEffect } from 'react'

export default function AuthInterceptor() {
  useEffect(() => {
    // Interceptar todas las fetch requests para añadir token
    const originalFetch = window.fetch
    
    window.fetch = async (...args) => {
      const [url, options = {}] = args
      
      // Solo interceptar requests a nuestra API
      if (typeof url === 'string' && url.startsWith('/api/')) {
        const token = localStorage.getItem('auth-token')
        
        if (token) {
          const headers = new Headers(options.headers)
          headers.set('Authorization', `Bearer ${token}`)
          
          options.headers = headers
          console.log('🔧 Token añadido a request:', url)
        }
      }
      
      return originalFetch(url, options)
    }
    
    // Cleanup
    return () => {
      window.fetch = originalFetch
    }
  }, [])
  
  return null // Este componente no renderiza nada
}