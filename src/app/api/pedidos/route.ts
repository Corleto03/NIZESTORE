import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "No autenticado" }, { status: 401 });
    }

    const clienteId = parseInt(session.user.id, 10);
    const pedidos = await prisma.pedido.findMany({
      where: { id_cliente: clienteId },
      orderBy: { fecha_pedido: "desc" },
      include: {
        detalle_pedido: {
          include: {
            producto_variante: {
              include: {
                producto: true,
                variante_apariencia: true
              }
            }
          }
        },
        metodo_pago: true,
        metodo_envio: true,
        sucursal: true,
        direccion_pedido_id_direccion_envioTodireccion: true,
        factura: true
      }
    });

    const serialized = JSON.parse(
      JSON.stringify(pedidos, (key, value) =>
        typeof value === "bigint" ? Number(value) : value
      )
    );

    return NextResponse.json(serialized);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error al obtener pedidos" }, { status: 500 });
  }
}
