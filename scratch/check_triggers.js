const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const triggers = await prisma.$queryRaw`
    SELECT event_object_table, trigger_name 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
  `;
  console.log('Triggers:', triggers);
}

main().catch(console.error).finally(() => prisma.$disconnect());
