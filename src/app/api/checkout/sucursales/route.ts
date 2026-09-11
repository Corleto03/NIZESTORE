import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart } from "@/lib/cart";

export async function GET() {
  try {
    const cart = await getOrCreateCart();
    const sucursales = await prisma.sucursal.findMany({
      where: { permite_retiro: true, estado: "activa" }
    });

    const results = await Promise.all(
      sucursales.map(async (suc) => {
        let tieneStock = true;

        for (const item of cart.detalle_carrito) {
          const aggregations = await prisma.kardex_inventario.aggregate({
            where: {
              id_sucursal: suc.id_sucursal,
              id_variante: item.id_variante
            },
            _sum: {
              cantidad_entrada: true,
              cantidad_salida: true
            }
          });

          const entradas = aggregations._sum.cantidad_entrada || 0;
          const salidas = aggregations._sum.cantidad_salida || 0;
          const stockSucursal = entradas - salidas;

          if (stockSucursal < item.cantidad) {
            tieneStock = false;
            break;
          }
        }

        return {
          id_sucursal: suc.id_sucursal,
          nombre: suc.nombre,
          direccion_detalle: suc.direccion_detalle,
          tiene_stock: tieneStock
        };
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error fetching sucursales" }, { status: 500 });
  }
}

