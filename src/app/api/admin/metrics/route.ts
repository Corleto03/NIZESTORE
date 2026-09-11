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

    // 1. Factores / Motivos de abandono
    const motivosRaw = await prisma.carrito_abandono.groupBy({
      by: ["motivo_abandono"],
      _count: { id_carrito: true }
    });
    const motivos = motivosRaw.map((m) => ({
      motivo: m.motivo_abandono || "Sin especificar",
      cantidad: m._count.id_carrito
    }));

    // 2. Abandono por rango de monto ($25-$34.99 vs $35+)
    const allCarts = await prisma.carrito.findMany({
      select: { subtotal: true, estado_carrito: true }
    });

    const tiers = {
      bajo: { total: 0, abandonados: 0 }, // < $25
      umbral: { total: 0, abandonados: 0 }, // $25 - $34.99
      alto: { total: 0, abandonados: 0 } // $35+
    };

    allCarts.forEach((c) => {
      const sub = Number(c.subtotal);
      const isAbandoned = c.estado_carrito === "abandonado";

      if (sub < 25) {
        tiers.bajo.total++;
        if (isAbandoned) tiers.bajo.abandonados++;
      } else if (sub <= 34.99) {
        tiers.umbral.total++;
        if (isAbandoned) tiers.umbral.abandonados++;
      } else {
        tiers.alto.total++;
        if (isAbandoned) tiers.alto.abandonados++;
      }
    });

    const rangoEnvio = [
      {
        rango: "Menos de $25",
        total: tiers.bajo.total,
        abandonados: tiers.bajo.abandonados,
        tasa: tiers.bajo.total ? Math.round((tiers.bajo.abandonados / tiers.bajo.total) * 100) : 0
      },
      {
        rango: "$25.00 - $34.99 (Bajo Umbral)",
        total: tiers.umbral.total,
        abandonados: tiers.umbral.abandonados,
        tasa: tiers.umbral.total ? Math.round((tiers.umbral.abandonados / tiers.umbral.total) * 100) : 0
      },
      {
        rango: "$35.00+ (Envío Gratis)",
        total: tiers.alto.total,
        abandonados: tiers.alto.abandonados,
        tasa: tiers.alto.total ? Math.round((tiers.alto.abandonados / tiers.alto.total) * 100) : 0
      }
    ];

    // 3. Abandono por etapa de checkout
    const etapasRaw = await prisma.etapa_checkout.groupBy({
      by: ["etapa"],
      where: { completada: false },
      _count: { id_etapa_checkout: true }
    });
    const etapas = etapasRaw.map((e) => ({
      etapa: e.etapa,
      abandonos: e._count.id_etapa_checkout
    }));

    // 4. Abandono por dispositivo
    const sessions = await prisma.sesion.findMany({
      include: {
        carrito: { select: { estado_carrito: true } }
      }
    });

    const dispMap: Record<string, { total: number; abandonados: number }> = {};
    sessions.forEach((s) => {
      const dev = s.dispositivo || "desktop";
      if (!dispMap[dev]) dispMap[dev] = { total: 0, abandonados: 0 };
      dispMap[dev].total += s.carrito.length;
      dispMap[dev].abandonados += s.carrito.filter((c) => c.estado_carrito === "abandonado").length;
    });

    const dispositivos = Object.entries(dispMap).map(([dispositivo, data]) => ({
      dispositivo: dispositivo === "desktop" ? "Computadora" : "Móvil / Tablet",
      total: data.total,
      abandonados: data.abandonados,
      tasa: data.total ? Math.round((data.abandonados / data.total) * 100) : 0
    }));

    // 5. Fallos de pago por método
    const erroresPagoRaw = await prisma.intento_pago_error.findMany({
      include: {
        intento_pago: { include: { metodo_pago: true } },
        catalogo_error_pago: true
      }
    });

    const fallosMetodo: Record<string, number> = {};
    erroresPagoRaw.forEach((err) => {
      const name = err.intento_pago.metodo_pago.nombre_metodo;
      fallosMetodo[name] = (fallosMetodo[name] || 0) + 1;
    });

    const metodosFallidos = Object.entries(fallosMetodo).map(([metodo, fallos]) => ({
      metodo,
      fallos
    }));

    // 6. Clientes nuevos vs recurrentes
    const clientes = await prisma.cliente.findMany({
      include: { pedido: true, carrito: true }
    });

    let nuevosTotal = 0;
    let nuevosAbandonos = 0;
    let recurrentesTotal = 0;
    let recurrentesAbandonos = 0;

    clientes.forEach((cl) => {
      const isNuevo = cl.pedido.length <= 1;
      const abandonos = cl.carrito.filter((c) => c.estado_carrito === "abandonado").length;
      const totalCarritos = cl.carrito.length;

      if (isNuevo) {
        nuevosTotal += totalCarritos;
        nuevosAbandonos += abandonos;
      } else {
        recurrentesTotal += totalCarritos;
        recurrentesAbandonos += abandonos;
      }
    });

    const tipoCliente = [
      {
        tipo: "Clientes Nuevos",
        total: nuevosTotal,
        abandonados: nuevosAbandonos,
        tasa: nuevosTotal ? Math.round((nuevosAbandonos / nuevosTotal) * 100) : 0
      },
      {
        tipo: "Clientes Recurrentes",
        total: recurrentesTotal,
        abandonados: recurrentesAbandonos,
        tasa: recurrentesTotal ? Math.round((recurrentesAbandonos / recurrentesTotal) * 100) : 0
      }
    ];

    // 7. Conversión por categorías
    const categorias = await prisma.categoria.findMany({
      include: {
        producto: {
          include: {
            vista_pagina: true,
            producto_variante: {
              include: { detalle_pedido: true }
            }
          }
        }
      }
    });

    const categoriasConversion = categorias.map((cat) => {
      let vistas = 0;
      let compras = 0;

      cat.producto.forEach((p) => {
        vistas += p.vista_pagina.length;
        p.producto_variante.forEach((v) => {
          compras += v.detalle_pedido.length;
        });
      });

      return {
        categoria: cat.nombre_categoria,
        vistas,
        compras,
        tasa_conversion: vistas ? Math.round((compras / vistas) * 100) : 0
      };
    });

    // 8. Impacto de Promociones
    const carritosPromo = allCarts.filter((c) => Number(c.subtotal) > 0);
    const withPromo = await prisma.carrito.findMany({
      where: { id_promocion: { not: null } },
      select: { estado_carrito: true }
    });
    const withoutPromo = await prisma.carrito.findMany({
      where: { id_promocion: null },
      select: { estado_carrito: true }
    });

    const promocionesImpacto = [
      {
        grupo: "Con Cupón / Promoción",
        total: withPromo.length,
        convertidos: withPromo.filter((c) => c.estado_carrito === "convertido").length,
        tasa: withPromo.length ? Math.round((withPromo.filter((c) => c.estado_carrito === "convertido").length / withPromo.length) * 100) : 0
      },
      {
        grupo: "Sin Promoción",
        total: withoutPromo.length,
        convertidos: withoutPromo.filter((c) => c.estado_carrito === "convertido").length,
        tasa: withoutPromo.length ? Math.round((withoutPromo.filter((c) => c.estado_carrito === "convertido").length / withoutPromo.length) * 100) : 0
      }
    ];

    // 9. Top Productos Más Vistos (vista_pagina)
    const topVistasRaw = await prisma.vista_pagina.groupBy({
      by: ["id_producto"],
      where: { id_producto: { not: null } },
      _count: { id_vista: true },
      orderBy: { _count: { id_vista: "desc" } },
      take: 5
    });

    const topProductos = await Promise.all(
      topVistasRaw.map(async (tv) => {
        const prod = await prisma.producto.findUnique({
          where: { id_producto: tv.id_producto! },
          include: { franquicia: true }
        });
        return {
          id_producto: tv.id_producto,
          nombre: prod?.nombre_producto || "Producto",
          franquicia: prod?.franquicia?.nombre || "General",
          vistas: tv._count.id_vista
        };
      })
    );

    // General KPIs
    const totalCarritosCreados = allCarts.length;
    const totalAbandonados = allCarts.filter((c) => c.estado_carrito === "abandonado").length;
    const tasaAbandonoGeneral = totalCarritosCreados
      ? Math.round((totalAbandonados / totalCarritosCreados) * 100)
      : 0;

    return NextResponse.json({
      resumen: {
        total_carritos: totalCarritosCreados,
        total_abandonados: totalAbandonados,
        tasa_abandono_general: tasaAbandonoGeneral,
      },
      motivos,
      rangoEnvio,
      etapas,
      dispositivos,
      metodosFallidos,
      tipoCliente,
      categoriasConversion,
      promocionesImpacto,
      topProductos
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error calculando métricas de BI" }, { status: 500 });
  }
}
