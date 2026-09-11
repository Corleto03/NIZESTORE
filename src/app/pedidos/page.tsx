"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatDateElSalvador } from "@/lib/date";
import { Package, Truck, CheckCircle, FileText, AlertCircle, Clock, Store } from "lucide-react";
import Link from "next/link";

export default function MisPedidosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const fetchPedidos = async () => {
    try {
      const res = await fetch("/api/pedidos");
      if (res.ok) {
        const data = await res.json();
        setPedidos(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchPedidos();
    }
  }, [status]);

  const handleConfirmDelivery = async (idPedido: number) => {
    setActionLoading(idPedido);
    try {
      const res = await fetch(`/api/pedidos/${idPedido}/confirmar-entrega`, {
        method: "PATCH"
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`✓ Entrega del pedido #${idPedido} confirmada con éxito`);
        setTimeout(() => setMsg(""), 4000);
        await fetchPedidos();
      } else {
        alert(data.message || "Error al confirmar entrega");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading || status === "loading") {
    return <div className="text-center py-20 text-gray-500">Cargando tus pedidos...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mis Pedidos</h1>
        <span className="text-sm text-gray-500">{pedidos.length} pedidos realizados</span>
      </div>

      {msg && (
        <div className="p-3.5 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg font-medium">
          {msg}
        </div>
      )}

      {pedidos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-1">Aún no has realizado pedidos</h2>
          <p className="text-gray-500 mb-6">Explora nuestro catálogo y realiza tu primera compra.</p>
          <Link href="/" className="inline-flex items-center bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors">
            Ir a comprar
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {pedidos.map((ped) => {
            const isEnviado = ped.estado_pedido === "enviado";

            return (
              <div key={ped.id_pedido} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <span className="text-xs text-gray-400 font-mono">PEDIDO #{ped.id_pedido}</span>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {formatDateElSalvador(ped.fecha_pedido)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md font-medium capitalize bg-zinc-100 text-zinc-800">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        ped.estado_pedido === 'pagado' ? 'bg-emerald-500' :
                        ped.estado_pedido === 'enviado' ? 'bg-blue-500' :
                        ped.estado_pedido === 'entregado' ? 'bg-zinc-500' :
                        ped.estado_pedido === 'cancelado' ? 'bg-red-500' :
                        'bg-amber-500 animate-pulse'
                      }`} />
                      {ped.estado_pedido}
                    </span>

                    {/* Button ONLY visible if estado_pedido === 'enviado' */}
                    {isEnviado && (
                      <button
                        onClick={() => handleConfirmDelivery(ped.id_pedido)}
                        disabled={actionLoading === ped.id_pedido}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-100" />
                        <span>{actionLoading === ped.id_pedido ? "Confirmando..." : "Ya recibí mi pedido"}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-50">
                  {ped.detalle_pedido.map((item: any) => (
                    <div key={item.id_detalle_pedido} className="py-2.5 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{item.producto_variante.producto.nombre_producto}</p>
                        <p className="text-xs text-gray-500">
                          SKU: {item.producto_variante.sku} | Cantidad: {item.cantidad}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900">${Number(item.subtotal).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {/* Footer details */}
                <div className="flex flex-wrap items-center justify-between pt-3 border-t text-xs text-gray-500 gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>Pago: <strong className="text-gray-900">{ped.metodo_pago?.nombre || "N/A"}</strong></span>
                    {ped.id_sucursal_retiro ? (
                      <span className="inline-flex items-center gap-1 text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded font-medium">
                        <Store className="w-3.5 h-3.5 text-zinc-500" />
                        Retiro en {ped.sucursal?.nombre || "Sucursal"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-zinc-700 bg-zinc-100 px-2 py-0.5 rounded font-medium">
                        <Truck className="w-3.5 h-3.5 text-zinc-500" />
                        Envío a Domicilio
                      </span>
                    )}
                    {ped.factura && (
                      <span className="inline-flex items-center font-mono font-medium text-zinc-800 bg-zinc-100 px-2 py-0.5 rounded text-[11px]">
                        <FileText className="w-3.5 h-3.5 mr-1 text-zinc-500" />
                        FAC-{ped.factura.numero_documento}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    Total: ${Number(ped.total).toFixed(2)}
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
