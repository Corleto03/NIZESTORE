import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const idProducto = parseInt(params.id, 10);
    if (isNaN(idProducto)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const resenas = await prisma.resena_producto.findMany({
      where: { id_producto: idProducto },
      orderBy: { fecha_creacion: "desc" }
    });

    const total = resenas.length;
    const promedio =
      total > 0
        ? resenas.reduce((acc, r) => acc + r.calificacion, 0) / total
        : 5;

    return NextResponse.json({
      resenas,
      total,
      promedio: parseFloat(promedio.toFixed(1))
    });
  } catch (error: any) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { message: "Error al cargar opiniones" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const idProducto = parseInt(params.id, 10);
    if (isNaN(idProducto)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();
    const { nombre_cliente, calificacion, comentario } = body;

    if (!nombre_cliente || !nombre_cliente.trim()) {
      return NextResponse.json(
        { message: "Tu nombre es obligatorio" },
        { status: 400 }
      );
    }

    const rating = parseInt(calificacion, 10);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json(
        { message: "La calificación debe ser entre 1 y 5 estrellas" },
        { status: 400 }
      );
    }

    if (!comentario || comentario.trim().length < 5) {
      return NextResponse.json(
        { message: "El comentario debe tener al menos 5 caracteres" },
        { status: 400 }
      );
    }

    const nuevaResena = await prisma.resena_producto.create({
      data: {
        id_producto: idProducto,
        nombre_cliente: nombre_cliente.trim(),
        calificacion: rating,
        comentario: comentario.trim(),
        verificado: true
      }
    });

    return NextResponse.json({
      success: true,
      message: "¡Gracias por tu opinión!",
      resena: nuevaResena
    });
  } catch (error: any) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { message: "Error al publicar la opinión" },
      { status: 500 }
    );
  }
}
