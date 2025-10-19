import Link from "next/link"
import Image from "next/image"
import { Instagram, Facebook } from "lucide-react"

// Ensure footer only references Sonora Express
export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 text-white py-8 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/10 to-transparent"></div>
      <div className="absolute inset-0">
        <div className="absolute top-4 left-10 w-1 h-1 bg-white rounded-full animate-pulse"></div>
        <div className="absolute top-8 right-20 w-1 h-1 bg-purple-300 rounded-full animate-pulse delay-300"></div>
        <div className="absolute bottom-6 left-1/4 w-1 h-1 bg-pink-300 rounded-full animate-pulse delay-700"></div>
        <div className="absolute bottom-10 right-1/3 w-1 h-1 bg-blue-300 rounded-full animate-pulse delay-1000"></div>
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Supernova Burgers & Wings</h3>
            <p className="mb-2">Hamburguesas y alitas con sabores que están fuera de este mundo.</p>
            <div className="mt-4">
              <Image
                src="/supernova-logo.png"
                alt="Supernova Burgers & Wings Logo"
                width={150}
                height={100}
                className="rounded-md bg-white p-2"
              />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="hover:text-purple-300 transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <Link href="/menu" className="hover:text-purple-300 transition-colors">
                  Menú
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-purple-300 transition-colors">
                  Mis Pedidos
                </Link>
              </li>
              <li>
                <Link href="/profile" className="hover:text-purple-300 transition-colors">
                  Mi Perfil
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Información Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/tos" className="hover:text-purple-300 transition-colors">
                  Términos de Servicio
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-purple-300 transition-colors">
                  Política de Privacidad
                </Link>
              </li>
            </ul>
            <div className="mt-4">
              <p className="text-sm">
                © {new Date().getFullYear()} Supernova Burgers & Wings. Todos los derechos reservados.
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <h3 className="text-lg font-semibold">Síguenos</h3>
              <div className="flex flex-col space-y-2">
                <Link
                  href="https://www.instagram.com/supernovaburgers/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center hover:text-purple-300 transition-colors"
                >
                  <Instagram className="mr-2" size={20} />
                  <span>Instagram</span>
                </Link>
                <Link
                  href="https://www.facebook.com/supernovaburgers/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center hover:text-purple-300 transition-colors"
                >
                  <Facebook className="mr-2" size={20} />
                  <span>Facebook</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
