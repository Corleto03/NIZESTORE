import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const idPedido = parseInt(params.id, 10);
    if (isNaN(idPedido)) {
      return NextResponse.json({ message: "ID de pedido inválido" }, { status: 400 });
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id_pedido: BigInt(idPedido) }
    });

    if (!pedido) {
      return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });
    }

    // Verify current status is strictly 'enviado'
    if (pedido.estado_pedido !== "enviado") {
      return NextResponse.json({
        message: `No se puede confirmar entrega. El pedido se encuentra en estado '${pedido.estado_pedido}', solo pedidos en 'enviado' pueden confirmarse.`
      }, { status: 400 });
    }

    // Update status to 'entregado'
    const updated = await prisma.pedido.update({
      where: { id_pedido: BigInt(idPedido) },
      data: { estado_pedido: "entregado" }
    });

    return NextResponse.json({
      success: true,
      id_pedido: Number(updated.id_pedido),
      estado_pedido: updated.estado_pedido
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error al actualizar estado del pedido" }, { status: 500 });
  }
}
