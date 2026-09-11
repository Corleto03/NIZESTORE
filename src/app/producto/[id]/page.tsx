import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import ProductClientView from "./ProductClientView";

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const prodId = parseInt(params.id, 10);
  if (isNaN(prodId)) return notFound();

  const producto = await prisma.producto.findUnique({
    where: { id_producto: prodId },
    include: {
      categoria: true,
      franquicia: true,
      producto_variante: {
        include: {
          variante_apariencia: true
        }
      },
      especificacion_producto: true,
    }
  });

  if (!producto || producto.estado !== "activo") return notFound();

  return <ProductClientView producto={producto} />;
}
