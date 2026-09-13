const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const func = await prisma.$queryRaw`
    SELECT routine_name, routine_definition 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_name LIKE '%totales%'
  `;
  console.log('Function:', func);
}

main().catch(console.error).finally(() => prisma.$disconnect());
