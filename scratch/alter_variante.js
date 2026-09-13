const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Adding column descripcion_variante to producto_variante...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE producto_variante 
    ADD COLUMN IF NOT EXISTS descripcion_variante TEXT;
  `);
  console.log("Column descripcion_variante added or already exists.");

  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'producto_variante' AND column_name = 'descripcion_variante';
  `);
  console.log("Verified column in DB:", cols);
}

main().catch(console.error).finally(() => prisma.$disconnect());
