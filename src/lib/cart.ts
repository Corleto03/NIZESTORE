import { prisma } from './prisma';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

export async function getOrCreateCart() {
  const session = await getServerSession(authOptions);
  const cookieStore = cookies();
  let deviceId = cookieStore.get('nizestore_device_id')?.value;

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    try {
      cookieStore.set('nizestore_device_id', deviceId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        httpOnly: true,
        sameSite: 'lax',
      });
    } catch {
      // ignore if called in read-only RSC
    }
  }

  let clienteId: number | null = null;
  if (session?.user && session.user.role === 'client') {
    clienteId = parseInt(session.user.id, 10);
  }

  // Find or create session strictly
  let userSession = await prisma.sesion.findFirst({
    where: clienteId
      ? { id_cliente: clienteId }
      : { id_dispositivo: deviceId, id_cliente: null },
    orderBy: { fecha_inicio: 'desc' }
  });

  if (!userSession) {
    userSession = await prisma.sesion.create({
      data: {
        id_cliente: clienteId,
        id_dispositivo: deviceId,
        dispositivo: 'computadora'
      }
    });
  }

  // Find an active cart strictly
  let cart = await prisma.carrito.findFirst({
    where: {
      estado_carrito: 'activo',
      ...(clienteId
        ? { id_cliente: clienteId }
        : { id_sesion: userSession.id_sesion, id_cliente: null })
    },
    include: {
      promocion: true,
      detalle_carrito: {
        include: {
          producto_variante: {
            include: {
              producto: true,
              variante_apariencia: true
            }
          }
        }
      }
    }
  });

  if (!cart) {
    cart = await prisma.carrito.create({
      data: {
        id_cliente: clienteId,
        id_sesion: userSession.id_sesion,
        estado_carrito: 'activo'
      },
      include: {
        promocion: true,
        detalle_carrito: {
          include: {
            producto_variante: {
              include: {
                producto: true,
                variante_apariencia: true
              }
            }
          }
        }
      }
    });
  }

  return cart!;
}
