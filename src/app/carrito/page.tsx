"use client";

import { useCart } from "@/context/CartContext";
import ProductImage from "@/components/ui/ProductImage";
import Stepper from "@/components/ui/Stepper";
import FreeShippingBar from "@/components/cart/FreeShippingBar";
import { Trash2, ArrowRight, Tag, CheckCircle2, AlertCircle, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function CartPage() {
  const { cart, isLoading, updateQuantity, removeItem, refreshCart } = useCart();
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponMsg, setCouponMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (isLoading) return <div className="text-center py-20">Cargando carrito...</div>;

  const items = cart?.detalle_carrito || [];

  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h2>
        <p className="text-gray-500 mb-6">¡Explora nuestro catálogo y encuentra increíbles productos!</p>
        <Link href="/" className="inline-flex items-center bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/cart/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: couponCode.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCouponMsg({ type: "error", text: data.message || "Cupón no válido" });
      } else {
        setCouponMsg({ type: "success", text: data.message });
        setCouponCode("");
        await refreshCart();
      }
    } catch (e: any) {
      setCouponMsg({ type: "error", text: "Error al aplicar cupón" });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = async () => {
    setCouponLoading(true);
    setCouponMsg(null);
    try {
      const res = await fetch("/api/cart/coupon", { method: "DELETE" });
      const data = await res.json();
      if (res.ok && data.success) {
        setCouponMsg({ type: "success", text: "Cupón removido" });
        await refreshCart();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCouponLoading(false);
    }
  };

  const hasDiscount = Number(cart?.descuento || 0) > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Carrito de Compras</h1>
          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
            {items.length} {items.length === 1 ? "artículo" : "artículos"}
          </span>
        </div>

        <FreeShippingBar subtotal={Number(cart?.subtotal || 0)} className="mb-4" />
        {items.map((item) => {
          const prod = item.producto_variante.producto;
          const imageUrl = item.producto_variante.url_imagen || prod.url_imagen;

          return (
            <div key={item.id_detalle_carrito} className="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center space-x-4">
                <ProductImage src={imageUrl} alt={prod.nombre_producto} className="w-20 h-20 rounded-md" />
                <div>
                  <h3 className="font-medium text-gray-900">{prod.nombre_producto}</h3>
                  <p className="text-sm text-gray-500">
                    {item.producto_variante.sku} {item.producto_variante.variante_apariencia ? ("- " + item.producto_variante.variante_apariencia.talla) : ""}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    ${Number(item.precio_unitario).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <Stepper value={item.cantidad} onChange={(newQty) => updateQuantity(item.id_detalle_carrito, newQty)} />
                <button 
                  onClick={() => removeItem(item.id_detalle_carrito)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Eliminar artículo"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Resumen del Pedido</h2>
        
        {/* Coupon section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1.5">
            <Tag className="w-4 h-4 text-red-600" />
            <span>¿Tienes un código de descuento?</span>
          </label>

          {hasDiscount ? (
            <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Cupón aplicado ({cart?.promocion?.codigo || "PROMO"})</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveCoupon}
                disabled={couponLoading}
                className="text-emerald-700 hover:text-rose-600 flex items-center gap-1 font-bold transition-colors"
                title="Quitar cupón"
              >
                <X className="w-3.5 h-3.5" />
                <span>Quitar</span>
              </button>
            </div>
          ) : (
            <div>
              <div className="flex space-x-2">
                <input 
                  type="text" 
                  placeholder="Ej: NIZE10"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm uppercase focus:ring-red-500 focus:border-red-500 outline-none font-medium"
                />
                <button 
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                  className="bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-black transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {couponLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Aplicar</span>
                </button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Tip: Prueba con el código <span className="font-bold text-red-600">NIZE10</span> para 10% OFF.
              </p>
            </div>
          )}

          {couponMsg && (
            <div className={`mt-2.5 p-2 rounded text-xs flex items-center gap-1.5 ${
              couponMsg.type === "success" 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}>
              {couponMsg.type === "success" ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />}
              <span>{couponMsg.text}</span>
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-100 pt-4 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>${Number(cart?.subtotal || 0).toFixed(2)}</span>
          </div>
          {hasDiscount && (
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Descuento aplicado</span>
              <span>-${Number(cart?.descuento || 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Envío estimado</span>
            <span>${Number(cart?.costo_envio || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-100 pt-3">
            <span>Total</span>
            <span>${Number(cart?.total || 0).toFixed(2)}</span>
          </div>
        </div>

        <Link
          href="/checkout"
          className="mt-6 w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 flex items-center justify-center space-x-2 transition-colors"
        >
          <span>Continuar al checkout</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
