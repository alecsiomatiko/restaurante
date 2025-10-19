import Link from "next/link"

export default function DevPage() {
  return (
    <div className="min-h-screen bg-amber-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-900">Herramientas de Desarrollo</h1>
          <p className="mt-2 text-amber-800">Accede a las herramientas para desarrolladores</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/dev/users" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-bold text-amber-900 mb-2">Gestión de Usuarios</h2>
            <p className="text-amber-800">
              Crea y gestiona usuarios con diferentes roles (admin, repartidor, usuario normal)
            </p>
          </Link>

          <Link href="/auth-debug" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-bold text-amber-900 mb-2">Diagnóstico de Autenticación</h2>
            <p className="text-amber-800">Verifica el estado de la sesión y soluciona problemas de autenticación</p>
          </Link>

          <Link href="/admin-setup" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-bold text-amber-900 mb-2">Configuración de Administrador</h2>
            <p className="text-amber-800">Configura un usuario administrador rápidamente</p>
          </Link>

          <Link href="/driver-setup" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <h2 className="text-xl font-bold text-amber-900 mb-2">Configuración de Repartidor</h2>
            <p className="text-amber-800">Configura un usuario repartidor rápidamente</p>
          </Link>
        </div>

        <div className="mt-8 p-4 bg-amber-100 rounded-lg">
          <h3 className="text-lg font-semibold text-amber-900 mb-2">Instrucciones rápidas</h3>
          <ul className="list-disc list-inside text-amber-800 space-y-2">
            <li>
              Para crear un <strong>administrador</strong>: Ve a "Gestión de Usuarios" y marca la casilla "Es
              Administrador"
            </li>
            <li>
              Para crear un <strong>repartidor</strong>: Ve a "Gestión de Usuarios" y marca la casilla "Es Repartidor"
            </li>
            <li>
              Para crear un usuario con <strong>ambos roles</strong>: Marca ambas casillas al crear el usuario
            </li>
            <li>
              Para <strong>cambiar roles</strong> de usuarios existentes: Usa los botones "Hacer Admin" o "Hacer
              Repartidor" en la lista de usuarios
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
