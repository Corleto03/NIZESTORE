import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart } from "@/lib/cart";

export async function POST(req: Request) {
  try {
    const { id_variante, cantidad } = await req.json();
    const cart = await getOrCreateCart();

    const variant = await prisma.producto_variante.findUnique({
      where: { id_variante },
      include: { producto: true }
    });
    if (!variant || variant.producto.estado !== "activo" || variant.estado !== "activo") {
      return NextResponse.json({ message: "Este producto ya no se encuentra disponible para la venta." }, { status: 400 });
    }
    if (variant.stock_disponible < cantidad) {
      return NextResponse.json({ message: "Stock insuficiente" }, { status: 400 });
    }

    const existingItem = await prisma.detalle_carrito.findFirst({
      where: {
        id_carrito: cart.id_carrito,
        id_variante
      }
    });

    if (existingItem) {
      await prisma.detalle_carrito.update({
        where: { id_detalle_carrito: existingItem.id_detalle_carrito },
        data: { cantidad: existingItem.cantidad + cantidad }
      });
    } else {
      await prisma.detalle_carrito.create({
        data: {
          id_carrito: cart.id_carrito,
          id_variante,
          cantidad,
          precio_unitario: variant.precio
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error adding item" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id_detalle_carrito, cantidad } = await req.json();
    if (cantidad <= 0) {
      await prisma.detalle_carrito.delete({
        where: { id_detalle_carrito: BigInt(id_detalle_carrito) }
      });
    } else {
      await prisma.detalle_carrito.update({
        where: { id_detalle_carrito: BigInt(id_detalle_carrito) },
        data: { cantidad }
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error updating item" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

    await prisma.detalle_carrito.delete({
      where: { id_detalle_carrito: BigInt(id) }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error deleting item" }, { status: 500 });
  }
}

