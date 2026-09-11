import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import { Sparkles, ArrowRight, Filter } from "lucide-react";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: { q?: string; cat?: string };
}) {
  const query = searchParams?.q?.toLowerCase() || "";
  const categoryFilter = searchParams?.cat || "";

  const categorias = await prisma.categoria.findMany();
  const franquicias = await prisma.franquicia.findMany();

  const productos = await prisma.producto.findMany({
    where: {
      estado: "activo",
      AND: [
        query
          ? {
              OR: [
                { nombre_producto: { contains: query, mode: "insensitive" } },
                { franquicia: { nombre: { contains: query, mode: "insensitive" } } },
                { categoria: { nombre_categoria: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {},
        categoryFilter
          ? {
              categoria: { nombre_categoria: categoryFilter },
            }
          : {},
      ],
    },
    include: {
      categoria: true,
      franquicia: true,
      producto_variante: true,
    },
  });

  return (
    <div className="space-y-8">
      {/* Hero Banner Minimalista */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-pink-600 to-red-700 text-white p-8 md:p-12 shadow-sm">
        <img
          src="/images/banner-hero.jpeg"
          alt="Hero Banner"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-30 pointer-events-none"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none overflow-hidden">
          <h1 className="text-[12rem] font-black whitespace-nowrap animate-bounce-x">NIZESTORE</h1>
        </div>
        <div className="max-w-xl space-y-3 relative z-10">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Temporada 2026
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            Coleccionables Oficiales de Anime & Manga
          </h1>
          <p className="text-white/80 text-sm md:text-base">
            Recuerda que todas tus compras de <strong className="text-white font-bold">$35.00 o más</strong> tienen <strong className="text-white font-bold">envío gratis</strong> directo a tu puerta en todo El Salvador.
          </p>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4">
        <div className="flex items-center text-xs font-bold text-gray-500 mr-2 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 mr-1" /> Filtros:
        </div>

        <Link
          href="/"
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
            !categoryFilter && !query
              ? "bg-red-600 text-white shadow-sm"
              : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          Todos
        </Link>

        {categorias.map((cat) => (
          <Link
            key={cat.id_categoria}
            href={`/?cat=${encodeURIComponent(cat.nombre_categoria)}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              categoryFilter === cat.nombre_categoria
                ? "bg-red-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {cat.nombre_categoria}
          </Link>
        ))}

        {franquicias.map((f) => (
          <Link
            key={f.id_franquicia}
            href={`/?q=${encodeURIComponent(f.nombre)}`}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              query.toLowerCase() === f.nombre.toLowerCase()
                ? "bg-red-600 text-white shadow-sm"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            {f.nombre}
          </Link>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span>Mostrando <strong>{productos.length}</strong> productos</span>
        {(query || categoryFilter) && (
          <Link href="/" className="text-xs text-red-600 hover:underline">
            Limpiar filtros
          </Link>
        )}
      </div>

      {/* Products Grid */}
      {productos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100 p-8">
          <p className="text-gray-500">No encontramos productos con los criterios seleccionados.</p>
          <Link href="/" className="mt-4 inline-block text-sm font-semibold text-red-600 hover:underline">
            Ver catálogo completo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productos.map((prod) => {
            const hasVariants = prod.producto_variante.length > 0;
            const lowestPrice = hasVariants
              ? Math.min(...prod.producto_variante.map((v) => Number(v.precio)))
              : 0;
            const imageUrl =
              hasVariants && prod.producto_variante[0].url_imagen
                ? prod.producto_variante[0].url_imagen
                : prod.url_imagen;

            return (
              <Link
                href={`/producto/${prod.id_producto}`}
                key={prod.id_producto}
                className="group flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md hover:border-gray-200 transition-all"
              >
                <div className="relative aspect-square bg-gray-50 overflow-hidden">
                  <ProductImage
                    src={imageUrl}
                    alt={prod.nombre_producto}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {prod.franquicia && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-gray-800 shadow-sm uppercase tracking-wide">
                      {prod.franquicia.nombre}
                    </span>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider block">
                      {prod.categoria?.nombre_categoria}
                    </span>
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mt-1 group-hover:text-red-600 transition-colors">
                      {prod.nombre_producto}
                    </h3>
                  </div>

                  <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 block">Precio</span>
                      <span className="text-base font-extrabold text-gray-900">
                        ${lowestPrice.toFixed(2)}
                      </span>
                    </div>

                    <span className="text-xs font-semibold text-red-600 bg-red-50 group-hover:bg-red-600 group-hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1">
                      <span>Ver</span>
                      <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
