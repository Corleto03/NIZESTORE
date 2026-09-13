import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import ProductClientView from "./ProductClientView";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const prodId = parseInt(params.id, 10);
  if (isNaN(prodId)) return {};

  const producto = await prisma.producto.findUnique({
    where: { id_producto: prodId },
    include: {
      categoria: true,
      franquicia: true,
      producto_variante: true
    }
  });

  if (!producto || producto.estado !== "activo") return {};

  const precio = producto.producto_variante[0]?.precio
    ? `$${Number(producto.producto_variante[0].precio).toFixed(2)}`
    : "";

  const title = `${producto.nombre_producto} | NizeStore El Salvador`;
  const description =
    producto.descripcion ||
    `Compra ${producto.nombre_producto} ${precio} en NizeStore. Mercancía 100% original con envíos a todo El Salvador en 24-48 horas.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: producto.url_imagen ? [producto.url_imagen] : []
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: producto.url_imagen ? [producto.url_imagen] : []
    }
  };
}

export default async function ProductDetailPage({ params }: Props) {
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
      especificacion_producto: true
    }
  });

  if (!producto || producto.estado !== "activo") return notFound();

  // 1. Fetch Related Products (Cross-selling / Same Franchise or Category)
  let relatedProducts = await prisma.producto.findMany({
    where: {
      estado: "activo",
      id_producto: { not: prodId },
      OR: [
        ...(producto.id_franquicia
          ? [{ id_franquicia: producto.id_franquicia }]
          : []),
        { id_categoria: producto.id_categoria }
      ]
    },
    include: {
      categoria: true,
      franquicia: true,
      producto_variante: true
    },
    take: 4,
    orderBy: { id_producto: "desc" }
  });

  // Fallback: If fewer than 4 items match category/franchise, supplement with other active catalog items
  if (relatedProducts.length < 4) {
    const excludeIds = [prodId, ...relatedProducts.map((p) => p.id_producto)];
    const fallbackProducts = await prisma.producto.findMany({
      where: {
        estado: "activo",
        id_producto: { notIn: excludeIds }
      },
      include: {
        categoria: true,
        franquicia: true,
        producto_variante: true
      },
      take: 4 - relatedProducts.length,
      orderBy: { id_producto: "desc" }
    });
    relatedProducts = [...relatedProducts, ...fallbackProducts];
  }

  // 2. Fetch Reviews from resena_producto table
  let resenas: any[] = [];
  try {
    resenas = await (prisma as any).resena_producto.findMany({
      where: { id_producto: prodId },
      orderBy: { fecha_creacion: "desc" }
    });
  } catch (e) {
    console.error("Error loading reviews:", e);
  }

  // Calculate review metrics
  const totalResenas = resenas.length;
  const promedioResenas =
    totalResenas > 0
      ? parseFloat(
          (
            resenas.reduce((acc, r) => acc + r.calificacion, 0) / totalResenas
          ).toFixed(1)
        )
      : 5.0;

  // 3. Construct Schema.org JSON-LD for Google Rich Snippets
  const mainVariant = producto.producto_variante[0];
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: producto.nombre_producto,
    image: producto.url_imagen,
    description: producto.descripcion || producto.nombre_producto,
    sku: mainVariant?.sku || `NZ-${producto.id_producto}`,
    brand: {
      "@type": "Brand",
      name: producto.franquicia?.nombre || "NizeStore"
    },
    offers: {
      "@type": "Offer",
      url: `https://nizestore.com/producto/${producto.id_producto}`,
      priceCurrency: "USD",
      price: mainVariant ? Number(mainVariant.precio).toFixed(2) : "0.00",
      availability:
        mainVariant && mainVariant.stock_disponible > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition"
    },
    ...(totalResenas > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: promedioResenas,
        reviewCount: totalResenas,
        bestRating: "5",
        worstRating: "1"
      }
    })
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductClientView
        producto={producto}
        relatedProducts={relatedProducts}
        initialReviews={resenas}
        initialRating={promedioResenas}
      />
    </>
  );
}
