const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating table resena_producto...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS resena_producto (
      id_resena SERIAL PRIMARY KEY,
      id_producto INT NOT NULL REFERENCES producto(id_producto) ON DELETE CASCADE,
      nombre_cliente VARCHAR(100) NOT NULL,
      calificacion INT NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
      comentario TEXT NOT NULL,
      fecha_creacion TIMESTAMP(6) NOT NULL DEFAULT NOW(),
      verificado BOOLEAN NOT NULL DEFAULT true
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_resena_producto ON resena_producto(id_producto);
  `);
  console.log('Table resena_producto verified/created.');

  // Seed sample reviews if empty
  const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as c FROM resena_producto;`);
  if (count[0].c === 0) {
    console.log('Seeding initial reviews for active products...');
    const products = await prisma.producto.findMany({
      where: { estado: 'activo' },
      take: 5
    });

    const sampleReviews = [
      {
        nombre: 'Carlos Mendoza',
        calificacion: 5,
        comentario: '¡Increíble calidad! Llegó súper rápido a San Salvador y viene 100% original con sus sellos. Muy recomendado.'
      },
      {
        nombre: 'Sofía R.',
        calificacion: 5,
        comentario: 'Excelente producto y la atención al cliente de 10. Ya es la tercera vez que compro en NizeStore y nunca decepciona.'
      },
      {
        nombre: 'Alejandro G.',
        calificacion: 4,
        comentario: 'Muy buen material y acabados. La entrega tardó un día más por la lluvia, pero todo en perfecto estado.'
      }
    ];

    for (const prod of products) {
      for (const rev of sampleReviews) {
        await prisma.$executeRawUnsafe(
          `INSERT INTO resena_producto (id_producto, nombre_cliente, calificacion, comentario, verificado)
           VALUES ($1, $2, $3, $4, true)`,
          prod.id_producto, rev.nombre, rev.calificacion, rev.comentario
        );
      }
    }
    console.log(`Seeded reviews for ${products.length} products.`);
  } else {
    console.log(`Table already has ${count[0].c} reviews.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
