import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    // 1. Backdate active carts to > 2 hours ago
    await prisma.$executeRawUnsafe(
      "UPDATE carrito SET fecha_ultima_actualizacion = now() - INTERVAL '3 hours' WHERE estado_carrito = 'activo'"
    );

    // 2. Call sp_marcar_carritos_abandonados
    await prisma.$executeRawUnsafe("CALL sp_marcar_carritos_abandonados(2)");

    // 3. Find newly abandoned carts that have 'desconocido'
    const abandonedRecords = await prisma.carrito_abandono.findMany({
      where: { motivo_abandono: "desconocido" },
      include: {
        carrito: {
          include: {
            intento_pago: true,
            etapa_checkout: { orderBy: { fecha_llegada: "desc" }, take: 1 }
          }
        }
      }
    });

    // 4. Assign realistic motive and trigger notification simulation
    for (const record of abandonedRecords) {
      const subtotal = Number(record.carrito.subtotal);
      const hasFailedPayment = record.carrito.intento_pago.some((ip) => ip.estado === "fallido");
      const lastStage = record.carrito.etapa_checkout[0]?.etapa;

      let realisticMotive = "Solo estaba comparando precios";

      if (subtotal >= 25.00 && subtotal <= 34.99) {
        // High probability hypothesis: shipping threshold
        realisticMotive = "Costo de envío muy alto";
      } else if (hasFailedPayment) {
        realisticMotive = "Fallo en método de pago";
      } else if (lastStage === "metodo_pago") {
        realisticMotive = "Método de pago no disponible";
      } else if (lastStage === "direccion_envio") {
        realisticMotive = "Proceso de checkout muy largo";
      } else {
        const motives = [
          "Solo estaba comparando precios",
          "Decidió comprar en tienda física",
          "Encontró mejor precio en otro lugar"
        ];
        realisticMotive = motives[Math.floor(Math.random() * motives.length)];
      }

      await prisma.carrito_abandono.update({
        where: { id_carrito: record.id_carrito },
        data: { motivo_abandono: realisticMotive }
      });

      // Simulate recovery notification
      await prisma.notificacion_carrito.create({
        data: {
          id_carrito: record.id_carrito,
          tipo_notificacion: "descuento",
          resultado: Math.random() > 0.6 ? "recuperado" : "sin_respuesta"
        }
      });
    }

    return NextResponse.json({
      success: true,
      carritos_procesados: abandonedRecords.length,
      message: `Se detectaron y procesaron ${abandonedRecords.length} carritos abandonados con encuesta simulada.`
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error simulando abandono" }, { status: 500 });
  }
}
