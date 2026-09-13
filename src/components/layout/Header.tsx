"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ShoppingCart, User, Search, Package, BarChart3, LogOut, LayoutGrid, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Header() {
  const { data: session } = useSession();
  const { cart } = useCart();
  const { wishlistCount } = useWishlist();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const isClient = session?.user?.role === "client";
  const isAdmin = session?.user?.role === "admin";

  const itemCount = cart?.detalle_carrito?.reduce((sum, item) => sum + item.cantidad, 0) || 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/");
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      {/* Top promotional bar highlighting the $35 threshold */}
      <div className="bg-red-600 text-white text-xs py-1.5 px-4 text-center font-medium tracking-wide">
        Envío GRATIS en El Salvador en compras de $35.00 o más | Coleccionables oficiales de Anime y Manga
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Search */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-extrabold text-red-600 tracking-tight">
              NizeStore<span className="text-gray-900 text-sm font-light ml-1">.sv</span>
            </Link>

            <form onSubmit={handleSearch} className="hidden md:block w-80 lg:w-96">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar manga, figuras, camisetas..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-full py-2 pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:bg-white transition-all"
                />
                <button type="submit" className="absolute right-3 top-2.5 text-gray-400 hover:text-red-600 transition-colors">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Navigation & User controls */}
          <nav className="flex items-center space-x-5">
            <Link href="/" className="flex items-center text-sm font-medium text-gray-700 hover:text-red-600 transition-colors">
              <LayoutGrid className="w-4 h-4 mr-1.5" />
              Catálogo
            </Link>

            {isAdmin && (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center text-sm font-semibold text-red-600 hover:text-red-700 transition-colors bg-red-50 px-3 py-1.5 rounded-lg"
                >
                  <BarChart3 className="w-4 h-4 mr-1.5" />
                  Dashboard BI
                </Link>
                <Link
                  href="/dashboard?tab=pedidos"
                  className="flex items-center text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
                >
                  <Package className="w-4 h-4 mr-1.5 text-gray-500" />
                  Gestión Pedidos
                </Link>
              </>
            )}

            {isClient && (
              <Link
                href="/pedidos"
                className="flex items-center text-sm font-medium text-gray-700 hover:text-red-600 transition-colors"
              >
                <Package className="w-4 h-4 mr-1.5" />
                Mis Pedidos
              </Link>
            )}

            <Link
              href="/favoritos"
              className="relative flex items-center p-2 text-gray-700 hover:text-red-600 transition-colors"
              aria-label="Favoritos"
              title="Mis Favoritos"
            >
              <Heart className="w-5 h-5 mr-1" />
              <span className="text-sm font-medium hidden lg:inline">Favoritos</span>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 lg:right-auto lg:left-4 bg-gray-900 text-white text-[11px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <Link
              href="/carrito"
              className="relative flex items-center p-2 text-gray-700 hover:text-red-600 transition-colors"
              aria-label="Carrito"
            >
              <ShoppingCart className="w-5 h-5 mr-1.5" />
              <span className="text-sm font-medium hidden sm:inline">Carrito</span>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 sm:right-auto sm:left-4 bg-red-600 text-white text-[11px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>

            {session ? (
              <div className="flex items-center space-x-3 ml-2 pl-3 border-l border-gray-200">
                <div className="flex items-center text-sm font-medium text-gray-800">
                  <User className="w-4 h-4 mr-1.5 text-red-600" />
                  <span className="max-w-[120px] truncate">{session.user?.name}</span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* EQUAL VISUAL WEIGHT FOR SIGN IN AND REGISTER */
              <div className="flex items-center space-x-2 ml-2 pl-3 border-l border-gray-200">
                <Link
                  href="/login"
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:border-red-600 hover:text-red-600 transition-all text-center min-w-[100px]"
                >
                  Iniciar sesión
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-red-600 bg-red-600 text-white hover:bg-red-700 hover:border-red-700 transition-all text-center min-w-[100px]"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
