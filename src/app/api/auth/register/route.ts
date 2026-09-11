import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { nombre, correo, password, tipo_persona } = await req.json();
    
    if (!nombre || !correo || !password || !tipo_persona) {
      return NextResponse.json({ message: "Faltan campos obligatorios" }, { status: 400 });
    }
    
    const exists = await prisma.cliente.findUnique({ where: { correo } });
    if (exists) {
      return NextResponse.json({ message: "El correo ya está registrado" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    
    await prisma.cliente.create({
      data: {
        correo,
        password_hash,
        tipo_persona,
        estado: "activo",
        ...(tipo_persona === "natural" ? {
          cliente_natural: {
            create: {
              nombres: nombre,
              apellidos: "",
              id_tipo_documento: 1,
              numero_documento: Math.floor(10000000 + Math.random() * 90000000).toString()
            }
          }
        } : {
          cliente_juridico: {
            create: {
              razon_social: nombre,
              nombre_comercial: nombre,
              nit: "0000-000000-000-0"
            }
          }
        })
      }
    });
    
    return NextResponse.json({ message: "Cliente registrado con éxito" }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

