import { prisma } from "@/lib/prisma";
import Link from "next/link";
import ProductImage from "@/components/ui/ProductImage";
import WishlistButton from "@/components/ui/WishlistButton";
import { Sparkles, ArrowRight, Filter, ArrowDownUp, Check } from "lucide-react";
import { sortProducts, filterProductsByStock, SortOption } from "@/lib/catalog-filter";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams?: { q?: string; cat?: string; sort?: string; stock?: string };
}) {
  const query = searchParams?.q?.toLowerCase() || "";
  const categoryFilter = searchParams?.cat || "";
  const sortOption = (searchParams?.sort || "newest") as SortOption;
  const onlyInStock = searchParams?.stock === "1";

  const categorias = await prisma.categoria.findMany({ where: { estado: "activa" } });
  const franquicias = await prisma.franquicia.findMany({ where: { estado: "activa" } });

  const rawProductos = await prisma.producto.findMany({
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
    orderBy: { id_producto: "desc" }
  });

  // Apply TDD verified filtering and sorting logic
  const filteredByStock = filterProductsByStock(rawProductos as any, onlyInStock);
  const productos = sortProducts(filteredByStock as any, sortOption);

  const buildUrl = (newParams: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (categoryFilter) params.set("cat", categoryFilter);
    if (sortOption && sortOption !== "newest") params.set("sort", sortOption);
    if (onlyInStock) params.set("stock", "1");

    Object.entries(newParams).forEach(([k, v]) => {
      if (v === undefined) {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });

    const str = params.toString();
    return str ? `/?${str}` : "/";
  };

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
          <Filter className="w-3.5 h-3.5 mr-1" /> Categorías:
        </div>

        <Link
          href={buildUrl({ cat: undefined })}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
            !categoryFilter
              ? "bg-red-600 text-white shadow-sm"
              : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
          }`}
        >
          Todos
        </Link>

        {categorias.map((cat) => (
          <Link
            key={cat.id_categoria}
            href={buildUrl({ cat: cat.nombre_categoria })}
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
            href={buildUrl({ q: f.nombre })}
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

      {/* Sorting, In-Stock filter and Results Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-gray-100 text-xs">
        <div className="flex items-center gap-3 text-gray-500">
          <span>Mostrando <strong>{productos.length}</strong> productos</span>
          {(query || categoryFilter || onlyInStock || sortOption !== "newest") && (
            <Link href="/" className="text-red-600 hover:underline font-semibold">
              Limpiar filtros
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Stock Filter Toggle */}
          <Link
            href={buildUrl({ stock: onlyInStock ? undefined : "1" })}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
              onlyInStock
                ? "bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs"
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${onlyInStock ? "bg-emerald-500" : "bg-gray-300"}`}></span>
            <span>Solo en stock</span>
            {onlyInStock && <Check className="w-3 h-3 text-emerald-600" />}
          </Link>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-1.5 text-gray-700 bg-white border border-gray-200 rounded-lg px-2.5 py-1">
            <ArrowDownUp className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] text-gray-400 font-medium">Ordenar:</span>
            <div className="flex items-center gap-1">
              <Link
                href={buildUrl({ sort: "newest" })}
                className={`px-1.5 py-0.5 rounded text-xs ${
                  sortOption === "newest" ? "font-bold text-red-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Recientes
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href={buildUrl({ sort: "price_asc" })}
                className={`px-1.5 py-0.5 rounded text-xs ${
                  sortOption === "price_asc" ? "font-bold text-red-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                $ Menor
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href={buildUrl({ sort: "price_desc" })}
                className={`px-1.5 py-0.5 rounded text-xs ${
                  sortOption === "price_desc" ? "font-bold text-red-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                $ Mayor
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {productos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 p-8 space-y-3 shadow-sm">
          <p className="text-sm text-gray-500">No encontramos productos con los filtros seleccionados.</p>
          <Link href="/" className="inline-block text-xs font-bold text-red-600 hover:underline">
            Ver catálogo completo
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {productos.map((prod: any) => {
            const hasVariants = prod.producto_variante && prod.producto_variante.length > 0;
            const lowestPrice = hasVariants
              ? Math.min(...prod.producto_variante.map((v: any) => Number(v.precio)))
              : 0;
            const imageUrl =
              hasVariants && prod.producto_variante[0].url_imagen
                ? prod.producto_variante[0].url_imagen
                : prod.url_imagen;
            const totalStock = hasVariants
              ? prod.producto_variante.reduce((s: number, v: any) => s + (v.stock_disponible || 0), 0)
              : 0;

            return (
              <div
                key={prod.id_producto}
                className="group relative flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all duration-300"
              >
                {/* Wishlist button */}
                <div className="absolute top-3 right-3 z-10">
                  <WishlistButton
                    item={{
                      id_producto: prod.id_producto,
                      nombre_producto: prod.nombre_producto,
                      precio: lowestPrice,
                      url_imagen: imageUrl,
                      franquicia: prod.franquicia?.nombre || prod.categoria?.nombre_categoria
                    }}
                  />
                </div>

                <Link href={`/producto/${prod.id_producto}`} className="block relative aspect-square bg-gray-50 overflow-hidden">
                  <ProductImage
                    src={imageUrl}
                    alt={prod.nombre_producto}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {prod.franquicia && (
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-gray-800 shadow-xs uppercase tracking-wide">
                      {prod.franquicia.nombre}
                    </span>
                  )}
                  {totalStock <= 5 && totalStock > 0 && (
                    <span className="absolute bottom-3 left-3 bg-amber-500/95 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                      ¡Quedan pocas!
                    </span>
                  )}
                </Link>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wider block">
                      {prod.categoria?.nombre_categoria}
                    </span>
                    <Link href={`/producto/${prod.id_producto}`}>
                      <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 mt-1 group-hover:text-red-600 transition-colors">
                        {prod.nombre_producto}
                      </h3>
                    </Link>
                  </div>

                  <div className="pt-2 border-t border-gray-50 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Desde</span>
                      <span className="text-base font-black text-gray-900">
                        ${lowestPrice.toFixed(2)}
                      </span>
                    </div>

                    <Link
                      href={`/producto/${prod.id_producto}`}
                      className="text-xs font-bold text-red-600 bg-red-50 group-hover:bg-red-600 group-hover:text-white px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
                    >
                      <span>Ver</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
