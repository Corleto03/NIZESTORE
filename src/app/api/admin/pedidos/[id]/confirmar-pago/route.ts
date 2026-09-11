import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const idPedido = parseInt(params.id, 10);
    if (isNaN(idPedido)) {
      return NextResponse.json({ message: "ID de pedido inválido" }, { status: 400 });
    }

    const pedido = await prisma.pedido.findUnique({
      where: { id_pedido: BigInt(idPedido) },
      include: { factura: true }
    });

    if (!pedido) {
      return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });
    }

    // Update order status to pagado
    await prisma.pedido.update({
      where: { id_pedido: BigInt(idPedido) },
      data: { estado_pedido: "pagado" }
    });

    // Update intento_pago if exists
    if (pedido.id_carrito) {
      await prisma.intento_pago.updateMany({
        where: { id_carrito: pedido.id_carrito, estado: "pendiente" },
        data: { estado: "exitoso" }
      });
    }

    // Generate invoice if not exists
    if (!pedido.factura) {
      const branchId = pedido.id_sucursal_retiro || 1;
      try {
        await prisma.$executeRawUnsafe(
          "CALL sp_generar_factura($1::bigint, $2::varchar, $3::varchar, $4::int)",
          pedido.id_pedido,
          "factura",
          "FAC",
          branchId
        );
      } catch (e) {
        console.warn("Could not generate invoice in manual confirmation:", e);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pago del pedido #${idPedido} confirmado con éxito`
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error al confirmar pago" }, { status: 500 });
  }
}
