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

    const productos = await prisma.producto.findMany({
      include: {
        categoria: true,
        franquicia: true,
        especificacion_producto: true,
        producto_variante: {
          include: {
            variante_apariencia: true,
            _count: {
              select: { detalle_pedido: true }
            }
          }
        }
      },
      orderBy: { id_producto: "desc" }
    });

    const categorias = await prisma.categoria.findMany({
      where: { estado: "activa" },
      orderBy: { id_categoria: "asc" }
    });
    const franquicias = await prisma.franquicia.findMany({
      where: { estado: "activa" },
      orderBy: { nombre: "asc" }
    });

    return NextResponse.json({ productos, categorias, franquicias });
  } catch (error: any) {
    console.error("Error fetching admin products:", error);
    return NextResponse.json({ message: "Error al obtener productos" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();
    const {
      nombre_producto,
      descripcion,
      id_categoria,
      id_franquicia,
      url_imagen,
      precio,
      costo,
      stock_disponible,
      sku,
      color,
      talla,
      especificaciones,
      variantes
    } = body;

    if (!nombre_producto || !id_categoria) {
      return NextResponse.json(
        { message: "Nombre y categoría son obligatorios." },
        { status: 400 }
      );
    }

    const parsedPrice = precio !== undefined && precio !== "" ? parseFloat(precio) : 0;
    const parsedCost = costo !== undefined && costo !== "" ? parseFloat(costo) : parsedPrice * 0.6;
    const parsedStock = parseInt(stock_disponible || "10", 10);
    const defaultImg = url_imagen || "/images/products/one-piece-vol-100.jpeg";

    // Transaction for product, specifications, and variants
    const nuevoProducto = await prisma.$transaction(async (tx) => {
      // 1. Create main product
      const prod = await tx.producto.create({
        data: {
          nombre_producto: nombre_producto.trim(),
          descripcion: descripcion ? descripcion.trim() : null,
          id_categoria: parseInt(id_categoria, 10),
          id_franquicia: id_franquicia ? parseInt(id_franquicia, 10) : null,
          url_imagen: defaultImg,
          estado: "activo"
        }
      });

      // 2. Insert category specifications (key-value)
      if (Array.isArray(especificaciones) && especificaciones.length > 0) {
        for (const spec of especificaciones) {
          if (spec.atributo && spec.valor && String(spec.valor).trim()) {
            await tx.especificacion_producto.create({
              data: {
                id_producto: prod.id_producto,
                atributo: spec.atributo.trim(),
                valor: String(spec.valor).trim()
              }
            });
          }
        }
      }

      // 3. Handle multiple variants if provided
      if (Array.isArray(variantes) && variantes.length > 0) {
        for (let i = 0; i < variantes.length; i++) {
          const v = variantes[i];
          const vPrice = parseFloat(v.precio || parsedPrice || 0);
          const vCost = v.costo ? parseFloat(v.costo) : vPrice * 0.6;
          const vStock = parseInt(v.stock_disponible !== undefined ? v.stock_disponible : parsedStock, 10);
          const vSku = (v.sku || `NZ-${prod.id_producto}-${i + 1}-${Date.now().toString().slice(-4)}`).toUpperCase();

          const createdVar = await tx.producto_variante.create({
            data: {
              id_producto: prod.id_producto,
              sku: vSku,
              precio: vPrice,
              costo: vCost,
              stock_disponible: isNaN(vStock) ? 10 : vStock,
              estado: "activo",
              url_imagen: v.url_imagen || defaultImg,
              descripcion_variante: v.descripcion_variante ? String(v.descripcion_variante).trim() : null
            }
          });

          if (v.color || v.talla) {
            await tx.variante_apariencia.create({
              data: {
                id_variante: createdVar.id_variante,
                color: v.color || null,
                talla: v.talla || null
              }
            });
          }
        }
      } else {
        // Single default variant
        const generatedSku = (sku || `NZ-${Date.now().toString().slice(-6)}`).toUpperCase();
        const singleVar = await tx.producto_variante.create({
          data: {
            id_producto: prod.id_producto,
            sku: generatedSku,
            precio: parsedPrice,
            costo: parsedCost,
            stock_disponible: isNaN(parsedStock) ? 10 : parsedStock,
            estado: "activo",
            url_imagen: defaultImg
          }
        });

        if (color || talla) {
          await tx.variante_apariencia.create({
            data: {
              id_variante: singleVar.id_variante,
              color: color || "Único",
              talla: talla || "Estándar"
            }
          });
        }
      }

      return prod;
    });

    return NextResponse.json({
      success: true,
      message: "Producto creado exitosamente con sus especificaciones y variantes",
      producto: nuevoProducto
    });
  } catch (error: any) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { message: error.message || "Error al crear el producto" },
      { status: 500 }
    );
  }
}
