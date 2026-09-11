import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const categorias = await prisma.categoria.findMany({
      orderBy: { id_categoria: "asc" },
      include: {
        _count: {
          select: { producto: true }
        }
      }
    });

    return NextResponse.json({ success: true, categorias });
  } catch (error: any) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ message: error.message || "Error al obtener categorías" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { nombre_categoria, descripcion, atributos_plantilla } = body;

    if (!nombre_categoria || !nombre_categoria.trim()) {
      return NextResponse.json({ message: "El nombre de la categoría es requerido" }, { status: 400 });
    }

    // Check unique name
    const existing = await prisma.categoria.findFirst({
      where: {
        nombre_categoria: {
          equals: nombre_categoria.trim(),
          mode: "insensitive"
        }
      }
    });

    if (existing) {
      return NextResponse.json({ message: `Ya existe una categoría con el nombre "${nombre_categoria.trim()}"` }, { status: 400 });
    }

    const nuevaCategoria = await prisma.categoria.create({
      data: {
        nombre_categoria: nombre_categoria.trim(),
        descripcion: descripcion?.trim() || null,
        estado: "activa",
        atributos_plantilla: atributos_plantilla || []
      }
    });

    return NextResponse.json({ success: true, categoria: nuevaCategoria });
  } catch (error: any) {
    console.error("Error creating category:", error);
    return NextResponse.json({ message: error.message || "Error al crear la categoría" }, { status: 500 });
  }
}
