import { NextRequest, NextResponse } from "next/server";
import { getSessionByToken, verifyAccessToken, createSession } from "@/lib/auth-mysql";
import { executeQuery } from "@/lib/mysql-db";

// POST - Refresca la sesión y el token del usuario con los roles actuales
export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get("auth-token")?.value;
    if (!authToken) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    // Obtiene el usuario actual desde la base de datos (con roles actualizados)
    const sessionUser = await getSessionByToken(authToken);
    if (!sessionUser) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }
    // Refresca los datos del usuario desde la tabla users
    const users = await executeQuery(
      'SELECT id, email, username, is_admin, is_driver, is_waiter FROM users WHERE id = ?',
      [sessionUser.id]
    ) as any[];
    if (users.length === 0) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    const user = {
      id: users[0].id,
      email: users[0].email,
      username: users[0].username,
      is_admin: Boolean(users[0].is_admin),
      is_driver: Boolean(users[0].is_driver),
      is_waiter: Boolean(users[0].is_waiter)
    };
    // Crea una nueva sesión y tokens con los roles actuales
    const session = await createSession(user);
    // Setea la cookie de auth-token
    const response = NextResponse.json({ success: true, user });
    response.cookies.set("auth-token", session.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7 // 7 días
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Error al refrescar sesión" }, { status: 500 });
  }
}
