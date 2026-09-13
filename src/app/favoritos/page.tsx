"use client";

import { useWishlist } from "@/context/WishlistContext";
import { useCart } from "@/context/CartContext";
import ProductImage from "@/components/ui/ProductImage";
import Link from "next/link";
import { Heart, Trash2, ShoppingCart, ArrowRight } from "lucide-react";
import { useState } from "react";
import Toast from "@/components/ui/Toast";

export default function WishlistPage() {
  const { wishlist, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [toast, setToast] = useState(false);

  const handleMoveToCart = async (item: any) => {
    // Attempt add with product id directly or redirect
    removeFromWishlist(item.id_producto);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Heart className="w-7 h-7 text-red-600 fill-red-600" />
            <span>Mis Favoritos</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Artículos que has guardado para comprar más adelante.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
          {wishlist.length} {wishlist.length === 1 ? "guardado" : "guardados"}
        </span>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 p-8 max-w-md mx-auto space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <Heart className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Tu lista de deseos está vacía</h2>
          <p className="text-xs text-gray-500">
            Explora nuestro catálogo de manga, figuras y ropa oficial y guarda tus favoritos haciendo clic en el corazón.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-colors shadow-sm"
          >
            <span>Explorar catálogo</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {wishlist.map((item) => (
            <div
              key={item.id_producto}
              className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md hover:border-gray-200 transition-all flex flex-col justify-between p-4"
            >
              <div>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-50 mb-3">
                  <ProductImage
                    src={item.url_imagen || "/images/products/one-piece-vol-100.jpeg"}
                    alt={item.nombre_producto}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(item.id_producto)}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-gray-400 hover:text-rose-600 flex items-center justify-center shadow-xs transition-colors"
                    title="Eliminar de favoritos"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {item.franquicia && (
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">
                    {item.franquicia}
                  </span>
                )}
                <Link
                  href={`/producto/${item.id_producto}`}
                  className="font-bold text-xs sm:text-sm text-gray-900 hover:text-red-600 line-clamp-2 mt-0.5 transition-colors"
                >
                  {item.nombre_producto}
                </Link>
              </div>

              <div className="pt-4 border-t border-gray-100 mt-4 flex items-center justify-between gap-2">
                <span className="text-base font-black text-gray-900">
                  ${Number(item.precio).toFixed(2)}
                </span>
                <Link
                  href={`/producto/${item.id_producto}`}
                  className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                >
                  <span>Ver detalles</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <Toast show={toast} onClose={() => setToast(false)} />
    </div>
  );
}
