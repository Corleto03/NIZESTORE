import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id_carrito, motivo } = body;

    if (!id_carrito || !motivo) {
      return NextResponse.json({ message: "id_carrito y motivo son requeridos" }, { status: 400 });
    }

    const cartIdBigInt = BigInt(id_carrito);

    // Upsert or update motivo_abandono with the customer's direct response
    await prisma.carrito_abandono.upsert({
      where: { id_carrito: cartIdBigInt },
      update: {
        motivo_abandono: String(motivo).slice(0, 200)
      },
      create: {
        id_carrito: cartIdBigInt,
        motivo_abandono: String(motivo).slice(0, 200)
      }
    });

    return NextResponse.json({
      success: true,
      message: "Motivo de abandono registrado exitosamente"
    });
  } catch (error: any) {
    console.error("Error saving abandonment feedback:", error);
    return NextResponse.json({ message: error.message || "Error al registrar motivo" }, { status: 500 });
  }
}
