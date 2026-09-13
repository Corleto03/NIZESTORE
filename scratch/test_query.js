const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testQuery(prodId) {
  const producto = await prisma.producto.findUnique({
    where: { id_producto: prodId },
    include: { categoria: true, franquicia: true }
  });

  let relatedProducts = await prisma.producto.findMany({
    where: {
      estado: "activo",
      id_producto: { not: prodId },
      OR: [
        ...(producto.id_franquicia ? [{ id_franquicia: producto.id_franquicia }] : []),
        { id_categoria: producto.id_categoria }
      ]
    },
    take: 4
  });

  if (relatedProducts.length < 4) {
    const excludeIds = [prodId, ...relatedProducts.map(p => p.id_producto)];
    const fallbackProducts = await prisma.producto.findMany({
      where: {
        estado: "activo",
        id_producto: { notIn: excludeIds }
      },
      take: 4 - relatedProducts.length
    });
    relatedProducts = [...relatedProducts, ...fallbackProducts];
  }

  console.log(`Related for product #${prodId} (${producto.nombre_producto}):`, relatedProducts.map(p => `#${p.id_producto} ${p.nombre_producto}`));
}

async function main() {
  await testQuery(1);
  await testQuery(2);
  await testQuery(3);
}

main().catch(console.error).finally(() => prisma.$disconnect());
