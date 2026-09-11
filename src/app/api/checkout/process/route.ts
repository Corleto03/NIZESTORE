import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCart } from "@/lib/cart";
import { getNowElSalvador } from "@/lib/date";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const {
      clienteData,
      id_metodo_envio,
      id_sucursal_retiro,
      id_metodo_pago,
      paymentDetails
    } = body;

    const cart = await getOrCreateCart();
    if (cart.detalle_carrito.length === 0) {
      return NextResponse.json({ message: "El carrito esta vacio" }, { status: 400 });
    }

    // 1. Resolve client
    let clienteId: number | null = null;
    if (session?.user && session.user.role === 'client') {
      clienteId = parseInt(session.user.id, 10);
    } else {
      // Guest client: strictly use provided checkout form data
      const guestEmail = (clienteData?.correo || "").trim().toLowerCase();
      let existing = await prisma.cliente.findUnique({
        where: { correo: guestEmail },
        include: { cliente_natural: true }
      });

      if (!existing) {
        existing = await prisma.cliente.create({
          data: {
            correo: guestEmail,
            password_hash: "GUEST_NO_PASSWORD",
            tipo_persona: "natural",
            estado: "activo",
            cliente_natural: {
              create: {
                nombres: (clienteData?.nombre || "Invitado").trim(),
                apellidos: "",
                id_tipo_documento: 1,
                numero_documento: Math.floor(10000000 + Math.random() * 90000000).toString()
              }
            }
          },
          include: { cliente_natural: true }
        });
      } else if (clienteData?.nombre && existing.cliente_natural) {
        await prisma.cliente_natural.update({
          where: { id_cliente: existing.id_cliente },
          data: { nombres: clienteData.nombre.trim() }
        });
      }
      clienteId = existing.id_cliente;
    }

    // 2. Resolve address if delivery
    let direccionId = null;
    if (!id_sucursal_retiro && clienteData.direccion) {
      const dir = await prisma.direccion.create({
        data: {
          id_cliente: clienteId,
          id_distrito: 1, // Default San Salvador
          tipo_direccion: "envio",
          direccion_detalle: clienteData.direccion
        }
      });
      direccionId = dir.id_direccion;
    }

    // 3. Process Payment Simulation
    const metodoPago = await prisma.metodo_pago.findUnique({ where: { id_metodo_pago } });
    const tipoMetodo = metodoPago?.tipo_metodo || "tarjeta";

    if (tipoMetodo === "tarjeta") {
      const cardNumber = (paymentDetails?.numero_tarjeta || "").replace(/\D/g, "");
      const lastDigit = parseInt(cardNumber.slice(-1) || "0", 10);
      const isApproved = lastDigit % 2 === 0;

      if (!isApproved) {
        // Declined
        const errorCat = await prisma.catalogo_error_pago.findFirst({
          where: { codigo: "CARD_DECLINED" }
        });

        const intento = await prisma.intento_pago.create({
          data: {
            id_carrito: cart.id_carrito,
            id_metodo_pago,
            monto: cart.total,
            estado: "fallido",
            proveedor_pasarela: "Simulador NizePay"
          }
        });

        if (errorCat) {
          await prisma.intento_pago_error.create({
            data: {
              id_intento_pago: intento.id_intento_pago,
              id_catalogo_error: errorCat.id_catalogo_error,
              codigo_respuesta: "51"
            }
          });
        }

        return NextResponse.json({
          success: false,
          error: errorCat ? errorCat.mensaje_cliente : "Tu tarjeta fue rechazada por el banco emisor."
        }, { status: 400 });
      }

      // Approved card payment
      await prisma.intento_pago.create({
        data: {
          id_carrito: cart.id_carrito,
          id_metodo_pago,
          monto: cart.total,
          estado: "exitoso",
          proveedor_pasarela: "Simulador NizePay"
        }
      });
    } else if (tipoMetodo === "transferencia") {
      // Pending confirmation
      await prisma.intento_pago.create({
        data: {
          id_carrito: cart.id_carrito,
          id_metodo_pago,
          monto: cart.total,
          estado: "fallido",
          proveedor_pasarela: "Transferencia - Ref: " + (paymentDetails?.referencia || "SIN_REF")
        }
      });
    }

    // 4. Create Pedido + Detalle Pedido
    const orderStatus = (tipoMetodo === "tarjeta") ? "pagado" : "pendiente";

    const pedido = await prisma.pedido.create({
      data: {
        id_cliente: clienteId,
        id_carrito: cart.id_carrito,
        id_metodo_pago,
        id_metodo_envio,
        id_direccion_envio: direccionId,
        id_sucursal_retiro: id_sucursal_retiro || null,
        subtotal: cart.subtotal,
        descuento: cart.descuento,
        costo_envio: cart.costo_envio,
        total: cart.total,
        estado_pedido: orderStatus,
        fecha_pedido: getNowElSalvador(),
        detalle_pedido: {
          create: cart.detalle_carrito.map((item) => ({
            id_variante: item.id_variante,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario,
            subtotal: item.subtotal
          }))
        }
      }
    });

    // 5. Invoke sp_generar_factura
    const branchForInvoice = id_sucursal_retiro || 1;
    try {
      await prisma.$executeRawUnsafe(
        "CALL sp_generar_factura($1::bigint, $2::varchar, $3::varchar, $4::int)",
        pedido.id_pedido,
        "factura",
        "FAC",
        branchForInvoice
      );
    } catch (e) {
      console.warn("Could not generate invoice automatically via procedure:", e);
    }

    // 6. Update cart status
    await prisma.carrito.update({
      where: { id_carrito: cart.id_carrito },
      data: { estado_carrito: "convertido" }
    });

    // 7. Mark checkout stages complete
    await prisma.etapa_checkout.create({
      data: {
        id_carrito: cart.id_carrito,
        etapa: "confirmacion",
        completada: true
      }
    });

    return NextResponse.json({
      success: true,
      id_pedido: Number(pedido.id_pedido)
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error procesando el pedido" }, { status: 500 });
  }
}
