import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CheckCircle, Package, FileText, ArrowRight } from "lucide-react";
import { notFound } from "next/navigation";

export default async function OrderSuccessPage({ params }: { params: { id: string } }) {
  const idPedido = parseInt(params.id, 10);
  if (isNaN(idPedido)) return notFound();

  const pedido = await prisma.pedido.findUnique({
    where: { id_pedido: BigInt(idPedido) },
    include: {
      detalle_pedido: {
        include: {
          producto_variante: {
            include: {
              producto: true,
              variante_apariencia: true
            }
          }
        }
      },
      metodo_pago: true,
      metodo_envio: true,
      sucursal: true,
      factura: true
    }
  });

  if (!pedido) return notFound();

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-10 h-10 text-green-600" />
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">¡Gracias por tu compra!</h1>
      <p className="text-gray-500 mb-6">
        Tu pedido <span className="font-semibold text-gray-900">#{Number(pedido.id_pedido)}</span> ha sido procesado exitosamente.
      </p>

      <div className="p-4 bg-gray-50 rounded-lg text-left text-sm space-y-2 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-600">Estado del Pedido:</span>
          <span className="font-semibold uppercase text-red-600">{pedido.estado_pedido}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Método de Pago:</span>
          <span className="font-medium text-gray-900">{pedido.metodo_pago?.nombre_metodo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Método de Envío:</span>
          <span className="font-medium text-gray-900">
            {pedido.sucursal ? `Retiro en ${pedido.sucursal.nombre}` : pedido.metodo_envio?.nombre_metodo}
          </span>
        </div>
        {pedido.factura && (
          <div className="flex justify-between pt-2 border-t">
            <span className="text-gray-600 flex items-center">
              <FileText className="w-4 h-4 mr-1 text-gray-400" /> Factura Electrónica:
            </span>
            <span className="font-bold text-gray-900">{pedido.factura.numero_documento}</span>
          </div>
        )}
      </div>

      <div className="border-t pt-4 text-left mb-6">
        <h3 className="font-bold text-gray-900 mb-3 text-sm">Artículos del Pedido</h3>
        <div className="space-y-3">
          {pedido.detalle_pedido.map((item) => (
            <div key={Number(item.id_detalle_pedido)} className="flex justify-between text-sm">
              <div>
                <p className="font-medium text-gray-800">{item.producto_variante.producto.nombre_producto}</p>
                <p className="text-xs text-gray-500">
                  {item.producto_variante.sku} - Cantidad: {item.cantidad}
                </p>
              </div>
              <p className="font-semibold text-gray-900">
                ${Number(item.subtotal).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex justify-between font-bold text-base text-gray-900 pt-3 border-t mt-3">
          <span>Total Pagado</span>
          <span>${Number(pedido.total).toFixed(2)}</span>
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        <Link
          href="/"
          className="bg-red-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-red-700 transition-colors inline-flex items-center space-x-2 text-sm"
        >
          <span>Seguir comprando</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/pedidos"
          className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors inline-flex items-center space-x-2 text-sm"
        >
          <Package className="w-4 h-4" />
          <span>Ver mis pedidos</span>
        </Link>
      </div>
    </div>
  );
}
