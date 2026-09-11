import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const pedidos = await prisma.pedido.findMany({
      where: {
        metodo_pago: { tipo_metodo: "transferencia" },
        estado_pedido: "pendiente"
      },
      include: {
        cliente: {
          include: {
            cliente_natural: true,
            cliente_juridico: true
          }
        },
        carrito: { include: { intento_pago: true } },
        metodo_pago: true
      },
      orderBy: { fecha_pedido: "desc" }
    });

    const serialized = JSON.parse(
      JSON.stringify(pedidos, (key, value) =>
        typeof value === "bigint" ? Number(value) : value
      )
    );

    return NextResponse.json(serialized);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error cargando transferencias pendientes" }, { status: 500 });
  }
}
