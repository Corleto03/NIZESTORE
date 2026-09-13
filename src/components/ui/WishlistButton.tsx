"use client";

import { useWishlist } from "@/context/WishlistContext";
import { Heart } from "lucide-react";
import { WishlistItem } from "@/lib/wishlist-helper";

interface WishlistButtonProps {
  item: WishlistItem;
  className?: string;
  showText?: boolean;
}

export default function WishlistButton({
  item,
  className = "",
  showText = false
}: WishlistButtonProps) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const active = isWishlisted(item.id_producto);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(item);
  };

  if (showText) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold transition-all ${
          active
            ? "border-red-200 bg-red-50 text-red-600 shadow-xs"
            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:text-red-600"
        } ${className}`}
        title={active ? "Quitar de favoritos" : "Guardar en favoritos"}
      >
        <Heart
          className={`w-4 h-4 transition-colors ${
            active ? "fill-red-600 text-red-600" : "text-gray-400"
          }`}
        />
        <span>{active ? "Guardado en favoritos" : "Guardar en favoritos"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs flex items-center justify-center shadow-sm hover:scale-110 active:scale-95 transition-all ${
        active ? "text-red-600" : "text-gray-400 hover:text-red-500"
      } ${className}`}
      title={active ? "Quitar de favoritos" : "Añadir a favoritos"}
      aria-label="Favoritos"
    >
      <Heart
        className={`w-4 h-4 ${
          active ? "fill-red-600 text-red-600" : "text-gray-400"
        }`}
      />
    </button>
  );
}
