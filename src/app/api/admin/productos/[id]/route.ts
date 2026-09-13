import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const idProducto = parseInt(params.id, 10);
    if (isNaN(idProducto)) {
      return NextResponse.json({ message: "ID de producto inválido" }, { status: 400 });
    }

    const prod = await prisma.producto.findUnique({
      where: { id_producto: idProducto },
      include: {
        categoria: true,
        franquicia: true,
        especificacion_producto: true,
        producto_variante: {
          include: {
            variante_apariencia: true
          }
        }
      }
    });

    if (!prod) {
      return NextResponse.json({ message: "Producto no encontrado" }, { status: 404 });
    }

    const variantIds = prod.producto_variante.map((v) => v.id_variante);
    const salesCount = await prisma.detalle_pedido.count({
      where: { id_variante: { in: variantIds } }
    });

    return NextResponse.json({
      success: true,
      producto: prod,
      tiene_ventas: salesCount > 0,
      total_pedidos: salesCount
    });
  } catch (error: any) {
    console.error("Error fetching product details:", error);
    return NextResponse.json({ message: error.message || "Error al obtener producto" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const idProducto = parseInt(params.id, 10);
    if (isNaN(idProducto)) {
      return NextResponse.json({ message: "ID de producto inválido" }, { status: 400 });
    }

    const prod = await prisma.producto.findUnique({
      where: { id_producto: idProducto },
      include: { producto_variante: true }
    });

    if (!prod) {
      return NextResponse.json({ message: "Producto no encontrado" }, { status: 404 });
    }

    const variantIds = prod.producto_variante.map((v) => v.id_variante);
    const salesCount = await prisma.detalle_pedido.count({
      where: { id_variante: { in: variantIds } }
    });

    const body = await req.json();
    const {
      estado,
      nombre_producto,
      descripcion,
      id_categoria,
      id_franquicia,
      url_imagen,
      precio,
      costo,
      stock_disponible,
      especificaciones,
      variantes
    } = body;

    // If product has sales, prevent category change or radical rename
    if (salesCount > 0) {
      if (id_categoria && parseInt(id_categoria, 10) !== prod.id_categoria) {
        return NextResponse.json({
          message: "No se puede cambiar la categoría de un producto que ya tiene ventas registradas, para preservar la coherencia histórica de las órdenes."
        }, { status: 400 });
      }
    }

    // Execute update
    const updated = await prisma.$transaction(async (tx) => {
      const dataToUpdate: any = {};
      if (estado !== undefined) dataToUpdate.estado = estado;
      if (descripcion !== undefined) dataToUpdate.descripcion = descripcion;
      if (url_imagen !== undefined) dataToUpdate.url_imagen = url_imagen;
      if (id_franquicia !== undefined) dataToUpdate.id_franquicia = id_franquicia ? parseInt(id_franquicia, 10) : null;

      // Allow name and category update if no sales
      if (salesCount === 0) {
        if (nombre_producto) dataToUpdate.nombre_producto = nombre_producto.trim();
        if (id_categoria) dataToUpdate.id_categoria = parseInt(id_categoria, 10);
      } else if (nombre_producto && nombre_producto.trim() !== prod.nombre_producto) {
        // Minor typo correction allowed, but keep base identity
        dataToUpdate.nombre_producto = nombre_producto.trim();
      }

      const p = await tx.producto.update({
        where: { id_producto: idProducto },
        data: dataToUpdate
      });

      // Update variants (WooCommerce style: update existing, create newly added, and update appearance)
      if (Array.isArray(variantes) && variantes.length > 0) {
        for (const v of variantes) {
          if (v.id_variante) {
            const vUpdate: any = {};
            if (v.precio !== undefined && v.precio !== "") vUpdate.precio = parseFloat(v.precio);
            if (v.costo !== undefined && v.costo !== "") vUpdate.costo = parseFloat(v.costo);
            if (v.stock !== undefined && v.stock !== "") vUpdate.stock_disponible = parseInt(v.stock, 10);
            if (v.sku !== undefined) vUpdate.sku = v.sku;
            if (v.url_imagen !== undefined) vUpdate.url_imagen = v.url_imagen;
            if (v.descripcion_variante !== undefined) vUpdate.descripcion_variante = v.descripcion_variante ? String(v.descripcion_variante).trim() : null;
            
            await tx.producto_variante.update({
              where: { id_variante: v.id_variante },
              data: vUpdate
            });

            // Update or create appearance (talla / color)
            if (v.talla !== undefined || v.color !== undefined) {
              const existingApp = await tx.variante_apariencia.findUnique({
                where: { id_variante: v.id_variante }
              });
              if (existingApp) {
                await tx.variante_apariencia.update({
                  where: { id_variante: v.id_variante },
                  data: {
                    talla: v.talla !== undefined ? v.talla : existingApp.talla,
                    color: v.color !== undefined ? v.color : existingApp.color
                  }
                });
              } else {
                await tx.variante_apariencia.create({
                  data: {
                    id_variante: v.id_variante,
                    talla: v.talla || null,
                    color: v.color || null
                  }
                });
              }
            }
          } else {
            // Newly added variant to existing product
            const newVar = await tx.producto_variante.create({
              data: {
                id_producto: idProducto,
                sku: (v.sku || `NZ-${idProducto}-${Date.now().toString().slice(-4)}`).toUpperCase(),
                precio: parseFloat(v.precio || precio || 0),
                costo: parseFloat(v.costo || costo || 0),
                stock_disponible: parseInt(v.stock || stock_disponible || 0, 10),
                url_imagen: v.url_imagen || url_imagen || prod.url_imagen,
                descripcion_variante: v.descripcion_variante ? String(v.descripcion_variante).trim() : null,
                estado: "activo"
              }
            });

            if (v.talla || v.color) {
              await tx.variante_apariencia.create({
                data: {
                  id_variante: newVar.id_variante,
                  talla: v.talla || null,
                  color: v.color || null
                }
              });
            }
          }
        }
      } else {
        const mainVariant = prod.producto_variante[0];
        if (mainVariant && (precio !== undefined || costo !== undefined || stock_disponible !== undefined || url_imagen !== undefined)) {
          const variantUpdate: any = {};
          if (precio !== undefined && precio !== "") variantUpdate.precio = parseFloat(precio);
          if (costo !== undefined && costo !== "") variantUpdate.costo = parseFloat(costo);
          if (stock_disponible !== undefined && stock_disponible !== "") variantUpdate.stock_disponible = parseInt(stock_disponible, 10);
          if (url_imagen !== undefined) variantUpdate.url_imagen = url_imagen;

          await tx.producto_variante.update({
            where: { id_variante: mainVariant.id_variante },
            data: variantUpdate
          });
        }
      }

      // Update specifications if provided
      if (Array.isArray(especificaciones)) {
        // Remove existing specs and re-insert
        await tx.especificacion_producto.deleteMany({
          where: { id_producto: idProducto }
        });

        for (const spec of especificaciones) {
          if (spec.atributo && spec.valor && String(spec.valor).trim()) {
            await tx.especificacion_producto.create({
              data: {
                id_producto: idProducto,
                atributo: spec.atributo.trim(),
                valor: String(spec.valor).trim()
              }
            });
          }
        }
      }

      return p;
    });

    return NextResponse.json({
      success: true,
      message: "Producto actualizado con éxito",
      producto: updated,
      tiene_ventas: salesCount > 0
    });
  } catch (error: any) {
    console.error("Error updating product:", error);
    return NextResponse.json({ message: error.message || "Error al actualizar producto" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }

    const idProducto = parseInt(params.id, 10);
    if (isNaN(idProducto)) {
      return NextResponse.json({ message: "ID de producto inválido" }, { status: 400 });
    }

    const prod = await prisma.producto.findUnique({
      where: { id_producto: idProducto },
      include: {
        producto_variante: true
      }
    });

    if (!prod) {
      return NextResponse.json({ message: "Producto no encontrado" }, { status: 404 });
    }

    const variantIds = prod.producto_variante.map((v) => v.id_variante);

    // 1. Strict verification: Check if any variant has been sold
    const salesCount = await prisma.detalle_pedido.count({
      where: {
        id_variante: { in: variantIds }
      }
    });

    if (salesCount > 0) {
      return NextResponse.json({
        message: `No es posible eliminar este producto porque ya tiene ${salesCount} orden(es) de compra registrada(s). Para ocultarlo de la tienda pública sin alterar la contabilidad histórica, utiliza la opción de 'Pausar'.`
      }, { status: 400 });
    }

    // 2. Check invoices as well
    const invoiceCount = await prisma.detalle_factura.count({
      where: {
        id_variante: { in: variantIds }
      }
    });

    if (invoiceCount > 0) {
      return NextResponse.json({
        message: `No es posible eliminar este producto porque está vinculado a ${invoiceCount} factura(s) legal(es). Utiliza 'Pausar' en su lugar.`
      }, { status: 400 });
    }

    // 3. Safe cascade delete for unsold product
    await prisma.$transaction(async (tx) => {
      // Clean page views
      await tx.vista_pagina.deleteMany({
        where: { id_producto: idProducto }
      });

      // Clean specifications
      await tx.especificacion_producto.deleteMany({
        where: { id_producto: idProducto }
      });

      // Clean active shopping carts with this unsold product
      if (variantIds.length > 0) {
        await tx.detalle_carrito.deleteMany({
          where: { id_variante: { in: variantIds } }
        });

        await tx.kardex_inventario.deleteMany({
          where: { id_variante: { in: variantIds } }
        });

        await tx.variante_apariencia.deleteMany({
          where: { id_variante: { in: variantIds } }
        });

        await tx.producto_variante.deleteMany({
          where: { id_producto: idProducto }
        });
      }

      // Finally delete the product
      await tx.producto.delete({
        where: { id_producto: idProducto }
      });
    });

    return NextResponse.json({
      success: true,
      message: `El producto "${prod.nombre_producto}" ha sido eliminado exitosamente del catálogo.`
    });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ message: error.message || "Error al eliminar producto" }, { status: 500 });
  }
}
