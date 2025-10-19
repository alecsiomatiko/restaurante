import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/db-retry";

// PATCH /api/mesero/update-order-items/:id
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id;
    const { items } = await request.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Debes enviar al menos un producto" }, { status: 400 });
    }
    // Calcular nuevo total
    let total = 0;
    for (const item of items) {
      total += Number(item.price) * Number(item.quantity);
    }
    await executeQuery(
      `UPDATE orders SET items = ?, total = ?, status = 'open_table' WHERE id = ?`,
      [JSON.stringify(items), total, orderId]
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar productos de la mesa" }, { status: 500 });
  }
}
