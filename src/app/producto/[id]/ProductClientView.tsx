"use client";

import { useState } from "react";
import ProductImage from "@/components/ui/ProductImage";
import Stepper from "@/components/ui/Stepper";
import Toast from "@/components/ui/Toast";
import { useCart } from "@/context/CartContext";
import WishlistButton from "@/components/ui/WishlistButton";
import Link from "next/link";
import {
  Star,
  Truck,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  Loader2,
  ArrowRight
} from "lucide-react";

interface ProductClientViewProps {
  producto: any;
  relatedProducts?: any[];
  initialReviews?: any[];
  initialRating?: number;
}

export default function ProductClientView({
  producto,
  relatedProducts = [],
  initialReviews = [],
  initialRating = 5.0
}: ProductClientViewProps) {
  const [selectedVariantId, setSelectedVariantId] = useState(
    producto.producto_variante[0]?.id_variante
  );
  const [cantidad, setCantidad] = useState(1);
  const [showToast, setShowToast] = useState(false);
  const { addToCart } = useCart();

  // Reviews state
  const [reviews, setReviews] = useState<any[]>(initialReviews);
  const [averageRating, setAverageRating] = useState<number>(initialRating);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewHoverStar, setReviewHoverStar] = useState(0);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedVariant =
    producto.producto_variante.find((v: any) => v.id_variante === selectedVariantId) ||
    producto.producto_variante[0];
  const imageUrl = selectedVariant?.url_imagen || producto.url_imagen;
  const stock = selectedVariant?.stock_disponible || 0;

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    const success = await addToCart(selectedVariant.id_variante, cantidad);
    if (success) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) {
      setReviewMsg({ type: "error", text: "Por favor completa tu nombre y comentario." });
      return;
    }

    setSubmittingReview(true);
    setReviewMsg(null);

    try {
      const res = await fetch(`/api/productos/${producto.id_producto}/resenas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_cliente: reviewName.trim(),
          calificacion: reviewRating,
          comentario: reviewComment.trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setReviewMsg({ type: "error", text: data.message || "Error al enviar reseña" });
      } else {
        const updatedReviews = [data.resena, ...reviews];
        setReviews(updatedReviews);
        const newAvg =
          updatedReviews.reduce((acc, r) => acc + r.calificacion, 0) /
          updatedReviews.length;
        setAverageRating(parseFloat(newAvg.toFixed(1)));
        setReviewMsg({ type: "success", text: "¡Tu reseña ha sido publicada con éxito!" });
        setReviewName("");
        setReviewComment("");
        setReviewRating(5);
        setTimeout(() => {
          setShowReviewForm(false);
          setReviewMsg(null);
        }, 2000);
      }
    } catch {
      setReviewMsg({ type: "error", text: "Error de conexión al enviar la reseña." });
    } finally {
      setSubmittingReview(false);
    }
  };

  const scrollToReviews = () => {
    const el = document.getElementById("seccion-opiniones");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-12">
      {/* Main Product Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
          {/* Left: Product Image */}
          <div>
            <div className="sticky top-6">
              <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50 aspect-square">
                <ProductImage
                  src={imageUrl}
                  alt={producto.nombre_producto}
                  className="w-full h-full object-cover object-center"
                />
                {stock <= 5 && stock > 0 && (
                  <span className="absolute top-3 left-3 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    ¡Últimas unidades!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Product Details & Purchase */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Franchise / Category Badge */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-red-600 tracking-wider uppercase">
                  {producto.franquicia?.nombre || producto.categoria?.nombre_categoria}
                </span>
                <span className="text-[11px] text-gray-400">SKU: {selectedVariant?.sku || `NZ-${producto.id_producto}`}</span>
              </div>

              {/* Product Title */}
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
                {producto.nombre_producto}
              </h1>

              {/* Star Rating Badge (Clickable to scroll) */}
              <div
                onClick={scrollToReviews}
                className="inline-flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity mb-4"
                title="Ver opiniones"
              >
                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-4 h-4 ${
                        s <= Math.round(averageRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-200"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold text-gray-800">
                  {averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-gray-500 underline">
                  ({reviews.length} {reviews.length === 1 ? "opinión" : "opiniones"})
                </span>
              </div>

              {/* Price & Stock status */}
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 mb-6">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-black text-gray-900">
                    ${selectedVariant ? Number(selectedVariant.precio).toFixed(2) : "0.00"}
                  </span>
                  <span className="text-xs text-gray-400">USD • IVA incluido</span>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs">
                  {stock > 5 ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      En stock ({stock} disponibles para envío inmediato)
                    </span>
                  ) : stock > 0 ? (
                    <span className="text-amber-700 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      ¡Quedan solo {stock} unidades disponibles!
                    </span>
                  ) : (
                    <span className="text-rose-600 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                      Agotado temporalmente
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {producto.descripcion && (
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-4">
                  {producto.descripcion}
                </p>
              )}

              {/* Variants Selector */}
              {producto.producto_variante.length > 1 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                      Opciones disponibles ({producto.producto_variante.length})
                    </h3>
                    <span className="text-[11px] text-gray-400">
                      Selecciona para ver foto y stock
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {producto.producto_variante.map((variante: any) => {
                      const isSelected = selectedVariantId === variante.id_variante;
                      const varImg = variante.url_imagen || producto.url_imagen;
                      const label =
                        variante.variante_apariencia?.talla && variante.variante_apariencia?.color
                          ? `${variante.variante_apariencia.talla} / ${variante.variante_apariencia.color}`
                          : variante.variante_apariencia?.talla
                          ? variante.variante_apariencia.talla
                          : variante.sku || `Opción #${variante.id_variante}`;
                      const isVarOut = (variante.stock_disponible || 0) <= 0;

                      return (
                        <button
                          key={variante.id_variante}
                          type="button"
                          onClick={() => setSelectedVariantId(variante.id_variante)}
                          className={`flex items-center gap-2.5 p-2 pr-3.5 border rounded-xl text-xs font-bold transition-all text-left ${
                            isSelected
                              ? "border-red-600 bg-red-50 text-red-700 shadow-sm ring-2 ring-red-600/20"
                              : "border-gray-200 text-gray-700 hover:border-gray-300 bg-white"
                          } ${isVarOut ? "opacity-60" : ""}`}
                        >
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                            <img
                              src={varImg}
                              alt={label}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <span className="block truncate max-w-[130px]">{label}</span>
                            <span className="block text-[10px] font-normal text-gray-500">
                              ${Number(variante.precio).toFixed(2)}
                              {isVarOut && <span className="text-rose-600 font-bold ml-1">• Agotado</span>}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Individual Variant Description if available */}
                  {selectedVariant?.descripcion_variante && (
                    <div className="mt-3 p-3 bg-red-50/60 border border-red-100 rounded-xl text-xs text-slate-800 animate-in fade-in duration-200">
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block mb-0.5">
                        Especificación de esta variante:
                      </span>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {selectedVariant.descripcion_variante}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity Stepper & Add to Cart */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">
                      Cantidad
                    </label>
                    <Stepper
                      value={cantidad}
                      onChange={setCantidad}
                      max={Math.max(1, stock)}
                    />
                  </div>

                  <div className="flex-1 pt-5">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={!selectedVariant || stock <= 0}
                        className="flex-1 bg-red-600 text-white py-3.5 px-6 rounded-xl font-bold text-sm hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
                      >
                        {stock > 0 ? (
                          <>
                            <span>Agregar al carrito</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        ) : (
                          "Agotado"
                        )}
                      </button>

                      <WishlistButton
                        item={{
                          id_producto: producto.id_producto,
                          nombre_producto: producto.nombre_producto,
                          precio: Number(selectedVariant?.precio || 0),
                          url_imagen: imageUrl,
                          franquicia: producto.franquicia?.nombre || producto.categoria?.nombre_categoria
                        }}
                        className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white flex items-center justify-center shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Value Props / Trust Badges */}
              <div className="grid grid-cols-2 gap-3 pt-6 border-t border-gray-100 text-xs">
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50/70">
                  <Truck className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-gray-900 block">Envío en 24-48h</span>
                    <span className="text-[11px] text-gray-500">A todo El Salvador</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50/70">
                  <ShieldCheck className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-gray-900 block">100% Original</span>
                    <span className="text-[11px] text-gray-500">Mercancía oficial con licencia</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50/70">
                  <CreditCard className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-gray-900 block">Pago Protegido</span>
                    <span className="text-[11px] text-gray-500">Tarjeta o contra entrega</span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50/70">
                  <RotateCcw className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <span className="font-bold text-gray-900 block">Garantía Nize</span>
                    <span className="text-[11px] text-gray-500">Retiro gratis en sucursales</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Specifications */}
            {producto.especificacion_producto?.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 mb-3">
                  Ficha Técnica & Especificaciones
                </h3>
                <dl className="grid grid-cols-2 gap-2 text-xs">
                  {producto.especificacion_producto.map((spec: any) => (
                    <div
                      key={spec.id_especificacion}
                      className="p-2.5 bg-gray-50 rounded-lg"
                    >
                      <dt className="text-gray-500 font-medium text-[11px]">{spec.atributo}</dt>
                      <dd className="text-gray-900 font-bold mt-0.5">{spec.valor}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div id="seccion-opiniones" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-red-600" />
              <span>Opiniones y Reseñas de Clientes</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Comentarios de compradores verificados que han adquirido este producto.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowReviewForm(!showReviewForm)}
            className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors"
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>{showReviewForm ? "Cerrar formulario" : "Escribir una opinión"}</span>
          </button>
        </div>

        {/* Rating Breakdown Banner */}
        <div className="py-6 flex flex-col sm:flex-row items-center gap-6 sm:gap-12 border-b border-gray-100">
          <div className="text-center sm:text-left">
            <span className="text-4xl font-black text-gray-900 tracking-tight">
              {averageRating.toFixed(1)}
            </span>
            <div className="flex items-center text-amber-400 justify-center sm:justify-start my-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    s <= Math.round(averageRating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-gray-200"
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-gray-400">Basado en {reviews.length} opiniones</p>
          </div>

          <div className="flex-1 w-full space-y-1.5 max-w-md">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = reviews.filter((r) => r.calificacion === stars).length;
              const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-3 text-xs">
                  <span className="w-7 text-right text-gray-600 font-medium">{stars} ★</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-gray-400 text-[11px]">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Write Review Form */}
        {showReviewForm && (
          <form onSubmit={handleSubmitReview} className="p-6 my-6 bg-red-50/40 border border-red-100 rounded-xl space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-bold text-gray-900">Tu opinión sobre este producto</h3>

            {reviewMsg && (
              <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                reviewMsg.type === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold"
                  : "bg-rose-50 text-rose-800 border border-rose-200 font-semibold"
              }`}>
                {reviewMsg.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                <span>{reviewMsg.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Calificación general *
              </label>
              <div className="flex items-center gap-1 text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onMouseEnter={() => setReviewHoverStar(s)}
                    onMouseLeave={() => setReviewHoverStar(0)}
                    onClick={() => setReviewRating(s)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        s <= (reviewHoverStar || reviewRating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-gray-700 ml-2">
                  {reviewRating} de 5 estrellas
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tu Nombre o Apodo *
                </label>
                <input
                  type="text"
                  placeholder="Ej: David L."
                  value={reviewName}
                  onChange={(e) => setReviewName(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Comentario / Reseña *
              </label>
              <textarea
                rows={3}
                placeholder="Cuéntanos qué te pareció la calidad, el empaque o la rapidez de entrega..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="text-xs text-gray-500 hover:text-gray-800 font-medium px-3 py-2"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                {submittingReview ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Publicando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publicar Opinión</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Reviews List */}
        <div className="pt-6 space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">
              Aún no hay opiniones para este producto. ¡Sé el primero en dejar una!
            </div>
          ) : (
            reviews.map((rev: any) => (
              <div
                key={rev.id_resena}
                className="p-4 bg-gray-50/70 border border-gray-100 rounded-xl space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-900">{rev.nombre_cliente}</span>
                    {rev.verificado && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded border border-emerald-200">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Comprador Verificado
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {new Date(rev.fecha_creacion).toLocaleDateString("es-SV", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                </div>

                <div className="flex items-center text-amber-400">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3.5 h-3.5 ${
                        s <= rev.calificacion
                          ? "fill-amber-400 text-amber-400"
                          : "text-gray-200"
                      }`}
                    />
                  ))}
                </div>

                <p className="text-xs text-gray-700 leading-relaxed">{rev.comentario}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cross-Selling: Related Products Section */}
      {relatedProducts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-600" />
                <span>También te podría interesar</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Productos recomendados de la misma franquicia o categoría
              </p>
            </div>
            <Link
              href="/"
              className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <span>Ver catálogo completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedProducts.map((rel: any) => {
              const relVariant = rel.producto_variante?.[0];
              const price = relVariant ? Number(relVariant.precio).toFixed(2) : "0.00";
              const img = relVariant?.url_imagen || rel.url_imagen;

              return (
                <Link
                  key={rel.id_producto}
                  href={`/producto/${rel.id_producto}`}
                  className="group block p-3 rounded-xl border border-gray-100 hover:border-red-200 hover:shadow-md transition-all duration-200 bg-white"
                >
                  <div className="aspect-square rounded-lg overflow-hidden bg-gray-50 mb-3">
                    <ProductImage
                      src={img}
                      alt={rel.nombre_producto}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-red-600 uppercase block truncate">
                    {rel.franquicia?.nombre || rel.categoria?.nombre_categoria}
                  </span>
                  <h4 className="text-xs font-bold text-gray-900 line-clamp-2 mt-0.5 group-hover:text-red-600 transition-colors">
                    {rel.nombre_producto}
                  </h4>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-sm font-black text-gray-900">${price}</span>
                    <span className="text-[10px] text-gray-400 group-hover:text-red-600 font-semibold transition-colors">
                      Ver detalle →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <Toast show={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
}
