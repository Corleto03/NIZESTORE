"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface CartItem {
  id_detalle_carrito: number;
  id_variante: number;
  cantidad: number;
  precio_unitario: number;
  producto_variante: {
    sku: string;
    url_imagen: string | null;
    producto: {
      nombre_producto: string;
      url_imagen: string | null;
    };
    variante_apariencia?: {
      talla: string;
      color: string;
    };
  };
}

interface Cart {
  id_carrito: number;
  subtotal: number;
  descuento: number;
  costo_envio: number;
  total: number;
  id_promocion?: number | null;
  promocion?: {
    id_promocion: number;
    codigo: string;
    nombre: string;
    valor_descuento: number;
    tipo_descuento: string;
  } | null;
  detalle_carrito: CartItem[];
}

interface CartContextType {
  cart: Cart | null;
  isLoading: boolean;
  addToCart: (idVariante: number, cantidad: number) => Promise<boolean>;
  updateQuantity: (idDetalleCarrito: number, cantidad: number) => Promise<void>;
  removeItem: (idDetalleCarrito: number) => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshCart = async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const addToCart = async (idVariante: number, cantidad: number) => {
    const res = await fetch("/api/cart/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_variante: idVariante, cantidad })
    });
    if (res.ok) {
      await refreshCart();
      return true;
    }
    return false;
  };

  const updateQuantity = async (idDetalleCarrito: number, cantidad: number) => {
    await fetch("/api/cart/items", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_detalle_carrito: idDetalleCarrito, cantidad })
    });
    await refreshCart();
  };

  const removeItem = async (idDetalleCarrito: number) => {
    await fetch("/api/cart/items?id=" + idDetalleCarrito, { method: "DELETE" });
    await refreshCart();
  };

  return (
    <CartContext.Provider value={{ cart, isLoading, addToCart, updateQuantity, removeItem, refreshCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
};

