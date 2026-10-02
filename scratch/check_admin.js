const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const admins = await prisma.administrador.findMany();
        console.log(JSON.stringify(admins, null, 2));
    } catch (error) {
        if (error.message.includes('does not exist')) {
            console.log('TABLE_MISSING');
        } else {
            console.error('Error:', error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
