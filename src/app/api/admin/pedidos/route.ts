import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const estado = searchParams.get("estado");

    const pedidos = await prisma.pedido.findMany({
      where: {
        ...(estado && estado !== "todos" ? { estado_pedido: estado } : {})
      },
      orderBy: { fecha_pedido: "desc" },
      include: {
        cliente: {
          include: {
            cliente_natural: true,
            cliente_juridico: true
          }
        },
        metodo_pago: true,
        metodo_envio: true,
        direccion_pedido_id_direccion_envioTodireccion: true,
        sucursal: true,
        factura: true,
        carrito: {
          include: {
            intento_pago: {
              take: 1,
              orderBy: { fecha_intento: "desc" }
            }
          }
        },
        detalle_pedido: {
          include: {
            producto_variante: {
              include: {
                producto: true,
                variante_apariencia: true
              }
            }
          }
        }
      }
    });

    // Custom serialization for BigInt and Decimals
    const serialized = JSON.parse(
      JSON.stringify(pedidos, (key, value) => {
        if (typeof value === "bigint") return Number(value);
        return value;
      })
    );

    return NextResponse.json(serialized);
  } catch (error) {
    console.error("Error fetching admin pedidos:", error);
    return NextResponse.json({ message: "Error al obtener pedidos" }, { status: 500 });
  }
}
