import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Production Cron endpoint for automatic cart abandonment processing
// Can be triggered by crontab, Vercel Cron, or scheduled workers
export async function GET(req: Request) {
  try {
    // 1. Mark carts inactive for > 2 hours as abandoned via PostgreSQL stored procedure
    await prisma.$executeRawUnsafe("CALL sp_marcar_carritos_abandonados(2)");

    // 2. Query newly marked abandoned carts with unclassified motives
    const unclassified = await prisma.carrito_abandono.findMany({
      where: {
        OR: [
          { motivo_abandono: "desconocido" },
          { motivo_abandono: null }
        ]
      },
      include: {
        carrito: {
          include: {
            intento_pago: true,
            etapa_checkout: { orderBy: { fecha_llegada: "desc" }, take: 1 },
            cliente: true
          }
        }
      }
    });

    let processedCount = 0;

    for (const record of unclassified) {
      const subtotal = Number(record.carrito.subtotal || 0);
      const hasFailedPayment = record.carrito.intento_pago?.some((ip) => ip.estado === "fallido");
      const lastStage = record.carrito.etapa_checkout?.[0]?.etapa;

      let inferredMotive = "Solo estaba comparando precios";

      if (hasFailedPayment) {
        inferredMotive = "Fallo en método de pago";
      } else if (subtotal > 0 && subtotal < 35.0 && (lastStage === "metodo_envio" || lastStage === "direccion_envio")) {
        inferredMotive = "Costo de envío muy alto";
      } else if (lastStage === "metodo_pago") {
        inferredMotive = "Método de pago no disponible";
      }

      await prisma.carrito_abandono.update({
        where: { id_carrito: record.id_carrito },
        data: { motivo_abandono: inferredMotive }
      });

      // If user has email, register a recovery notification
      if (record.carrito.cliente?.correo) {
        await prisma.notificacion_carrito.create({
          data: {
            id_carrito: record.id_carrito,
            tipo_notificacion: "recordatorio",
            resultado: "sin_respuesta"
          }
        });
      }

      processedCount++;
    }

    return NextResponse.json({
      success: true,
      carritos_detectados_y_clasificados: processedCount,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("Error in cart abandonment cron:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
