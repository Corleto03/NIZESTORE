const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    try {
        const correo = 'admin@nizestore.com';
        const rawPassword = 'admin'; // Temporary password
        
        // Check if admin already exists
        const existingAdmin = await prisma.administrador.findUnique({
            where: { correo }
        });

        if (existingAdmin) {
            console.log(`El usuario administrador con correo '${correo}' ya existe.`);
            return;
        }

        const password_hash = await bcrypt.hash(rawPassword, 10);

        const newAdmin = await prisma.administrador.create({
            data: {
                nombre: 'Administrador Principal',
                correo: correo,
                password_hash: password_hash,
                activo: true
            }
        });

        console.log('¡Usuario administrador creado con éxito!');
        console.log(`Correo: ${correo}`);
        console.log(`Contraseña: ${rawPassword}`);
    } catch (error) {
        console.error('Error al crear el administrador:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
