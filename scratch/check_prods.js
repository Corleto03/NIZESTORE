const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const prods = await prisma.producto.findMany({
    select: { id_producto: true, nombre_producto: true, id_categoria: true, id_franquicia: true, estado: true }
  });
  console.log('All products in database:', prods);
}

main().catch(console.error).finally(() => prisma.$disconnect());
