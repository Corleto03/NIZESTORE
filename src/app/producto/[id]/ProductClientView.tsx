"use client";

import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import Stepper from "@/components/ui/Stepper";
import Toast from "@/components/ui/Toast";
import { useCart } from "@/context/CartContext";

export default function ProductClientView({ producto }: { producto: any }) {
  const [selectedVariantId, setSelectedVariantId] = useState(producto.producto_variante[0]?.id_variante);
  const [cantidad, setCantidad] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const { addToCart } = useCart();

  const selectedVariant = producto.producto_variante.find((v: any) => v.id_variante === selectedVariantId) || producto.producto_variante[0];
  const imageUrl = selectedVariant?.url_imagen || producto.url_imagen;

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    const success = await addToCart(selectedVariant.id_variante, cantidad);
    if (success) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <ProductImage src={imageUrl} alt={producto.nombre_producto} className="w-full aspect-square rounded-lg" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{producto.nombre_producto}</h1>
          <p className="text-sm text-red-600 font-semibold mb-6 uppercase tracking-wider">
            {producto.franquicia?.nombre || producto.categoria?.nombre_categoria}
          </p>
          
          <div className="mb-6">
            <span className="text-2xl font-bold text-gray-900">
              ${selectedVariant ? Number(selectedVariant.precio).toFixed(2) : "0.00"}
            </span>
            <p className="text-sm text-gray-500 mt-1">
              Stock disponible: {selectedVariant?.stock_disponible || 0}
            </p>
          </div>

          {producto.producto_variante.length > 1 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Variantes</h3>
              <div className="flex flex-wrap gap-2">
                {producto.producto_variante.map((variante: any) => (
                  <button
                    key={variante.id_variante}
                    onClick={() => setSelectedVariantId(variante.id_variante)}
                    className={"px-4 py-2 border rounded-md text-sm font-medium transition-colors " + (
                      selectedVariantId === variante.id_variante
                        ? "border-red-600 text-red-600 bg-red-50"
                        : "border-gray-300 text-gray-700 hover:border-gray-400"
                    )}
                  >
                    {variante.sku} {variante.variante_apariencia ? ("- " + variante.variante_apariencia.talla + " / " + variante.variante_apariencia.color) : ""}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Cantidad</h3>
            <Stepper value={cantidad} onChange={setCantidad} max={selectedVariant?.stock_disponible || 1} />
          </div>

          <button 
            onClick={handleAddToCart}
            disabled={!selectedVariant || selectedVariant.stock_disponible <= 0}
            className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {selectedVariant?.stock_disponible > 0 ? "Agregar al carrito" : "Agotado"}
          </button>

          {producto.especificacion_producto?.length > 0 && (
            <div className="mt-12 border-t pt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Especificaciones</h3>
              <dl className="grid grid-cols-1 gap-y-4 sm:grid-cols-2">
                {producto.especificacion_producto.map((spec: any) => (
                  <div key={spec.id_especificacion} className="sm:col-span-1">
                    <dt className="text-sm font-medium text-gray-500">{spec.atributo}</dt>
                    <dd className="mt-1 text-sm text-gray-900">{spec.valor}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </div>
      <Toast show={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
}
