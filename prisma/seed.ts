import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // 1. Admin
  const adminPass = await bcrypt.hash('admin123', 10);
  await prisma.administrador.upsert({
    where: { correo: 'admin@nizestore.com' },
    update: {},
    create: {
      nombre: 'Admin Principal',
      correo: 'admin@nizestore.com',
      password_hash: adminPass,
      activo: true
    }
  });

  // 2. Clientes
  const clientPass = await bcrypt.hash('cliente123', 10);
  await prisma.cliente.upsert({
    where: { correo: 'juan.perez@gmail.com' },
    update: {},
    create: {
      correo: 'juan.perez@gmail.com',
      password_hash: clientPass,
      tipo_persona: 'natural',
      estado: 'activo',
      cliente_natural: {
        create: {
          nombres: 'Juan Carlos',
          apellidos: 'Pérez',
          id_tipo_documento: 1, // DUI
          numero_documento: '01234567-8'
        }
      }
    }
  });

  await prisma.cliente.upsert({
    where: { correo: 'contacto@otakucafe.sv' },
    update: {},
    create: {
      correo: 'contacto@otakucafe.sv',
      password_hash: clientPass,
      tipo_persona: 'juridica',
      estado: 'activo',
      cliente_juridico: {
        create: {
          razon_social: 'Otaku Café S.A. de C.V.',
          nombre_comercial: 'Otaku Café',
          nit: '0614-010120-101-1'
        }
      }
    }
  });

  // 3. Categorías
  const catManga = await prisma.categoria.upsert({
    where: { nombre_categoria: 'Manga' },
    update: {},
    create: { nombre_categoria: 'Manga', descripcion: 'Mangas en español e importados' }
  });
  const catFiguras = await prisma.categoria.upsert({
    where: { nombre_categoria: 'Figuras' },
    update: {},
    create: { nombre_categoria: 'Figuras', descripcion: 'Figuras coleccionables oficiales' }
  });
  const catRopa = await prisma.categoria.upsert({
    where: { nombre_categoria: 'Ropa' },
    update: {},
    create: { nombre_categoria: 'Ropa', descripcion: 'Camisetas, hoodies y accesorios' }
  });

  // 4. Franquicias
  const fOnePiece = await prisma.franquicia.upsert({
    where: { nombre: 'One Piece' },
    update: {},
    create: { nombre: 'One Piece', tipo: 'anime' }
  });
  const fJJK = await prisma.franquicia.upsert({
    where: { nombre: 'Jujutsu Kaisen' },
    update: {},
    create: { nombre: 'Jujutsu Kaisen', tipo: 'anime' }
  });

  // 5. Políticas de envío
  await prisma.politica_envio.create({
    data: {
      monto_minimo: 35.00,
      costo_envio: 3.50,
      fecha_inicio: new Date(),
      estado: 'activa'
    }
  });

  // 6. Promociones
  await prisma.promocion.upsert({
    where: { codigo: 'NIZE10' },
    update: {},
    create: {
      codigo: 'NIZE10',
      nombre: '10% de descuento en tu compra',
      tipo_descuento: 'porcentaje',
      valor_descuento: 10,
      fecha_inicio: new Date(),
      fecha_fin: new Date(Date.now() + 30*24*60*60*1000),
      estado: 'activa'
    }
  });

  // 7. Productos con Variantes
  await prisma.producto.create({
    data: {
      nombre_producto: 'One Piece Vol. 100',
      id_categoria: catManga.id_categoria,
      id_franquicia: fOnePiece.id_franquicia,
      url_imagen: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600',
      producto_variante: {
        create: [
          { sku: 'OP-VOL-100', precio: 12.50, costo: 7.00, stock_disponible: 25 }
        ]
      }
    }
  });

  await prisma.producto.create({
    data: {
      nombre_producto: 'Camiseta Gojo Satoru Unlimited Void',
      id_categoria: catRopa.id_categoria,
      id_franquicia: fJJK.id_franquicia,
      url_imagen: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600',
      producto_variante: {
        create: [
          {
            sku: 'TS-GOJO-BLK-M',
            precio: 22.00,
            costo: 10.00,
            stock_disponible: 15,
            url_imagen: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600',
            variante_apariencia: {
              create: { talla: 'M', color: 'Negro' }
            }
          },
          {
            sku: 'TS-GOJO-WHT-L',
            precio: 22.00,
            costo: 10.00,
            stock_disponible: 8,
            url_imagen: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=600',
            variante_apariencia: {
              create: { talla: 'L', color: 'Blanco' }
            }
          }
        ]
      }
    }
  });

  await prisma.producto.create({
    data: {
      nombre_producto: 'Figura Megumi Fushiguro ArtFX J',
      id_categoria: catFiguras.id_categoria,
      id_franquicia: fJJK.id_franquicia,
      url_imagen: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600',
      producto_variante: {
        create: [
          { sku: 'FIG-MEGUMI-STD', precio: 85.00, costo: 50.00, stock_disponible: 5 }
        ]
      }
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
