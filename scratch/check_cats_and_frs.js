const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.categoria.findMany();
  const frs = await prisma.franquicia.findMany();
  console.log('Categorías:', cats);
  console.log('Franquicias:', frs);
}

main().catch(console.error).finally(() => prisma.$disconnect());
