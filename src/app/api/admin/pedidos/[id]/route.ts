import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ESTADOS_VALIDOS = [
  "pendiente",
  "confirmado",
  "pagado",
  "preparando",
  "enviado",
  "entregado",
  "cancelado"
];

const TRANSICIONES_PERMITIDAS: Record<string, string[]> = {
  pendiente: ["confirmado", "pagado", "cancelado"],
  confirmado: ["pagado", "preparando", "cancelado"],
  pagado: ["preparando", "cancelado"],
  preparando: ["enviado", "cancelado"],
  enviado: ["entregado", "cancelado"],
  entregado: [],
  cancelado: []
};

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

    const { estado_pedido } = await req.json();

    const pedido = await prisma.pedido.findUnique({
      where: { id_pedido: BigInt(idPedido) },
      include: { factura: true }
    });

    if (!pedido) {
      return NextResponse.json({ message: "Pedido no encontrado" }, { status: 404 });
    }

    const currentState = pedido.estado_pedido;

    // Validate allowed transitions
    const allowed = TRANSICIONES_PERMITIDAS[currentState] || [];
    if (!allowed.includes(estado_pedido)) {
      return NextResponse.json(
        {
          message: `Transición no válida. El pedido #${idPedido} está en estado '${currentState}'. Siguiente paso permitido: ${
            allowed.length > 0 ? allowed.join(", ") : "Ninguno (Estado final)"
          }`
        },
        { status: 400 }
      );
    }

    // Update order status
    const updated = await prisma.pedido.update({
      where: { id_pedido: BigInt(idPedido) },
      data: { estado_pedido }
    });

    // If marked as pagado, update payment attempts & generate invoice if missing
    if (estado_pedido === "pagado") {
      if (pedido.id_carrito) {
        await prisma.intento_pago.updateMany({
          where: { id_carrito: pedido.id_carrito, estado: "pendiente" },
          data: { estado: "exitoso" }
        });
      }

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
          console.warn("Could not generate invoice in status update:", e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pedido #${idPedido} actualizado a estado: ${estado_pedido}`
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json({ message: "Error al actualizar pedido" }, { status: 500 });
  }
}
