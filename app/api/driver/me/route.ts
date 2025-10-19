import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-simple'
import { executeQuery } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)

    if (!user || !user.is_driver) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Obtener info del driver desde delivery_drivers
    let drivers = await executeQuery(
      'SELECT * FROM delivery_drivers WHERE user_id = ?',
      [user.id]
    ) as any[]

    // Si no existe registro en delivery_drivers, crear uno automáticamente
    if (!drivers || drivers.length === 0) {
      console.log(`🔧 Creando registro automático para driver ${user.id}`);
      
      // Crear registro básico en delivery_drivers
      await executeQuery(
        `INSERT INTO delivery_drivers (user_id, name, phone, email, vehicle_type, is_active, is_available, rating, total_deliveries) 
         VALUES (?, ?, ?, ?, 'motocicleta', 1, 1, 5.0, 0)`,
        [user.id, user.username || 'Driver', '0000000000', user.email]
      );
      
      // Obtener el registro recién creado
      drivers = await executeQuery(
        'SELECT * FROM delivery_drivers WHERE user_id = ?',
        [user.id]
      ) as any[];
    }

    return NextResponse.json({
      driver: drivers[0],
      user: {
        id: user.id,
        email: user.email,
        name: user.username,
        username: user.username
      }
    })
  } catch (error) {
    console.error('Error getting driver info:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
