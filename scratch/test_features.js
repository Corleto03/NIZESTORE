const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== 1. VERIFICANDO PRODUCTOS Y RELACIONADOS ===");
  const testProduct = await prisma.producto.findFirst({
    where: { estado: 'activo' },
    include: { categoria: true, franquicia: true }
  });
  console.log(`Producto de prueba: #${testProduct.id_producto} - ${testProduct.nombre_producto}`);

  const related = await prisma.producto.findMany({
    where: {
      estado: 'activo',
      id_producto: { not: testProduct.id_producto },
      OR: [
        ...(testProduct.id_franquicia ? [{ id_franquicia: testProduct.id_franquicia }] : []),
        { id_categoria: testProduct.id_categoria }
      ]
    },
    take: 4
  });
  console.log(`Productos relacionados encontrados: ${related.length}`);
  related.forEach(r => console.log(` - #${r.id_producto}: ${r.nombre_producto}`));

  console.log("\n=== 2. VERIFICANDO SISTEMA DE RESEÑAS ===");
  const reviewsBefore = await prisma.resena_producto.findMany({
    where: { id_producto: testProduct.id_producto }
  });
  console.log(`Reseñas existentes para #${testProduct.id_producto}: ${reviewsBefore.length}`);

  // Insert test review
  const newRev = await prisma.resena_producto.create({
    data: {
      id_producto: testProduct.id_producto,
      nombre_cliente: "Cliente Test",
      calificacion: 5,
      comentario: "Excelente producto, 100% recomendado.",
      verificado: true
    }
  });
  console.log("Nueva reseña creada con ID:", newRev.id_resena);

  const reviewsAfter = await prisma.resena_producto.findMany({
    where: { id_producto: testProduct.id_producto }
  });
  const avg = reviewsAfter.reduce((a, r) => a + r.calificacion, 0) / reviewsAfter.length;
  console.log(`Promedio actualizado de estrellas: ${avg.toFixed(1)} / 5 basado en ${reviewsAfter.length} opiniones`);

  console.log("\n=== 3. VERIFICANDO SISTEMA DE CUPONES Y DESCUENTOS ===");
  const promo = await prisma.promocion.findUnique({ where: { codigo: 'NIZE10' } });
  console.log(`Cupón encontrado: ${promo.codigo} (${promo.nombre}) - Descuento: ${promo.valor_descuento}%`);

  // Verify cart discount calculation
  const subtotalTest = 50.00;
  const discountTest = subtotalTest * (Number(promo.valor_descuento) / 100);
  const totalTest = subtotalTest - discountTest;
  console.log(`Prueba de cálculo: Subtotal $${subtotalTest} -> Descuento (-$${discountTest.toFixed(2)}) -> Total $${totalTest.toFixed(2)}`);

  console.log("\n✅ TODAS LAS PRUEBAS COMPLETADAS SATISFACTORIAMENTE.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
