import { prisma } from "./prisma";
import { cookies, headers } from "next/headers";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";

export async function trackPageView(tipoPagina: "home" | "categoria" | "producto" | "carrito" | "checkout" | "otro", idProducto?: number, url: string = "") {
  try {
    const session = await getServerSession(authOptions);
    // Exclude administrators from analytics tracking to maintain data integrity
    if (session?.user && session.user.role === "admin") {
      return null;
    }

    const cookieStore = cookies();
    const deviceId = cookieStore.get("nizestore_device_id")?.value || "unknown_device";

    let clienteId: number | null = null;
    if (session?.user && session.user.role === "client") {
      clienteId = parseInt(session.user.id, 10);
    }

    let userSession = await prisma.sesion.findFirst({
      where: {
        OR: [
          ...(clienteId ? [{ id_cliente: clienteId }] : []),
          { id_dispositivo: deviceId }
        ]
      },
      orderBy: { fecha_inicio: "desc" }
    });

    if (!userSession) {
      const userAgent = headers().get("user-agent") || "";
      let tipoDispositivo: "computadora" | "movil" | "tablet" = "computadora";
      if (/tablet|ipad/i.test(userAgent)) {
        tipoDispositivo = "tablet";
      } else if (/mobile|iphone|ipod|android/i.test(userAgent)) {
        tipoDispositivo = "movil";
      }

      userSession = await prisma.sesion.create({
        data: {
          id_cliente: clienteId,
          id_dispositivo: deviceId,
          dispositivo: tipoDispositivo
        }
      });
    }

    const view = await prisma.vista_pagina.create({
      data: {
        id_sesion: userSession.id_sesion,
        tipo_pagina: tipoPagina,
        id_producto: idProducto || null,
        url: url || `/${tipoPagina}${idProducto ? `/${idProducto}` : ""}`
      }
    });

    return Number(view.id_vista);
  } catch (error) {
    console.warn("Could not record page view:", error);
    return null;
  }
}
