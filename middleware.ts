import { NextRequest, NextResponse } from "next/server"

// Rutas que requieren autenticación
const protectedRoutes = [
  "/profile",
  "/orders",
  "/checkout"
]

// Rutas que requieren permisos de administrador  
const adminRoutes = [
  "/admin"
]

// Rutas que requieren permisos de driver
const driverRoutes = [
  "/driver"
]

// Rutas que requieren permisos de mesero
const waiterRoutes = [
  "/mesero"
]

// Función para verificar si un token tiene el formato correcto
function isValidTokenFormat(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    
    // Decodificar el payload para verificar expiración
    const payload = JSON.parse(atob(parts[1]))
    const currentTime = Math.floor(Date.now() / 1000)
    
    return payload.exp > currentTime
  } catch {
    return false
  }
}

// Función para obtener información del usuario del token (sin verificar firma)
function getUserFromToken(token: string): { id: number, email: string, username: string, is_admin: number, is_driver: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return {
      id: payload.id,
      email: payload.email,
      username: payload.username,
      is_admin: payload.is_admin || 0,
      is_driver: payload.is_driver || 0
    }
  } catch {
    return null
  }
}

export async function middleware(req: NextRequest) {
  // No aplicar middleware a rutas de API o recursos estáticos
  if (
    req.nextUrl.pathname.startsWith("/api/") ||
    req.nextUrl.pathname.startsWith("/_next/") ||
    req.nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  const path = req.nextUrl.pathname
  console.log('🔍 Middleware verificando ruta:', path)

  // Verificar si la ruta requiere autenticación
  const requiresAuth = protectedRoutes.some((route) => path.startsWith(route))
  const requiresAdmin = adminRoutes.some((route) => path.startsWith(route))
  const requiresDriver = driverRoutes.some((route) => path.startsWith(route))
  const requiresWaiter = waiterRoutes.some((route) => path.startsWith(route))

  console.log('🔐 Requiere auth:', requiresAuth, 'Requiere admin:', requiresAdmin, 'Requiere driver:', requiresDriver, 'Requiere waiter:', requiresWaiter)

  // Si no requiere autenticación ni permisos especiales, continuar
  if (!requiresAuth && !requiresAdmin && !requiresDriver && !requiresWaiter) {
    console.log('✅ Ruta pública, continuando')
    return NextResponse.next()
  }

  // PRODUCTION STRATEGY: Verificar token en múltiples fuentes
  const authToken = req.cookies.get('auth-token')?.value
  const authHeader = req.headers.get('Authorization')
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
  const sessionCookie = req.cookies.get('session-token')?.value
  
  const finalToken = authToken || tokenFromHeader || sessionCookie
  
  console.log('🎫 Token sources:', {
    cookie: authToken ? 'YES' : 'NO',
    header: tokenFromHeader ? 'YES' : 'NO', 
    session: sessionCookie ? 'YES' : 'NO',
    final: finalToken ? 'YES' : 'NO'
  })

  if (!finalToken) {
    console.log('❌ Sin token, redirigiendo a login')
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(path)}`, req.url))
  }

  try {
    // Verificar si el token tiene formato válido
    if (!isValidTokenFormat(finalToken)) {
      console.log('❌ Token con formato inválido o expirado')
      const response = NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(path)}`, req.url))
      response.cookies.delete('auth-token')
      response.cookies.delete('session-token')
      response.cookies.delete('refresh-token')
      return response
    }

    // Obtener información del usuario del token
    const user = getUserFromToken(finalToken)
    console.log('👤 Usuario del token:', user ? { id: user.id, email: user.email, is_admin: user.is_admin, is_driver: user.is_driver } : null)

    if (!user) {
      console.log('❌ No se pudo obtener usuario del token')
      const response = NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(path)}`, req.url))
      response.cookies.delete('auth-token')
      response.cookies.delete('session-token')
      response.cookies.delete('refresh-token')
      return response
    }

    // Verificar permisos específicos
    if (requiresAdmin && !user.is_admin) {
      console.log('❌ Acceso denegado: Se requieren permisos de admin')
      return NextResponse.redirect(new URL('/unauthorized?reason=admin', req.url))
    }

    if (requiresDriver && !user.is_driver && !user.is_admin) {
      console.log('❌ Acceso denegado: Se requieren permisos de driver')
      return NextResponse.redirect(new URL('/unauthorized?reason=driver', req.url))
    }

    if (requiresWaiter && !user.is_admin) {
      console.log('❌ Acceso denegado: Se requieren permisos de waiter o admin')
      return NextResponse.redirect(new URL('/unauthorized?reason=waiter', req.url))
    }

    console.log('✅ Acceso autorizado')
    return NextResponse.next()

  } catch (error) {
    console.error('❌ Error en middleware:', error)
    const response = NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(path)}`, req.url))
    response.cookies.delete('auth-token')
    response.cookies.delete('session-token')
    response.cookies.delete('refresh-token')
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}