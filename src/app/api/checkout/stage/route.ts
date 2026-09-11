import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart } from "@/lib/cart";

export async function POST(req: Request) {
  try {
    const { etapa, completada } = await req.json();
    const cart = await getOrCreateCart();

    const record = await prisma.etapa_checkout.create({
      data: {
        id_carrito: cart.id_carrito,
        etapa,
        completada: completada || false
      }
    });

    return NextResponse.json({ success: true, id: Number(record.id_etapa_checkout) });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error recording stage" }, { status: 500 });
  }
}

