"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Building2, Truck, CreditCard, ArrowRight, ArrowLeft, Tag } from "lucide-react";
import FreeShippingBar from "@/components/cart/FreeShippingBar";
import Link from "next/link";

export default function CheckoutPage() {
  const { cart, isLoading, refreshCart } = useCart();
  const { data: session } = useSession();
  const router = useRouter();

  // Wizard state: 1 = Direccion, 2 = Metodo Envio, 3 = Metodo Pago
  const [step, setStep] = useState(1);

  // Form states
  const [nombre, setNombre] = useState(session?.user?.name || "");
  const [correo, setCorreo] = useState(session?.user?.email || "");
  const [direccion, setDireccion] = useState("");

  const [metodoEnvio, setMetodoEnvio] = useState("domicilio"); // 'domicilio' | 'sucursal'
  const [idSucursal, setIdSucursal] = useState<number | null>(null);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [loadingSucursales, setLoadingSucursales] = useState(false);

  const [idMetodoPago, setIdMetodoPago] = useState<number>(1); // 1 = Tarjeta, 2 = Transferencia, 3 = Contra entrega
  const [numeroTarjeta, setNumeroTarjeta] = useState("");
  const [vencimiento, setVencimiento] = useState("");
  const [cvv, setCvv] = useState("");
  const [referencia, setReferencia] = useState("");

  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState("");

  const handleApplyCouponCheckout = async () => {
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    setCouponError("");
    try {
      const res = await fetch("/api/cart/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo: couponInput.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCouponError(data.message || "Cupón inválido");
      } else {
        setCouponInput("");
        await refreshCart();
      }
    } catch {
      setCouponError("Error al aplicar cupón");
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Record checkout stages
  const recordStage = async (etapa: string, completada: boolean = false) => {
    try {
      await fetch("/api/checkout/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etapa, completada })
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    recordStage("direccion_envio", false);
  }, []);

  // Fetch sucursales when switching to step 2 or choosing sucursal
  useEffect(() => {
    if (metodoEnvio === "sucursal") {
      setLoadingSucursales(true);
      fetch("/api/checkout/sucursales")
        .then((res) => res.json())
        .then((data) => {
          setSucursales(data);
          const available = data.find((s: any) => s.tiene_stock);
          if (available) setIdSucursal(available.id_sucursal);
        })
        .finally(() => setLoadingSucursales(false));
    }
  }, [metodoEnvio]);

  // Handle step progression
  const handleNextToStep2 = () => {
    if (!correo || !nombre) {
      setErrorMsg("Por favor completa tu nombre y correo");
      return;
    }
    if (metodoEnvio === "domicilio" && !direccion) {
      setErrorMsg("Por favor ingresa la dirección de entrega");
      return;
    }
    setErrorMsg("");
    recordStage("direccion_envio", true);
    recordStage("metodo_envio", false);
    setStep(2);
  };

  const handleNextToStep3 = () => {
    if (metodoEnvio === "sucursal" && !idSucursal) {
      setErrorMsg("Por favor selecciona una sucursal con stock disponible");
      return;
    }
    setErrorMsg("");
    recordStage("metodo_envio", true);
    recordStage("metodo_pago", false);
    setStep(3);
  };

  // Process checkout
  const handleProcessOrder = async () => {
    setErrorMsg("");
    setProcessing(true);

    try {
      const res = await fetch("/api/checkout/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteData: { nombre, correo, direccion },
          id_metodo_envio: metodoEnvio === "domicilio" ? 1 : 2,
          id_sucursal_retiro: metodoEnvio === "sucursal" ? idSucursal : null,
          id_metodo_pago: idMetodoPago,
          paymentDetails: {
            numero_tarjeta: numeroTarjeta,
            vencimiento,
            cvv,
            referencia
          }
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || data.message || "Error procesando el pedido");
        return;
      }

      await refreshCart();
      router.push(`/pedido/${data.id_pedido}/exito`);
    } catch (e: any) {
      setErrorMsg(e.message || "Error inesperado");
    } finally {
      setProcessing(false);
    }
  };

  if (isLoading) return <div className="text-center py-20">Cargando checkout...</div>;

  const items = cart?.detalle_carrito || [];
  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">No hay productos para pagar</h2>
        <p className="text-gray-500 mb-6">Tu carrito está vacío.</p>
        <Link href="/" className="inline-flex items-center bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors">
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Wizard Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Stepper Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className={`flex items-center space-x-2 ${step >= 1 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
            <span className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm">1</span>
            <span>Dirección</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-200" />
          <div className={`flex items-center space-x-2 ${step >= 2 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
            <span className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm">2</span>
            <span>Envío</span>
          </div>
          <div className="w-12 h-0.5 bg-gray-200" />
          <div className={`flex items-center space-x-2 ${step >= 3 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
            <span className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm">3</span>
            <span>Pago</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: DIRECCIÓN */}
        {step === 1 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Datos de Envío y Contacto</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre completo</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1 w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                placeholder="Juan Pérez"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Correo electrónico</label>
              <input
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                className="mt-1 w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                placeholder="juan@ejemplo.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Dirección completa</label>
              <textarea
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="mt-1 w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                rows={3}
                placeholder="Colonia, Calle, Número de casa o referencia..."
              />
            </div>
            <button
              onClick={handleNextToStep2}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 flex items-center justify-center space-x-2 transition-colors mt-4"
            >
              <span>Continuar a Método de Envío</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: MÉTODO DE ENVÍO */}
        {step === 2 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Selecciona el Método de Envío</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${metodoEnvio === 'domicilio' ? 'border-red-600 bg-red-50/30' : 'border-gray-200'}`}>
                <input
                  type="radio"
                  name="metodoEnvio"
                  value="domicilio"
                  checked={metodoEnvio === "domicilio"}
                  onChange={() => setMetodoEnvio("domicilio")}
                  className="mt-1 text-red-600 focus:ring-red-500"
                />
                <div className="ml-3">
                  <div className="flex items-center space-x-2">
                    <Truck className="w-5 h-5 text-gray-700" />
                    <span className="font-semibold text-gray-900">Envío a Domicilio</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Entrega estimada: 2-3 días hábiles</p>
                  <p className="text-sm font-bold text-gray-900 mt-2">$3.50 (Gratis compras $35+)</p>
                </div>
              </label>

              <label className={`flex items-start p-4 border rounded-xl cursor-pointer transition-all ${metodoEnvio === 'sucursal' ? 'border-red-600 bg-red-50/30' : 'border-gray-200'}`}>
                <input
                  type="radio"
                  name="metodoEnvio"
                  value="sucursal"
                  checked={metodoEnvio === "sucursal"}
                  onChange={() => setMetodoEnvio("sucursal")}
                  className="mt-1 text-red-600 focus:ring-red-500"
                />
                <div className="ml-3">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-gray-700" />
                    <span className="font-semibold text-gray-900">Retiro en Sucursal</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Disponible en sucursales autorizadas</p>
                  <p className="text-sm font-bold text-green-600 mt-2">¡Completamente Gratis!</p>
                </div>
              </label>
            </div>

            {/* SUCURSAL SELECTOR (Visible only if Retiro en Sucursal) */}
            {metodoEnvio === "sucursal" && (
              <div className="border-t pt-6 space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Sucursales Disponibles</h3>
                {loadingSucursales ? (
                  <p className="text-sm text-gray-500">Consultando disponibilidad de stock en sucursales...</p>
                ) : (
                  <div className="space-y-3">
                    {sucursales.map((suc) => (
                      <label
                        key={suc.id_sucursal}
                        className={`flex items-start justify-between p-3.5 border rounded-lg transition-all ${
                          !suc.tiene_stock
                            ? 'opacity-50 cursor-not-allowed bg-gray-50'
                            : idSucursal === suc.id_sucursal
                            ? 'border-red-600 bg-red-50'
                            : 'hover:border-gray-300 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start">
                          <input
                            type="radio"
                            name="sucursal"
                            disabled={!suc.tiene_stock}
                            checked={idSucursal === suc.id_sucursal}
                            onChange={() => setIdSucursal(suc.id_sucursal)}
                            className="mt-1 text-red-600"
                          />
                          <div className="ml-3">
                            <p className="font-medium text-gray-900">{suc.nombre}</p>
                            <p className="text-xs text-gray-500">{suc.direccion_detalle}</p>
                          </div>
                        </div>
                        <div>
                          {suc.tiene_stock ? (
                            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">Stock Disponible</span>
                          ) : (
                            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">Sin Stock</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex space-x-4 pt-4 border-t">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 border border-gray-300 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <button
                onClick={handleNextToStep3}
                className="w-2/3 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 flex items-center justify-center space-x-2 transition-colors"
              >
                <span>Continuar al Pago</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: MÉTODO DE PAGO */}
        {step === 3 && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-lg font-bold text-gray-900">Método de Pago</h2>

            <div className="space-y-4">
              {/* Opción 1: Tarjeta */}
              <div className={`p-4 border rounded-xl ${idMetodoPago === 1 ? 'border-red-600 bg-red-50/20' : 'border-gray-200'}`}>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="metodoPago"
                    checked={idMetodoPago === 1}
                    onChange={() => setIdMetodoPago(1)}
                    className="text-red-600"
                  />
                  <span className="ml-3 font-semibold text-gray-900">Tarjeta de Crédito / Débito</span>
                </label>

                {idMetodoPago === 1 && (
                  <div className="mt-4 space-y-3 pt-3 border-t">
                    <p className="text-xs text-red-600 font-medium">
                      * Demo de pagos: Termina en número PAR = Aprobada | IMPAR = Rechazada
                    </p>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Número de Tarjeta (16 dígitos)</label>
                      <input
                        type="text"
                        maxLength={19}
                        placeholder="4111 2222 3333 4444"
                        value={numeroTarjeta}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim();
                          setNumeroTarjeta(val);
                        }}
                        className="mt-1 w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Vencimiento (MM/AA)</label>
                        <input
                          type="text"
                          maxLength={5}
                          placeholder="12/28"
                          value={vencimiento}
                          onChange={(e) => setVencimiento(e.target.value)}
                          className="mt-1 w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">CVV (3 dígitos)</label>
                        <input
                          type="password"
                          maxLength={3}
                          placeholder="123"
                          value={cvv}
                          onChange={(e) => setCvv(e.target.value)}
                          className="mt-1 w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Opción 2: Transferencia Bancaria */}
              <div className={`p-4 border rounded-xl ${idMetodoPago === 2 ? 'border-red-600 bg-red-50/20' : 'border-gray-200'}`}>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="metodoPago"
                    checked={idMetodoPago === 2}
                    onChange={() => setIdMetodoPago(2)}
                    className="text-red-600"
                  />
                  <span className="ml-3 font-semibold text-gray-900">Transferencia Bancaria</span>
                </label>

                {idMetodoPago === 2 && (
                  <div className="mt-4 space-y-3 pt-3 border-t text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg text-gray-700">
                      <p className="font-semibold text-gray-900">NizeStore S.A. de C.V.</p>
                      <p>Banco Agrícola: Cta. Corriente # 00300-123456-7</p>
                      <p className="text-xs text-gray-500 mt-1">El pedido quedará en estado &quot;pendiente de confirmación&quot; hasta que el administrador verifique el depósito.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700">Número de Referencia Bancaria</label>
                      <input
                        type="text"
                        placeholder="Ej. REF-987654321"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        className="mt-1 w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Opción 3: Contra Entrega */}
              <div className={`p-4 border rounded-xl ${idMetodoPago === 3 ? 'border-red-600 bg-red-50/20' : 'border-gray-200'}`}>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="metodoPago"
                    checked={idMetodoPago === 3}
                    onChange={() => setIdMetodoPago(3)}
                    className="text-red-600"
                  />
                  <span className="ml-3 font-semibold text-gray-900">Pago Contra Entrega</span>
                </label>
                {idMetodoPago === 3 && (
                  <p className="mt-2 text-xs text-gray-500 ml-6">
                    Pagas en efectivo al momento de recibir tu paquete. El pedido quedará en estado &quot;pendiente&quot;.
                  </p>
                )}
              </div>
            </div>

            <div className="flex space-x-4 pt-4 border-t">
              <button
                onClick={() => setStep(2)}
                className="w-1/3 border border-gray-300 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-center space-x-1"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
              <button
                onClick={handleProcessOrder}
                disabled={processing}
                className="w-2/3 bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center space-x-2 transition-colors"
              >
                <span>{processing ? "Procesando orden..." : "Confirmar y Realizar Pedido"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Cart Summary Column */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 h-fit space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Resumen del Pedido</h2>
        
        <FreeShippingBar subtotal={Number(cart?.subtotal || 0)} />

        <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id_detalle_carrito} className="py-2.5 flex justify-between text-sm">
              <div>
                <p className="font-medium text-gray-900">{item.producto_variante.producto.nombre_producto}</p>
                <p className="text-xs text-gray-500">Cant: {item.cantidad}</p>
              </div>
              <p className="font-semibold text-gray-900">
                ${(Number(item.precio_unitario) * item.cantidad).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        {/* Coupon code box in Checkout */}
        <div className="border-t pt-3 pb-1">
          {Number(cart?.descuento || 0) > 0 ? (
            <div className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
              <span className="text-emerald-800 font-semibold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Cupón aplicado (-${Number(cart?.descuento || 0).toFixed(2)})
              </span>
              <button
                type="button"
                onClick={async () => {
                  await fetch("/api/cart/coupon", { method: "DELETE" });
                  await refreshCart();
                }}
                className="text-rose-600 font-bold hover:underline"
              >
                Quitar
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cupón (ej: NIZE10)"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCouponCheckout())}
                  className="flex-1 text-xs border border-gray-300 rounded px-2.5 py-1.5 uppercase outline-none focus:border-red-500 font-medium"
                />
                <button
                  type="button"
                  onClick={handleApplyCouponCheckout}
                  disabled={applyingCoupon || !couponInput.trim()}
                  className="bg-gray-900 hover:bg-black text-white text-xs px-3 py-1.5 rounded font-medium disabled:opacity-50"
                >
                  {applyingCoupon ? "..." : "Aplicar"}
                </button>
              </div>
              {couponError && <p className="text-[11px] text-rose-600">{couponError}</p>}
            </div>
          )}
        </div>

        <div className="space-y-2 border-t pt-4 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${Number(cart?.subtotal || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Descuento</span>
            <span>-${Number(cart?.descuento || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Envío</span>
            <span>${metodoEnvio === 'sucursal' ? '0.00' : Number(cart?.costo_envio || 0).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-2">
            <span>Total a pagar</span>
            <span>${(Number(cart?.total || 0) - (metodoEnvio === 'sucursal' ? Number(cart?.costo_envio || 0) : 0)).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
