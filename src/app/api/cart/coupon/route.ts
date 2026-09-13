import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart } from "@/lib/cart";

export async function POST(req: Request) {
  try {
    const { codigo } = await req.json();
    if (!codigo || !codigo.trim()) {
      return NextResponse.json(
        { message: "Ingresa un código de cupón válido." },
        { status: 400 }
      );
    }

    const cart = await getOrCreateCart();
    if (!cart || cart.detalle_carrito.length === 0) {
      return NextResponse.json(
        { message: "El carrito está vacío." },
        { status: 400 }
      );
    }

    const cleanCode = codigo.trim().toUpperCase();

    // Find active promotion
    const promo = await prisma.promocion.findUnique({
      where: { codigo: cleanCode }
    });

    if (!promo || promo.estado !== "activa") {
      return NextResponse.json(
        { message: "El cupón ingresado no existe o no se encuentra activo." },
        { status: 404 }
      );
    }

    const now = new Date();
    if (promo.fecha_inicio && new Date(promo.fecha_inicio) > now) {
      return NextResponse.json(
        { message: "Este cupón aún no está vigente." },
        { status: 400 }
      );
    }

    if (promo.fecha_fin && new Date(promo.fecha_fin) < now) {
      return NextResponse.json(
        { message: "Este cupón ya ha expirado." },
        { status: 400 }
      );
    }

    const subtotal = Number(cart.subtotal);
    const minAmount = promo.monto_minimo ? Number(promo.monto_minimo) : 0;

    if (subtotal < minAmount) {
      return NextResponse.json(
        {
          message: `Este cupón requiere una compra mínima de $${minAmount.toFixed(
            2
          )}.`
        },
        { status: 400 }
      );
    }

    let descuento = 0;
    const valorDesc = Number(promo.valor_descuento);

    if (promo.tipo_descuento === "porcentaje") {
      descuento = subtotal * (valorDesc / 100);
    } else {
      descuento = valorDesc;
    }

    if (descuento > subtotal) {
      descuento = subtotal;
    }

    const costoEnvio = Number(cart.costo_envio);
    const nuevoTotal = Math.max(0, subtotal - descuento + costoEnvio);

    await prisma.carrito.update({
      where: { id_carrito: cart.id_carrito },
      data: {
        id_promocion: promo.id_promocion,
        descuento: parseFloat(descuento.toFixed(2)),
        total: parseFloat(nuevoTotal.toFixed(2)),
        fecha_ultima_actualizacion: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `¡Cupón "${promo.codigo}" aplicado! Se descontaron $${descuento.toFixed(
        2
      )}.`,
      descuento: parseFloat(descuento.toFixed(2)),
      promocion: promo
    });
  } catch (error: any) {
    console.error("Error applying coupon:", error);
    return NextResponse.json(
      { message: error.message || "Error al aplicar el cupón." },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cart = await getOrCreateCart();
    if (!cart) {
      return NextResponse.json(
        { message: "Carrito no encontrado" },
        { status: 404 }
      );
    }

    const subtotal = Number(cart.subtotal);
    const costoEnvio = Number(cart.costo_envio);
    const nuevoTotal = subtotal + costoEnvio;

    await prisma.carrito.update({
      where: { id_carrito: cart.id_carrito },
      data: {
        id_promocion: null,
        descuento: 0,
        total: parseFloat(nuevoTotal.toFixed(2)),
        fecha_ultima_actualizacion: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: "Cupón removido del pedido."
    });
  } catch (error: any) {
    console.error("Error removing coupon:", error);
    return NextResponse.json(
      { message: "Error al remover el cupón." },
      { status: 500 }
    );
  }
}
